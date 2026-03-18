/**
 * Newsletter Product Mention Extractor — OpenAI-based
 *
 * Uses GPT-4o-mini to extract product mentions and sponsor sections from
 * newsletter HTML or plain text. Handles HTML stripping, sponsor marker
 * detection, affiliate link patterns, and structured LLM output.
 *
 * Exported API:
 *   setOpenAIClient()          — inject client for testing
 *   stripHtml()                — strip HTML tags to plain text
 *   extractProducts()          — main async extraction
 *   normalizeProducts()        — normalize raw OpenAI product list
 *   normalizeSponsorSections() — normalize raw OpenAI sponsor list
 *   buildSponsorAnalysis()     — derive SponsorAnalysis from ExtractionResult
 *   computeTrends()            — compute rising/stable/falling trends across issues
 */

import OpenAI from "openai";
import type {
  ProductMention,
  ProductCategory,
  RecommendationStrength,
  SponsorSection,
  ExtractionResult,
  OpenAINewsletterResponse,
  SponsorAnalysis,
  TrendReport,
  ProductTrend,
  AestheticTags,
} from "./types.js";

// ============================================================================
// CLIENT INJECTION
// ============================================================================

let _openAIClient: OpenAI | null = null;

/**
 * Inject a custom OpenAI client. Useful for testing (mock injection).
 */
export function setOpenAIClient(client: OpenAI): void {
  _openAIClient = client;
}

function getOpenAIClient(): OpenAI {
  if (_openAIClient) return _openAIClient;
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is not set. " +
      "Set it to use the extraction tools."
    );
  }
  _openAIClient = new OpenAI({ apiKey });
  return _openAIClient;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const OPENAI_MODEL = "gpt-4o-mini";
const INPUT_COST_PER_1K = 0.000_150;   // $0.15 / 1M tokens
const OUTPUT_COST_PER_1K = 0.000_600;  // $0.60 / 1M tokens

const VALID_CATEGORIES = new Set<ProductCategory>([
  "saas", "physical_goods", "course", "supplement",
  "book", "service", "media", "other",
]);

const VALID_STRENGTHS = new Set<RecommendationStrength>([
  "strong", "endorsed", "mentioned", "organic",
]);

const VALID_WARMTH = new Set(["warm", "cool", "neutral"]);
const VALID_DENSITY = new Set(["minimal", "maximal", "balanced"]);
const VALID_ORIGIN = new Set(["natural", "synthetic", "mixed"]);
const VALID_TRADITION = new Set(["traditional", "contemporary", "hybrid"]);

const STRENGTH_RANK: Record<RecommendationStrength, number> = {
  strong: 3, endorsed: 2, mentioned: 1, organic: 0,
};

// ============================================================================
// HTML UTILITIES
// ============================================================================

/**
 * Strip HTML tags from content, normalizing whitespace.
 * Preserves readable structure for LLM analysis.
 */
export function stripHtml(html: string): string {
  // Replace block-level tags with newlines to preserve paragraph structure
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|li|tr|blockquote|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")           // Remove remaining tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")         // Remove other HTML entities
    .replace(/<[a-zA-Z][^>]*>/g, " ")   // Remove markup reconstructed from entity decoding (security)
    .replace(/\n{3,}/g, "\n\n")         // Collapse excess blank lines
    .replace(/[ \t]+/g, " ")            // Collapse horizontal whitespace
    .trim();

  return text;
}

/**
 * Detect if the input looks like HTML (has tags).
 */
export function isHtml(content: string): boolean {
  return /<[a-zA-Z][^>]*>/.test(content);
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const EXTRACTION_SYSTEM_PROMPT = `You are a product and brand intelligence extractor specialized in newsletters (Substack, Ghost, Beehiiv, email HTML).

Extract all product, brand, and service mentions from the provided newsletter content.

For each product/brand mention:
- name: Exact product or brand name (string)
- category: One of exactly: saas, physical_goods, course, supplement, book, service, media, other
- mention_context: Exact sentence or phrase containing the mention (max 100 chars)
- recommendation_strength: "strong" (must-have/buy now), "endorsed" (I use and recommend), "mentioned" (neutral reference), "organic" (naturally mentioned without sales intent)
- affiliate_link: Any affiliate or referral URL (containing utm_source, /ref/, /go/, promo codes), or null
- confidence: 0.0-1.0 — how confident this is a genuine product/brand mention
- is_sponsored: true if this product appears within a sponsored/paid section

Sponsor markers to detect:
- "sponsored by", "this issue is brought to you by", "partner", "ad:", "presented by"
- Affiliate link patterns: utm_source, /ref/, /go/, /affiliate/, promo codes, discount codes

Also identify sponsor sections:
- sponsor_name: Sponsor's brand name
- section_context: Opening phrase of the sponsor block (max 75 chars)
- estimated_cpm_usd: Estimated CPM value in USD (typical newsletter CPMs: $20-$80)
- estimated_read_through: 0.0-1.0 (0=skippable ad, 1=highly engaging native content)
- call_to_action: URL, promo code, or CTA text, or null
- sponsor_fit_score: 0.0-1.0 — how well the sponsor fits the newsletter's apparent audience

For each product, also classify aesthetic character:
- aesthetic_warmth: "warm" (cozy, earthy, comfort-focused), "cool" (clean, clinical, tech-forward), or "neutral"
- aesthetic_density: "minimal" (simple, essential, pared back), "maximal" (rich, complex, indulgent), or "balanced"
- aesthetic_origin: "natural" (organic, artisan, plant-based), "synthetic" (engineered, tech, processed), or "mixed"
- aesthetic_tradition: "traditional" (heritage, classic, time-tested), "contemporary" (trending, innovative, modern), or "hybrid"

Rules:
- Only include products with confidence >= 0.4
- Deduplicate the same product (merge repeated mentions, use highest confidence)
- Focus on things readers might actually buy or use
- Mark is_sponsored=true for any product appearing in a detected sponsor section

Return ONLY valid JSON (no markdown, no explanation):
{"products":[...],"sponsor_sections":[...]}`;

// ============================================================================
// NORMALIZE HELPERS
// ============================================================================

/**
 * Normalize raw OpenAI product array into typed ProductMention[].
 * Deduplicates by name (case-insensitive), clamps confidence, falls back
 * to "other" / "mentioned" for invalid enum values.
 */
export function normalizeProducts(
  raw: OpenAINewsletterResponse["products"],
): ProductMention[] {
  const productMap = new Map<string, ProductMention>();

  for (const p of raw) {
    const name = (p.name ?? "").trim();
    if (!name) continue;

    const key = name.toLowerCase();

    const category: ProductCategory = VALID_CATEGORIES.has(p.category as ProductCategory)
      ? (p.category as ProductCategory)
      : "other";

    const strength: RecommendationStrength = VALID_STRENGTHS.has(
      p.recommendation_strength as RecommendationStrength
    )
      ? (p.recommendation_strength as RecommendationStrength)
      : "mentioned";

    const confidence = Math.min(Math.max(Number(p.confidence) || 0, 0), 1);

    const existing = productMap.get(key);
    if (existing) {
      // Merge: keep highest confidence, best strength, first affiliate link
      if (confidence > existing.confidence) {
        existing.confidence = confidence;
      }
      if (STRENGTH_RANK[strength] > STRENGTH_RANK[existing.recommendation_strength]) {
        existing.recommendation_strength = strength;
      }
      if (!existing.affiliate_link && p.affiliate_link) {
        existing.affiliate_link = p.affiliate_link;
      }
      // If any occurrence is sponsored, mark the merged entry as sponsored
      if (p.is_sponsored) {
        existing.is_sponsored = true;
      }
    } else {
      const entry: ProductMention = {
        name,
        category,
        mention_context: (p.mention_context ?? "").slice(0, 100),
        recommendation_strength: strength,
        affiliate_link: p.affiliate_link ?? null,
        confidence,
        is_sponsored: Boolean(p.is_sponsored),
      };

      const tags = parseAestheticTags(p);
      if (tags) entry.aestheticTags = tags;

      productMap.set(key, entry);
    }
  }

  return [...productMap.values()].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Parse and validate aesthetic tag fields from a raw OpenAI product entry.
 * Returns undefined if no valid tags present.
 */
function parseAestheticTags(p: OpenAINewsletterResponse["products"][number]): AestheticTags | undefined {
  const warmth = VALID_WARMTH.has(p.aesthetic_warmth ?? "") ? p.aesthetic_warmth as AestheticTags["warmth"] : null;
  const density = VALID_DENSITY.has(p.aesthetic_density ?? "") ? p.aesthetic_density as AestheticTags["density"] : null;
  const origin = VALID_ORIGIN.has(p.aesthetic_origin ?? "") ? p.aesthetic_origin as AestheticTags["origin"] : null;
  const tradition = VALID_TRADITION.has(p.aesthetic_tradition ?? "") ? p.aesthetic_tradition as AestheticTags["tradition"] : null;

  if (!warmth && !density && !origin && !tradition) return undefined;

  return {
    warmth: warmth ?? "neutral",
    density: density ?? "balanced",
    origin: origin ?? "mixed",
    tradition: tradition ?? "hybrid",
  };
}

/**
 * Normalize raw OpenAI sponsor section array into typed SponsorSection[].
 * Filters empty names, clamps numeric fields.
 */
export function normalizeSponsorSections(
  raw: OpenAINewsletterResponse["sponsor_sections"],
): SponsorSection[] {
  return raw
    .filter(s => (s.sponsor_name ?? "").trim() !== "")
    .map(s => ({
      sponsor_name: s.sponsor_name.trim(),
      section_context: (s.section_context ?? "").slice(0, 75),
      estimated_cpm_usd: Math.max(Number(s.estimated_cpm_usd) || 0, 0),
      estimated_read_through: Math.min(
        Math.max(Number(s.estimated_read_through) || 0, 0),
        1,
      ),
      call_to_action: s.call_to_action ?? null,
      sponsor_fit_score: Math.min(
        Math.max(Number(s.sponsor_fit_score) || 0, 0),
        1,
      ),
    }));
}

// ============================================================================
// MAIN EXTRACTION
// ============================================================================

export interface ExtractProductsParams {
  content: string;             // HTML or plain text newsletter content
  newsletterId: string;
  categoryFilter?: string[] | null;
}

export interface RawExtractionResult {
  newsletter_id: string;
  products: ProductMention[];
  sponsor_sections: SponsorSection[];
  ai_cost_usd: number;
}

/**
 * Extract products and sponsor sections from newsletter content using OpenAI.
 * Handles HTML stripping automatically.
 * Returns a raw result (no _meta) — server.ts adds _meta after timing.
 * On OpenAI failure, returns empty arrays with error captured for _meta.
 */
export async function extractProducts(
  params: ExtractProductsParams,
): Promise<RawExtractionResult & { error?: string }> {
  const { content, newsletterId, categoryFilter } = params;

  // Strip HTML if needed, keeping structure
  const text = isHtml(content) ? stripHtml(content) : content.trim();

  let client: OpenAI;
  try {
    client = getOpenAIClient();
  } catch (err) {
    return {
      newsletter_id: newsletterId,
      products: [],
      sponsor_sections: [],
      ai_cost_usd: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Build user message
  let userMessage = `Extract products and sponsor sections from this newsletter content:\n\n${text}`;
  if (categoryFilter && categoryFilter.length > 0) {
    // Sanitize category names to prevent prompt injection (OWASP MCP audit 2026-03-10)
    const safeCategories = categoryFilter
      .map((c) => c.replace(/[^\w\s\-\/]/g, "").trim())
      .filter(Boolean);
    if (safeCategories.length > 0) {
      userMessage += `\n\nOnly include products in these categories: ${safeCategories.join(", ")}`;
    }
  }

  let response: Awaited<ReturnType<typeof client.chat.completions.create>>;
  try {
    response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 2000,
    });
  } catch (err) {
    // Graceful fallback — return empty result rather than crashing
    return {
      newsletter_id: newsletterId,
      products: [],
      sponsor_sections: [],
      ai_cost_usd: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Parse response
  const rawContent = response.choices[0]?.message?.content ?? "{}";
  let parsed: OpenAINewsletterResponse;

  try {
    parsed = JSON.parse(rawContent) as OpenAINewsletterResponse;
  } catch {
    parsed = { products: [], sponsor_sections: [] };
  }

  // Ensure arrays exist
  const rawProducts = Array.isArray(parsed.products) ? parsed.products : [];
  const rawSponsors = Array.isArray(parsed.sponsor_sections)
    ? parsed.sponsor_sections
    : [];

  // Normalize
  let products = normalizeProducts(rawProducts);
  const sponsor_sections = normalizeSponsorSections(rawSponsors);

  // Apply category filter after normalization if provided
  if (categoryFilter && categoryFilter.length > 0) {
    const filterSet = new Set(categoryFilter);
    products = products.filter(p => filterSet.has(p.category));
  }

  // Estimate cost from token usage
  const usage = response.usage;
  const ai_cost_usd = usage
    ? (usage.prompt_tokens / 1000) * INPUT_COST_PER_1K +
      (usage.completion_tokens / 1000) * OUTPUT_COST_PER_1K
    : 0;

  return {
    newsletter_id: newsletterId,
    products,
    sponsor_sections,
    ai_cost_usd,
  };
}

// ============================================================================
// SPONSOR ANALYSIS
// ============================================================================

/**
 * Build a sponsor analysis report from an existing extraction result.
 * No additional API calls — purely local computation.
 */
export function buildSponsorAnalysis(extraction: ExtractionResult): SponsorAnalysis {
  const sponsors = extraction.sponsor_sections;
  const sponsor_count = sponsors.length;

  const avg_read_through =
    sponsor_count > 0
      ? sponsors.reduce((sum, s) => sum + s.estimated_read_through, 0) / sponsor_count
      : 0;

  const avg_sponsor_fit_score =
    sponsor_count > 0
      ? sponsors.reduce((sum, s) => sum + s.sponsor_fit_score, 0) / sponsor_count
      : 0;

  const cta_rate =
    sponsor_count > 0
      ? sponsors.filter(s => s.call_to_action !== null).length / sponsor_count
      : 0;

  const estimated_total_cpm_usd = sponsors.reduce(
    (sum, s) => sum + s.estimated_cpm_usd,
    0,
  );

  return {
    sponsors,
    sponsor_count,
    avg_read_through: Math.round(avg_read_through * 100) / 100,
    avg_sponsor_fit_score: Math.round(avg_sponsor_fit_score * 100) / 100,
    cta_rate: Math.round(cta_rate * 100) / 100,
    estimated_total_cpm_usd: Math.round(estimated_total_cpm_usd * 100) / 100,
    _meta: {},
  };
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

/**
 * Extract brand from a product name using a simple first-word heuristic.
 * For single-word names, returns the name itself if it looks like a proper noun
 * or acronym (starts with uppercase), so that brands like "AG1", "Notion", "Beehiiv"
 * surface correctly in cross-issue brand rollups. Returns null for lowercase
 * single-word generics like "newsletter".
 */
function extractBrand(productName: string): string | null {
  const words = productName.trim().split(/\s+/);
  if (words.length === 0) return null;
  if (words.length === 1) {
    const word = words[0] ?? "";
    return /^[A-Z]/.test(word) ? word : null;
  }
  return words[0] ?? null;
}

/**
 * Compute rising / stable / falling product trends across multiple newsletter issues.
 *
 * Classification thresholds:
 *   - rising:  present in >60% of issues
 *   - falling: present in <30% of issues
 *   - stable:  30%–60%
 */
export function computeTrends(extractions: ExtractionResult[]): TrendReport {
  const newsletter_ids = extractions.map(e => e.newsletter_id);
  const totalIssues = extractions.length;

  if (totalIssues === 0) {
    return { trends: [], newsletter_ids: [], analysis_window_issues: 0 };
  }

  // Aggregate: product name → { issues_present, total_mentions, total_strength, category }
  const productMap = new Map<
    string,
    { issues_present: number; total_mentions: number; total_strength: number; category: ProductCategory }
  >();

  for (const extraction of extractions) {
    // Deduplicate within this issue to count issues_present correctly
    const seenInIssue = new Set<string>();

    for (const product of extraction.products) {
      const key = product.name.toLowerCase();
      const strengthScore = STRENGTH_RANK[product.recommendation_strength] ?? 1;

      if (!seenInIssue.has(key)) {
        seenInIssue.add(key);
        const existing = productMap.get(key);
        if (existing) {
          existing.issues_present += 1;
          existing.total_mentions += 1;
          existing.total_strength += strengthScore;
        } else {
          productMap.set(key, {
            issues_present: 1,
            total_mentions: 1,
            total_strength: strengthScore,
            category: product.category,
          });
        }
      } else {
        // Already counted this issue — just increment total_mentions
        const existing = productMap.get(key);
        if (existing) {
          existing.total_mentions += 1;
        }
      }
    }
  }

  const trends: ProductTrend[] = [];

  for (const [name, data] of productMap.entries()) {
    const presenceRate = data.issues_present / totalIssues;
    let trend: ProductTrend["trend"];

    if (presenceRate > 0.6) {
      trend = "rising";
    } else if (presenceRate < 0.3) {
      trend = "falling";
    } else {
      trend = "stable";
    }

    // Use original casing from first occurrence
    const originalName =
      extractions
        .flatMap(e => e.products)
        .find(p => p.name.toLowerCase() === name)?.name ?? name;

    trends.push({
      name: originalName,
      brand: extractBrand(originalName),
      category: data.category,
      trend,
      issues_present: data.issues_present,
      total_mentions: data.total_mentions,
      avg_recommendation_strength:
        data.issues_present > 0
          ? Math.round((data.total_strength / data.issues_present) * 100) / 100
          : 0,
    });
  }

  // Sort: rising first, then by issues_present desc
  trends.sort((a, b) => {
    const trendOrder = { rising: 0, stable: 1, falling: 2 };
    const orderDiff = trendOrder[a.trend] - trendOrder[b.trend];
    if (orderDiff !== 0) return orderDiff;
    return b.issues_present - a.issues_present;
  });

  // top_category: category with the most trending products — routing signal
  const categoryCount = new Map<ProductCategory, number>();
  for (const t of trends) {
    categoryCount.set(t.category, (categoryCount.get(t.category) ?? 0) + 1);
  }
  const topEntry = [...categoryCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const top_category = topEntry ? topEntry[0] : undefined;

  return {
    trends,
    newsletter_ids,
    analysis_window_issues: totalIssues,
    ...(top_category !== undefined ? { top_category } : {}),
  };
}

/**
 * Newsletter Commerce Intelligence MCP — Core Types
 *
 * Single source of truth for all types shared across cache, extractor, and server.
 */

// ============================================================================
// ENUMS / UNION TYPES
// ============================================================================

export type ProductCategory =
  | "saas"
  | "physical_goods"
  | "course"
  | "supplement"
  | "book"
  | "service"
  | "media"
  | "other";

export type RecommendationStrength = "strong" | "endorsed" | "mentioned" | "organic";

export interface AestheticTags {
  warmth: "warm" | "cool" | "neutral";
  density: "minimal" | "maximal" | "balanced";
  origin: "natural" | "synthetic" | "mixed";
  tradition: "traditional" | "contemporary" | "hybrid";
}

export type PaymentMethod = "disabled" | "api_key" | "free_tier";

// ============================================================================
// CORE ENTITIES
// ============================================================================

export interface ProductMention {
  name: string;
  category: ProductCategory;
  mention_context: string;
  recommendation_strength: RecommendationStrength;
  affiliate_link: string | null;
  confidence: number;
  is_sponsored: boolean;
  aestheticTags?: AestheticTags;
}

export interface SponsorSection {
  sponsor_name: string;
  section_context: string;
  estimated_cpm_usd: number;
  estimated_read_through: number;
  call_to_action: string | null;
  sponsor_fit_score: number;
}

// ============================================================================
// EXTRACTION RESULTS
// ============================================================================

export interface ExtractionMeta {
  processing_time_ms: number;
  ai_cost_usd: number;
  cache_hit: boolean;
  [key: string]: unknown;
}

export interface ExtractionResult {
  newsletter_id: string;
  products: ProductMention[];
  sponsor_sections: SponsorSection[];
  _meta: ExtractionMeta;
}

// ============================================================================
// SPONSOR ANALYSIS
// ============================================================================

export interface SponsorAnalysis {
  sponsors: SponsorSection[];
  sponsor_count: number;
  avg_read_through: number;
  /** Average sponsor-audience fit score across all sponsor sections (0–1). Higher = better audience match. */
  avg_sponsor_fit_score: number;
  /** Fraction of sponsor sections with a trackable CTA (promo code, URL). 0 = no CTAs, 1 = all have CTAs. Gate: cta_rate > 0 means CTA extraction is worth running. */
  cta_rate: number;
  estimated_total_cpm_usd: number;
  _meta: Record<string, unknown>;
}

// ============================================================================
// TREND REPORT
// ============================================================================

export interface ProductTrend {
  name: string;
  /** Brand extracted from product name (e.g. "Notion", "Beehiiv"). Null when name is generic. Use for brand-level filtering and affiliate network queries. */
  brand: string | null;
  category: ProductCategory;
  trend: "rising" | "stable" | "falling";
  issues_present: number;
  total_mentions: number;
  /** Average recommendation strength score (0–3: strong=3, endorsed=2, mentioned=1, organic=0) */
  avg_recommendation_strength: number;
}

export interface TrendReport {
  trends: ProductTrend[];
  newsletter_ids: string[];
  analysis_window_issues: number;
  /** Category with the most trending products — routing signal for affiliate network selection */
  top_category?: ProductCategory;
  _meta?: Record<string, unknown>;
}

// ============================================================================
// OPENAI RAW RESPONSE SHAPES
// ============================================================================

export interface OpenAINewsletterResponse {
  products: Array<{
    name: string;
    category: string;
    mention_context: string;
    recommendation_strength: string;
    affiliate_link: string | null;
    confidence: number;
    is_sponsored: boolean;
    aesthetic_warmth?: string;
    aesthetic_density?: string;
    aesthetic_origin?: string;
    aesthetic_tradition?: string;
  }>;
  sponsor_sections: Array<{
    sponsor_name: string;
    section_context: string;
    estimated_cpm_usd: number;
    estimated_read_through: number;
    call_to_action: string | null;
    sponsor_fit_score: number;
  }>;
}

// ============================================================================
// AUTH
// ============================================================================

export interface AuthResult {
  authorized: boolean;
  method?: PaymentMethod;
  reason?: string;
}

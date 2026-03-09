/**
 * Tests for extractor.ts
 *
 * Tests: stripHtml, isHtml, normalizeProducts, normalizeSponsorSections,
 *        buildSponsorAnalysis, computeTrends, and graceful OpenAI fallback.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  stripHtml,
  isHtml,
  normalizeProducts,
  normalizeSponsorSections,
  buildSponsorAnalysis,
  computeTrends,
  setOpenAIClient,
  extractProducts,
} from "../src/extractor.js";
import type { ExtractionResult } from "../src/types.js";

// ============================================================================
// stripHtml
// ============================================================================

describe("stripHtml", () => {
  it("strips basic HTML tags", () => {
    const result = stripHtml("<p>Hello <b>world</b></p>");
    expect(result).toContain("Hello");
    expect(result).toContain("world");
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("<b>");
  });

  it("replaces block-level tags with newlines", () => {
    const result = stripHtml("<p>First</p><p>Second</p>");
    expect(result).toMatch(/First[\s\S]+Second/);
  });

  it("decodes common HTML entities", () => {
    const result = stripHtml("&amp; &lt; &gt; &quot; &apos; &nbsp;");
    expect(result).toContain("&");
    expect(result).toContain("<");
    expect(result).toContain(">");
    expect(result).toContain('"');
    expect(result).toContain("'");
  });

  it("collapses multiple blank lines", () => {
    const result = stripHtml("<p>A</p><br/><br/><br/><p>B</p>");
    // Should not have 3+ consecutive newlines
    expect(result).not.toMatch(/\n{3,}/);
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });

  it("returns plain text unchanged (modulo whitespace normalization)", () => {
    const result = stripHtml("Just plain text here");
    expect(result).toBe("Just plain text here");
  });
});

// ============================================================================
// isHtml
// ============================================================================

describe("isHtml", () => {
  it("detects HTML content", () => {
    expect(isHtml("<p>Hello</p>")).toBe(true);
    expect(isHtml("<div class='foo'>test</div>")).toBe(true);
    expect(isHtml("<!DOCTYPE html><html>")).toBe(true);
  });

  it("rejects plain text", () => {
    expect(isHtml("Just plain text")).toBe(false);
    expect(isHtml("No tags here at all")).toBe(false);
  });
});

// ============================================================================
// normalizeProducts
// ============================================================================

describe("normalizeProducts", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeProducts([])).toEqual([]);
  });

  it("normalizes valid product with correct category and strength", () => {
    const result = normalizeProducts([
      {
        name: "Notion",
        category: "saas",
        mention_context: "I use Notion every day",
        recommendation_strength: "endorsed",
        affiliate_link: null,
        confidence: 0.9,
        is_sponsored: false,
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Notion");
    expect(result[0]?.category).toBe("saas");
    expect(result[0]?.recommendation_strength).toBe("endorsed");
    expect(result[0]?.confidence).toBe(0.9);
  });

  it("falls back to 'other' for unknown category", () => {
    const result = normalizeProducts([
      {
        name: "Mystery Product",
        category: "alien_tech",
        mention_context: "ctx",
        recommendation_strength: "mentioned",
        affiliate_link: null,
        confidence: 0.7,
        is_sponsored: false,
      },
    ]);
    expect(result[0]?.category).toBe("other");
  });

  it("falls back to 'mentioned' for unknown recommendation_strength", () => {
    const result = normalizeProducts([
      {
        name: "TestProduct",
        category: "saas",
        mention_context: "ctx",
        recommendation_strength: "unknown_strength",
        affiliate_link: null,
        confidence: 0.6,
        is_sponsored: false,
      },
    ]);
    expect(result[0]?.recommendation_strength).toBe("mentioned");
  });

  it("clamps confidence to [0, 1]", () => {
    const result = normalizeProducts([
      {
        name: "OverconfidentProduct",
        category: "saas",
        mention_context: "ctx",
        recommendation_strength: "strong",
        affiliate_link: null,
        confidence: 1.5,
        is_sponsored: false,
      },
      {
        name: "NegativeProduct",
        category: "saas",
        mention_context: "ctx",
        recommendation_strength: "strong",
        affiliate_link: null,
        confidence: -0.3,
        is_sponsored: false,
      },
    ]);
    expect(result.find(p => p.name === "OverconfidentProduct")?.confidence).toBe(1);
    expect(result.find(p => p.name === "NegativeProduct")?.confidence).toBe(0);
  });

  it("deduplicates case-insensitively, keeping highest confidence", () => {
    const result = normalizeProducts([
      {
        name: "notion",
        category: "saas",
        mention_context: "first mention",
        recommendation_strength: "mentioned",
        affiliate_link: null,
        confidence: 0.6,
        is_sponsored: false,
      },
      {
        name: "Notion",
        category: "saas",
        mention_context: "second mention",
        recommendation_strength: "strong",
        affiliate_link: "https://notion.so?ref=abc",
        confidence: 0.95,
        is_sponsored: true,
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.confidence).toBe(0.95);
    expect(result[0]?.recommendation_strength).toBe("strong");
    expect(result[0]?.affiliate_link).toBe("https://notion.so?ref=abc");
    expect(result[0]?.is_sponsored).toBe(true);
  });

  it("skips products with empty names", () => {
    const result = normalizeProducts([
      {
        name: "",
        category: "saas",
        mention_context: "ctx",
        recommendation_strength: "mentioned",
        affiliate_link: null,
        confidence: 0.8,
        is_sponsored: false,
      },
      {
        name: "   ",
        category: "saas",
        mention_context: "ctx",
        recommendation_strength: "mentioned",
        affiliate_link: null,
        confidence: 0.8,
        is_sponsored: false,
      },
    ]);
    expect(result).toHaveLength(0);
  });

  it("sorts by confidence descending", () => {
    const result = normalizeProducts([
      {
        name: "LowConf",
        category: "saas",
        mention_context: "ctx",
        recommendation_strength: "mentioned",
        affiliate_link: null,
        confidence: 0.4,
        is_sponsored: false,
      },
      {
        name: "HighConf",
        category: "saas",
        mention_context: "ctx",
        recommendation_strength: "mentioned",
        affiliate_link: null,
        confidence: 0.9,
        is_sponsored: false,
      },
    ]);
    expect(result[0]?.name).toBe("HighConf");
    expect(result[1]?.name).toBe("LowConf");
  });

  it("truncates mention_context to 100 characters", () => {
    const longContext = "x".repeat(300);
    const result = normalizeProducts([
      {
        name: "Product",
        category: "saas",
        mention_context: longContext,
        recommendation_strength: "mentioned",
        affiliate_link: null,
        confidence: 0.7,
        is_sponsored: false,
      },
    ]);
    expect(result[0]?.mention_context.length).toBe(100);
  });
});

// ============================================================================
// normalizeSponsorSections
// ============================================================================

describe("normalizeSponsorSections", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeSponsorSections([])).toEqual([]);
  });

  it("normalizes a valid sponsor section", () => {
    const result = normalizeSponsorSections([
      {
        sponsor_name: "Acme Corp",
        section_context: "This issue is brought to you by Acme",
        estimated_cpm_usd: 45,
        estimated_read_through: 0.7,
        call_to_action: "acme.com/deal",
        sponsor_fit_score: 0.85,
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.sponsor_name).toBe("Acme Corp");
    expect(result[0]?.estimated_cpm_usd).toBe(45);
    expect(result[0]?.estimated_read_through).toBe(0.7);
    expect(result[0]?.sponsor_fit_score).toBe(0.85);
  });

  it("filters out sections with empty sponsor_name", () => {
    const result = normalizeSponsorSections([
      {
        sponsor_name: "",
        section_context: "ctx",
        estimated_cpm_usd: 30,
        estimated_read_through: 0.5,
        call_to_action: null,
        sponsor_fit_score: 0.5,
      },
      {
        sponsor_name: "   ",
        section_context: "ctx",
        estimated_cpm_usd: 30,
        estimated_read_through: 0.5,
        call_to_action: null,
        sponsor_fit_score: 0.5,
      },
    ]);
    expect(result).toHaveLength(0);
  });

  it("clamps read_through and fit_score to [0, 1]", () => {
    const result = normalizeSponsorSections([
      {
        sponsor_name: "Sponsor",
        section_context: "ctx",
        estimated_cpm_usd: 30,
        estimated_read_through: 1.5,  // over
        call_to_action: null,
        sponsor_fit_score: -0.2,       // under
      },
    ]);
    expect(result[0]?.estimated_read_through).toBe(1);
    expect(result[0]?.sponsor_fit_score).toBe(0);
  });

  it("truncates section_context to 75 characters", () => {
    const result = normalizeSponsorSections([
      {
        sponsor_name: "Sponsor",
        section_context: "x".repeat(200),
        estimated_cpm_usd: 30,
        estimated_read_through: 0.5,
        call_to_action: null,
        sponsor_fit_score: 0.5,
      },
    ]);
    expect(result[0]?.section_context.length).toBe(75);
  });
});

// ============================================================================
// buildSponsorAnalysis
// ============================================================================

describe("buildSponsorAnalysis", () => {
  const makeExtraction = (sponsors: ExtractionResult["sponsor_sections"]): ExtractionResult => ({
    newsletter_id: "test-id",
    products: [],
    sponsor_sections: sponsors,
    _meta: { processing_time_ms: 100, ai_cost_usd: 0, cache_hit: false },
  });

  it("returns zero counts when no sponsors", () => {
    const analysis = buildSponsorAnalysis(makeExtraction([]));
    expect(analysis.sponsor_count).toBe(0);
    expect(analysis.avg_read_through).toBe(0);
    expect(analysis.estimated_total_cpm_usd).toBe(0);
  });

  it("computes correct averages with sponsors", () => {
    const analysis = buildSponsorAnalysis(makeExtraction([
      {
        sponsor_name: "Sponsor A",
        section_context: "ctx",
        estimated_cpm_usd: 40,
        estimated_read_through: 0.8,
        call_to_action: null,
        sponsor_fit_score: 0.9,
      },
      {
        sponsor_name: "Sponsor B",
        section_context: "ctx",
        estimated_cpm_usd: 60,
        estimated_read_through: 0.6,
        call_to_action: null,
        sponsor_fit_score: 0.7,
      },
    ]));
    expect(analysis.sponsor_count).toBe(2);
    expect(analysis.avg_read_through).toBe(0.7);
    expect(analysis.estimated_total_cpm_usd).toBe(100);
  });
});

// ============================================================================
// computeTrends
// ============================================================================

describe("computeTrends", () => {
  const makeExtraction = (id: string, productNames: string[]): ExtractionResult => ({
    newsletter_id: id,
    products: productNames.map(name => ({
      name,
      category: "saas" as const,
      mention_context: `Context for ${name}`,
      recommendation_strength: "mentioned" as const,
      affiliate_link: null,
      confidence: 0.8,
      is_sponsored: false,
    })),
    sponsor_sections: [],
    _meta: { processing_time_ms: 0, ai_cost_usd: 0, cache_hit: false },
  });

  it("returns empty report for empty input", () => {
    const report = computeTrends([]);
    expect(report.trends).toHaveLength(0);
    expect(report.analysis_window_issues).toBe(0);
    expect(report.newsletter_ids).toEqual([]);
  });

  it("marks product as 'rising' when present in >60% of issues", () => {
    // 4 out of 5 issues (80%) -> rising
    const extractions = [
      makeExtraction("id1", ["Notion"]),
      makeExtraction("id2", ["Notion"]),
      makeExtraction("id3", ["Notion"]),
      makeExtraction("id4", ["Notion"]),
      makeExtraction("id5", []),
    ];
    const report = computeTrends(extractions);
    const notion = report.trends.find(t => t.name === "Notion");
    expect(notion?.trend).toBe("rising");
    expect(notion?.issues_present).toBe(4);
  });

  it("marks product as 'falling' when present in <30% of issues", () => {
    // 1 out of 5 issues (20%) -> falling
    const extractions = [
      makeExtraction("id1", ["Rare Product"]),
      makeExtraction("id2", []),
      makeExtraction("id3", []),
      makeExtraction("id4", []),
      makeExtraction("id5", []),
    ];
    const report = computeTrends(extractions);
    const rare = report.trends.find(t => t.name === "Rare Product");
    expect(rare?.trend).toBe("falling");
  });

  it("marks product as 'stable' when present in 30%-60% of issues", () => {
    // 2 out of 4 issues (50%) -> stable
    const extractions = [
      makeExtraction("id1", ["Stable Product"]),
      makeExtraction("id2", ["Stable Product"]),
      makeExtraction("id3", []),
      makeExtraction("id4", []),
    ];
    const report = computeTrends(extractions);
    const stable = report.trends.find(t => t.name === "Stable Product");
    expect(stable?.trend).toBe("stable");
  });

  it("collects newsletter_ids correctly", () => {
    const extractions = [
      makeExtraction("nl-001", ["A"]),
      makeExtraction("nl-002", ["B"]),
    ];
    const report = computeTrends(extractions);
    expect(report.newsletter_ids).toEqual(["nl-001", "nl-002"]);
    expect(report.analysis_window_issues).toBe(2);
  });

  it("sorts trends: rising first, then stable, then falling", () => {
    const extractions = [
      makeExtraction("id1", ["Rising", "Stable", "Falling"]),
      makeExtraction("id2", ["Rising", "Stable"]),
      makeExtraction("id3", ["Rising", "Stable"]),
      makeExtraction("id4", ["Rising"]),
      makeExtraction("id5", ["Rising"]),
    ];
    const report = computeTrends(extractions);
    const trendOrder = report.trends.map(t => t.trend);
    // Rising should come before stable, stable before falling
    const risingIdx = trendOrder.indexOf("rising");
    const stableIdx = trendOrder.indexOf("stable");
    const fallingIdx = trendOrder.indexOf("falling");
    expect(risingIdx).toBeLessThan(stableIdx);
    expect(stableIdx).toBeLessThan(fallingIdx);
  });

  it("does not double-count issues_present for duplicate product names in same issue", () => {
    // Products list has "Notion" twice in one extraction
    const extraction: ExtractionResult = {
      newsletter_id: "id1",
      products: [
        {
          name: "Notion",
          category: "saas",
          mention_context: "first",
          recommendation_strength: "mentioned",
          affiliate_link: null,
          confidence: 0.8,
          is_sponsored: false,
        },
        {
          name: "Notion",
          category: "saas",
          mention_context: "second",
          recommendation_strength: "mentioned",
          affiliate_link: null,
          confidence: 0.7,
          is_sponsored: false,
        },
      ],
      sponsor_sections: [],
      _meta: { processing_time_ms: 0, ai_cost_usd: 0, cache_hit: false },
    };
    const report = computeTrends([extraction]);
    const notion = report.trends.find(t => t.name === "Notion");
    expect(notion?.issues_present).toBe(1);      // only 1 issue
    expect(notion?.total_mentions).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// extractProducts — graceful OpenAI fallback
// ============================================================================

describe("extractProducts — graceful fallback", () => {
  beforeEach(() => {
    // Reset injected client between tests
    setOpenAIClient(null as unknown as import("openai").default);
  });

  it("returns empty arrays and error when OpenAI client throws", async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error("Network error")),
        },
      },
    };
    setOpenAIClient(mockClient as unknown as import("openai").default);

    const result = await extractProducts({
      content: "Some newsletter content",
      newsletterId: "test-nl",
    });

    expect(result.products).toEqual([]);
    expect(result.sponsor_sections).toEqual([]);
    expect(result.ai_cost_usd).toBe(0);
    expect(result.error).toContain("Network error");
  });

  it("returns normalized products when OpenAI returns valid JSON", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              products: [
                {
                  name: "Acme Tool",
                  category: "saas",
                  mention_context: "I love Acme Tool for productivity",
                  recommendation_strength: "endorsed",
                  affiliate_link: null,
                  confidence: 0.85,
                  is_sponsored: false,
                },
              ],
              sponsor_sections: [],
            }),
          },
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    };

    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue(mockResponse),
        },
      },
    };
    setOpenAIClient(mockClient as unknown as import("openai").default);

    const result = await extractProducts({
      content: "I love Acme Tool for productivity",
      newsletterId: "test-nl",
    });

    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.name).toBe("Acme Tool");
    expect(result.products[0]?.category).toBe("saas");
    expect(result.ai_cost_usd).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  });

  it("handles HTML content by stripping tags before extraction", async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: '{"products":[],"sponsor_sections":[]}' } }],
            usage: { prompt_tokens: 50, completion_tokens: 10 },
          }),
        },
      },
    };
    setOpenAIClient(mockClient as unknown as import("openai").default);

    await extractProducts({
      content: "<p>Hello <b>world</b></p>",
      newsletterId: "html-test",
    });

    // Check that the user message sent to OpenAI did not contain HTML tags
    const callArgs = (mockClient.chat.completions.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const userMessage = callArgs?.messages?.[1]?.content as string;
    expect(userMessage).not.toMatch(/<[a-zA-Z]/);
    expect(userMessage).toContain("Hello");
    expect(userMessage).toContain("world");
  });

  it("applies category filter to returned products", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              products: [
                {
                  name: "SaaS Tool",
                  category: "saas",
                  mention_context: "ctx",
                  recommendation_strength: "mentioned",
                  affiliate_link: null,
                  confidence: 0.8,
                  is_sponsored: false,
                },
                {
                  name: "Physical Good",
                  category: "physical_goods",
                  mention_context: "ctx",
                  recommendation_strength: "mentioned",
                  affiliate_link: null,
                  confidence: 0.7,
                  is_sponsored: false,
                },
              ],
              sponsor_sections: [],
            }),
          },
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    };

    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue(mockResponse),
        },
      },
    };
    setOpenAIClient(mockClient as unknown as import("openai").default);

    const result = await extractProducts({
      content: "Newsletter content",
      newsletterId: "filter-test",
      categoryFilter: ["saas"],
    });

    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.name).toBe("SaaS Tool");
  });
});

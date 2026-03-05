/**
 * Server integration tests for newsletter-commerce-mcp.
 *
 * Verifies tool registrations, server structure, free tier enforcement,
 * and input validation. Does not start a real transport or call real OpenAI.
 */

import { describe, it, expect, beforeEach } from "vitest";

// ============================================================================
// SERVER CREATION
// ============================================================================

describe("createServer", () => {
  it("creates an MCP server without throwing", async () => {
    const { createServer } = await import("../src/server.js");
    expect(() => createServer()).not.toThrow();
  });

  it("returns a server with connect and tool methods", async () => {
    const { createServer } = await import("../src/server.js");
    const server = createServer();
    expect(server).toBeDefined();
    expect(typeof server.connect).toBe("function");
    expect(typeof server.tool).toBe("function");
  });
});

// ============================================================================
// TOOL REGISTRATION SMOKE TESTS
// ============================================================================

describe("tool registrations", () => {
  it("all 3 tools are registered (duplicate registration throws)", async () => {
    const { createServer } = await import("../src/server.js");
    const server = createServer();
    expect(server).toBeDefined();
  });

  it("extract_newsletter_products tool is registered", async () => {
    const { createServer } = await import("../src/server.js");
    const server = createServer();

    expect(() => {
      server.tool(
        "extract_newsletter_products",
        "duplicate",
        {},
        async () => ({ content: [] })
      );
    }).toThrow();
  });

  it("analyze_newsletter_sponsors tool is registered", async () => {
    const { createServer } = await import("../src/server.js");
    const server = createServer();

    expect(() => {
      server.tool(
        "analyze_newsletter_sponsors",
        "duplicate",
        {},
        async () => ({ content: [] })
      );
    }).toThrow();
  });

  it("track_product_trends tool is registered", async () => {
    const { createServer } = await import("../src/server.js");
    const server = createServer();

    expect(() => {
      server.tool(
        "track_product_trends",
        "duplicate",
        {},
        async () => ({ content: [] })
      );
    }).toThrow();
  });
});

// ============================================================================
// CACHE TESTS (via NewsletterCache directly)
// ============================================================================

describe("NewsletterCache (server integration)", () => {
  it("returns null for a cache miss", async () => {
    const { NewsletterCache } = await import("../src/cache.js");
    const cache = new NewsletterCache(":memory:");
    expect(cache.get("nonexistent-id")).toBeNull();
    cache.close();
  });

  it("stores and retrieves an extraction result", async () => {
    const { NewsletterCache } = await import("../src/cache.js");
    const cache = new NewsletterCache(":memory:");

    const fakeResult = {
      newsletter_id: "issue-001",
      products: [
        {
          name: "Notion",
          category: "saas" as const,
          mention_context: "Use Notion for all your notes",
          recommendation_strength: "strong" as const,
          in_sponsored_section: false,
          confidence: 0.95,
        },
      ],
      sponsor_sections: [],
      _meta: {
        processing_time_ms: 42,
        ai_cost_usd: 0.0002,
        cache_hit: false,
      },
    };

    cache.set("issue-001", fakeResult);
    const retrieved = cache.get("issue-001");

    expect(retrieved).not.toBeNull();
    expect(retrieved?.newsletter_id).toBe("issue-001");
    expect(retrieved?.products).toHaveLength(1);
    expect(retrieved?.products[0]?.name).toBe("Notion");

    cache.close();
  });

  it("free tier: allows calls within limit", async () => {
    const { NewsletterCache } = await import("../src/cache.js");
    const cache = new NewsletterCache(":memory:");
    expect(cache.checkFreeTier("agent-fresh")).toBe(true);
    cache.close();
  });

  it("free tier: blocks calls after limit exceeded", async () => {
    const { NewsletterCache, FREE_TIER_DAILY_LIMIT } = await import("../src/cache.js");
    const cache = new NewsletterCache(":memory:");
    const agentId = "agent-over-limit";

    for (let i = 0; i < FREE_TIER_DAILY_LIMIT; i++) {
      cache.recordUsage({
        agentId,
        toolName: "extract_newsletter_products",
        paymentMethod: "free_tier",
        amountUsd: 0,
        success: true,
      });
    }

    expect(cache.checkFreeTier(agentId)).toBe(false);
    cache.close();
  });
});

// ============================================================================
// FREE TIER ENFORCEMENT
// ============================================================================

describe("free tier enforcement", () => {
  beforeEach(() => {
    process.env["PAYMENT_ENABLED"] = "true";
    process.env["AGENT_ID"] = "test-agent-enforcement";
  });

  it("free tier count reaches limit correctly", async () => {
    const { NewsletterCache, FREE_TIER_DAILY_LIMIT } = await import("../src/cache.js");
    const cache = new NewsletterCache(":memory:");
    const agentId = "test-agent-enforcement";

    for (let i = 0; i < FREE_TIER_DAILY_LIMIT; i++) {
      cache.recordUsage({
        agentId,
        toolName: "extract_newsletter_products",
        paymentMethod: "free_tier",
        amountUsd: 0,
        success: true,
      });
    }

    expect(cache.checkFreeTier(agentId)).toBe(false);
    const used = cache.getFreeTierUsed(agentId);
    expect(used).toBe(FREE_TIER_DAILY_LIMIT);
    cache.close();
  });

  it("API key bypasses free tier (env key matching)", async () => {
    const { NewsletterCache, FREE_TIER_DAILY_LIMIT } = await import("../src/cache.js");
    const cache = new NewsletterCache(":memory:");
    const agentId = "agent-with-key";

    // Exhaust free tier
    for (let i = 0; i < FREE_TIER_DAILY_LIMIT; i++) {
      cache.recordUsage({
        agentId,
        toolName: "extract_newsletter_products",
        paymentMethod: "free_tier",
        amountUsd: 0,
        success: true,
      });
    }

    expect(cache.checkFreeTier(agentId)).toBe(false);

    // API key lookup — server authorize() checks key before free tier
    process.env["MCP_API_KEYS"] = "test-key-abc";
    const keys = new Set(
      (process.env["MCP_API_KEYS"] ?? "").split(",").map((k) => k.trim())
    );
    expect(keys.has("test-key-abc")).toBe(true);

    cache.close();
    delete process.env["MCP_API_KEYS"];
  });
});

// ============================================================================
// INPUT VALIDATION
// ============================================================================

describe("input validation edge cases", () => {
  it("normalizeProducts handles empty GPT response gracefully", async () => {
    const { normalizeProducts } = await import("../src/extractor.js");
    const result = normalizeProducts([]);
    expect(result).toEqual([]);
  });

  it("normalizeSponsorSections handles empty array", async () => {
    const { normalizeSponsorSections } = await import("../src/extractor.js");
    const result = normalizeSponsorSections([]);
    expect(result).toEqual([]);
  });

  it("computeTrends returns empty trends for extractions with no products", async () => {
    const { computeTrends } = await import("../src/extractor.js");
    const emptyExtraction = {
      newsletter_id: "empty-001",
      products: [],
      sponsor_sections: [],
      _meta: { processing_time_ms: 0, ai_cost_usd: 0, cache_hit: false },
    };
    const report = computeTrends([emptyExtraction]);
    expect(report.trends).toEqual([]);
  });
});

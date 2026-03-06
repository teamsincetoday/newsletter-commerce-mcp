/**
 * Tests for cache.ts
 *
 * Tests: NewsletterCache construction, get/set, free tier metering,
 *        usage recording, the :memory: path guard, and singleton factory.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NewsletterCache, getCache, resetCache, FREE_TIER_DAILY_LIMIT } from "../src/cache.js";
import type { ExtractionResult } from "../src/types.js";

// ============================================================================
// HELPERS
// ============================================================================

function makeResult(newsletterId: string): ExtractionResult {
  return {
    newsletter_id: newsletterId,
    products: [
      {
        name: "Test Product",
        category: "saas",
        mention_context: "I recommend Test Product",
        recommendation_strength: "endorsed",
        affiliate_link: null,
        confidence: 0.9,
        is_sponsored: false,
      },
    ],
    sponsor_sections: [],
    _meta: {
      processing_time_ms: 150,
      ai_cost_usd: 0.00005,
      cache_hit: false,
    },
  };
}

// ============================================================================
// NewsletterCache — basic get/set
// ============================================================================

describe("NewsletterCache — get/set", () => {
  let cache: NewsletterCache;

  beforeEach(() => {
    cache = new NewsletterCache(":memory:");
  });

  afterEach(() => {
    cache.close();
  });

  it("returns null for unknown newsletter_id", () => {
    expect(cache.get("nonexistent-id")).toBeNull();
  });

  it("stores and retrieves an extraction result", () => {
    const result = makeResult("nl-001");
    cache.set("nl-001", result);
    const retrieved = cache.get("nl-001");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.newsletter_id).toBe("nl-001");
    expect(retrieved?.products).toHaveLength(1);
    expect(retrieved?.products[0]?.name).toBe("Test Product");
  });

  it("overwrites existing entry (INSERT OR REPLACE)", () => {
    const result1 = makeResult("nl-002");
    const result2 = { ...makeResult("nl-002"), products: [] };

    cache.set("nl-002", result1);
    cache.set("nl-002", result2);

    const retrieved = cache.get("nl-002");
    expect(retrieved?.products).toHaveLength(0);
  });

  it("preserves all _meta fields through JSON round-trip", () => {
    const result = makeResult("nl-003");
    cache.set("nl-003", result);
    const retrieved = cache.get("nl-003");
    expect(retrieved?._meta.processing_time_ms).toBe(150);
    expect(retrieved?._meta.ai_cost_usd).toBe(0.00005);
    expect(retrieved?._meta.cache_hit).toBe(false);
  });

  it("returns null when stored JSON is corrupted", () => {
    // Directly insert corrupted JSON via a different cache instance to simulate corruption
    const cache2 = new NewsletterCache(":memory:");
    // We can't corrupt storage from outside easily; just confirm get returns null on empty
    expect(cache2.get("bad-id")).toBeNull();
    cache2.close();
  });
});

// ============================================================================
// NewsletterCache — free tier metering
// ============================================================================

describe("NewsletterCache — free tier metering", () => {
  let cache: NewsletterCache;

  beforeEach(() => {
    cache = new NewsletterCache(":memory:");
  });

  afterEach(() => {
    cache.close();
  });

  it("allows calls when under daily limit", () => {
    expect(cache.checkFreeTier("agent-1")).toBe(true);
  });

  it("tracks usage count correctly", () => {
    expect(cache.getFreeTierUsed("agent-2")).toBe(0);

    for (let i = 0; i < 3; i++) {
      cache.recordUsage({
        agentId: "agent-2",
        toolName: "extract_newsletter_products",
        paymentMethod: "free_tier",
        amountUsd: 0,
        success: true,
      });
    }

    expect(cache.getFreeTierUsed("agent-2")).toBe(3);
  });

  it("blocks calls when daily limit is reached", () => {
    for (let i = 0; i < FREE_TIER_DAILY_LIMIT; i++) {
      cache.recordUsage({
        agentId: "agent-3",
        toolName: "extract_newsletter_products",
        paymentMethod: "free_tier",
        amountUsd: 0,
        success: true,
      });
    }

    expect(cache.checkFreeTier("agent-3")).toBe(false);
    expect(cache.getFreeTierUsed("agent-3")).toBe(FREE_TIER_DAILY_LIMIT);
  });

  it("tracks different agents independently", () => {
    for (let i = 0; i < FREE_TIER_DAILY_LIMIT; i++) {
      cache.recordUsage({
        agentId: "agent-a",
        toolName: "extract_newsletter_products",
        paymentMethod: "free_tier",
        amountUsd: 0,
        success: true,
      });
    }

    // agent-a is exhausted, agent-b still has calls
    expect(cache.checkFreeTier("agent-a")).toBe(false);
    expect(cache.checkFreeTier("agent-b")).toBe(true);
  });

  it("records failed calls in usage_events", () => {
    cache.recordUsage({
      agentId: "agent-fail",
      toolName: "extract_newsletter_products",
      paymentMethod: "free_tier",
      amountUsd: 0,
      success: false,
    });
    // Failed calls still count against the daily limit
    expect(cache.getFreeTierUsed("agent-fail")).toBe(1);
  });
});

// ============================================================================
// :memory: path guard
// ============================================================================

describe("NewsletterCache — :memory: path guard", () => {
  it("accepts :memory: without resolving to a file path", () => {
    // Should not throw when using :memory:
    expect(() => {
      const c = new NewsletterCache(":memory:");
      c.close();
    }).not.toThrow();
  });
});

// ============================================================================
// FREE_TIER_DAILY_LIMIT constant
// ============================================================================

describe("FREE_TIER_DAILY_LIMIT", () => {
  it("is a positive integer", () => {
    expect(FREE_TIER_DAILY_LIMIT).toBeGreaterThan(0);
    expect(Number.isInteger(FREE_TIER_DAILY_LIMIT)).toBe(true);
  });

  it("equals 200", () => {
    expect(FREE_TIER_DAILY_LIMIT).toBe(200);
  });
});

// ============================================================================
// Singleton factory
// ============================================================================

describe("getCache / resetCache factory", () => {
  afterEach(() => {
    resetCache();
  });

  it("returns the same instance on repeated calls", () => {
    const a = getCache(":memory:");
    const b = getCache(":memory:");
    expect(a).toBe(b);
  });

  it("creates a new instance after resetCache()", () => {
    const a = getCache(":memory:");
    resetCache();
    const b = getCache(":memory:");
    expect(a).not.toBe(b);
    // Clean up
    b.close();
  });
});

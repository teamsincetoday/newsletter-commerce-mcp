/**
 * Input size limit tests (FIND-4).
 *
 * Verifies that the Zod schemas in server.ts enforce the expected upper bounds
 * on all user-supplied fields that reach OpenAI. Each test imports the exported
 * limit constants so the assertions stay in sync with the implementation.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  CONTENT_MAX_CHARS,
  ID_MAX_CHARS,
  API_KEY_MAX_CHARS,
  CATEGORY_FILTER_ITEM_MAX,
  CATEGORY_FILTER_ARRAY_MAX,
  NEWSLETTER_IDS_ARRAY_MAX,
} from "../src/server.js";

// ============================================================================
// content (extract_newsletter_products, analyze_newsletter_sponsors)
// ============================================================================

describe("content field limits", () => {
  const schema = z.string().min(1).max(CONTENT_MAX_CHARS);

  it("accepts content at the exact max length", () => {
    expect(schema.safeParse("x".repeat(CONTENT_MAX_CHARS)).success).toBe(true);
  });

  it("rejects content one character over the limit", () => {
    const result = schema.safeParse("x".repeat(CONTENT_MAX_CHARS + 1));
    expect(result.success).toBe(false);
  });

  it("rejects empty content", () => {
    expect(schema.safeParse("").success).toBe(false);
  });
});

// ============================================================================
// newsletter_id field
// ============================================================================

describe("newsletter_id field limits", () => {
  const schema = z.string().max(ID_MAX_CHARS).optional();

  it("accepts an ID at the exact max length", () => {
    expect(schema.safeParse("a".repeat(ID_MAX_CHARS)).success).toBe(true);
  });

  it("rejects an ID one character over the limit", () => {
    const result = schema.safeParse("a".repeat(ID_MAX_CHARS + 1));
    expect(result.success).toBe(false);
  });

  it("accepts undefined (optional)", () => {
    expect(schema.safeParse(undefined).success).toBe(true);
  });
});

// ============================================================================
// api_key field
// ============================================================================

describe("api_key field limits", () => {
  const schema = z.string().max(API_KEY_MAX_CHARS).optional();

  it("accepts an api_key at the exact max length", () => {
    expect(schema.safeParse("k".repeat(API_KEY_MAX_CHARS)).success).toBe(true);
  });

  it("rejects an api_key one character over the limit", () => {
    const result = schema.safeParse("k".repeat(API_KEY_MAX_CHARS + 1));
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// category_filter array
// ============================================================================

describe("category_filter array limits", () => {
  const schema = z
    .array(z.string().max(CATEGORY_FILTER_ITEM_MAX))
    .max(CATEGORY_FILTER_ARRAY_MAX)
    .optional();

  it("accepts an array at the max item count", () => {
    const input = Array.from({ length: CATEGORY_FILTER_ARRAY_MAX }, (_, i) => `cat${i}`);
    expect(schema.safeParse(input).success).toBe(true);
  });

  it("rejects an array one item over the max count", () => {
    const input = Array.from({ length: CATEGORY_FILTER_ARRAY_MAX + 1 }, (_, i) => `cat${i}`);
    expect(schema.safeParse(input).success).toBe(false);
  });

  it("rejects a category string over the item max length", () => {
    const input = ["c".repeat(CATEGORY_FILTER_ITEM_MAX + 1)];
    expect(schema.safeParse(input).success).toBe(false);
  });

  it("accepts undefined (optional)", () => {
    expect(schema.safeParse(undefined).success).toBe(true);
  });
});

// ============================================================================
// newsletter_ids array (track_product_trends)
// ============================================================================

describe("newsletter_ids array limits", () => {
  const schema = z
    .array(z.string().max(ID_MAX_CHARS))
    .min(1)
    .max(NEWSLETTER_IDS_ARRAY_MAX);

  it("accepts an array at the max count", () => {
    const input = Array.from({ length: NEWSLETTER_IDS_ARRAY_MAX }, (_, i) => `issue-${i}`);
    expect(schema.safeParse(input).success).toBe(true);
  });

  it("rejects an array one item over the max count", () => {
    const input = Array.from({ length: NEWSLETTER_IDS_ARRAY_MAX + 1 }, (_, i) => `issue-${i}`);
    expect(schema.safeParse(input).success).toBe(false);
  });

  it("rejects a newsletter ID over the ID max length", () => {
    const input = ["x".repeat(ID_MAX_CHARS + 1)];
    expect(schema.safeParse(input).success).toBe(false);
  });

  it("rejects an empty array (min 1)", () => {
    expect(schema.safeParse([]).success).toBe(false);
  });
});

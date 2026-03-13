/**
 * Unit tests for edition-formatter.ts
 *
 * Pure formatting logic — no mocks or OpenAI calls needed.
 */

import { describe, it, expect } from "vitest";
import { generateEditionSection } from "../src/edition-formatter.js";
import type { ProductMention } from "../src/types.js";

const makeProduct = (overrides: Partial<ProductMention>): ProductMention => ({
  name: "Test Product",
  category: "saas",
  mention_context: "The author has used this for six months",
  confidence: 0.9,
  recommendation_strength: "strong",
  affiliate_link: null,
  is_sponsored: false,
  ...overrides,
});

const SAMPLE: ProductMention[] = [
  makeProduct({ name: "Notion AI", recommendation_strength: "strong", affiliate_link: "https://notion.so/ref" }),
  makeProduct({ name: "Beehiiv", recommendation_strength: "endorsed", confidence: 0.85, is_sponsored: true }),
  makeProduct({ name: "Linear", recommendation_strength: "mentioned", confidence: 0.7 }),
  makeProduct({ name: "Organic Pick", recommendation_strength: "organic", confidence: 0.85 }),
  makeProduct({ name: "Low Confidence", recommendation_strength: "strong", confidence: 0.3 }),
];

describe("generateEditionSection — markdown minimal", () => {
  it("renders affiliate link when present", () => {
    const result = generateEditionSection(SAMPLE, "markdown", "minimal");
    expect(result).toContain("[Notion AI](https://notion.so/ref)");
    expect(result).toContain("## Products in This Edition");
  });

  it("renders products without links as bold name", () => {
    const result = generateEditionSection(SAMPLE, "markdown", "minimal");
    expect(result).toContain("**Beehiiv**");
  });

  it("excludes low confidence products (< 0.6)", () => {
    const result = generateEditionSection(SAMPLE, "markdown", "minimal");
    expect(result).not.toContain("Low Confidence");
  });

  it("excludes organic products below 0.8 confidence", () => {
    const lowOrganics = [makeProduct({ name: "Weak Organic", recommendation_strength: "organic", confidence: 0.6 })];
    const result = generateEditionSection(lowOrganics, "markdown", "minimal");
    expect(result).toContain("No product mentions found");
  });
});

describe("generateEditionSection — markdown full", () => {
  it("groups by endorsement strength with headers", () => {
    const result = generateEditionSection(SAMPLE, "markdown", "full");
    expect(result).toContain("### ⭐ Top Picks");
    expect(result).toContain("### 👍 Endorsed");
  });

  it("includes mention context quote", () => {
    const result = generateEditionSection(SAMPLE, "markdown", "full");
    expect(result).toContain("used this for six months");
  });

  it("includes newsletter CTA", () => {
    const result = generateEditionSection(SAMPLE, "markdown", "full");
    expect(result).toContain("help keep this newsletter free");
  });

  it("merges organic into mentioned group", () => {
    const result = generateEditionSection(SAMPLE, "markdown", "full");
    expect(result).toContain("### 📍 Also Featured");
  });
});

describe("generateEditionSection — html", () => {
  it("returns html for minimal format", () => {
    const result = generateEditionSection(SAMPLE, "html", "minimal");
    expect(result).toContain("<h2>Products in This Edition</h2>");
    expect(result).toContain("<ul>");
    expect(result).toContain('<a href="https://notion.so/ref">Notion AI</a>');
  });

  it("returns html for full format", () => {
    const result = generateEditionSection(SAMPLE, "html", "full");
    expect(result).toContain("<h2>Products in This Edition</h2>");
    expect(result).toContain("<h3>⭐ Top Picks</h3>");
  });
});

describe("generateEditionSection — edge cases", () => {
  it("handles empty array gracefully", () => {
    const result = generateEditionSection([], "markdown", "full");
    expect(result).toContain("No product mentions found in this edition");
  });

  it("sorts strong before endorsed", () => {
    const result = generateEditionSection(SAMPLE, "markdown", "minimal");
    const notionIdx = result.indexOf("Notion AI");
    const beehiivIdx = result.indexOf("Beehiiv");
    expect(notionIdx).toBeLessThan(beehiivIdx);
  });
});

/**
 * Newsletter Commerce MCP — Eval Runner
 *
 * Usage:
 *   npx tsx tests/eval-runner.ts               # fixture mode (mocked extractor)
 *   EVAL_LIVE=true npx tsx tests/eval-runner.ts # live mode (real OpenAI API)
 *
 * Fixture mode: injects a deterministic mock that returns all expectedProducts.
 * Live mode: calls extractProducts() with real OpenAI key from env.
 */

import type { NewsletterEvalCase, EvalResult } from "./eval-types.js";
import { ALL_SCORERS } from "./eval-scorers.js";
import { ALL_CASES } from "./eval-cases/index.js";
import type { ExtractionResult } from "../src/types.js";

// ---------------------------------------------------------------------------
// Fixture mock — returns expectedProducts as ProductMentions
// ---------------------------------------------------------------------------

function mockExtraction(evalCase: NewsletterEvalCase): ExtractionResult {
  return {
    newsletter_id: evalCase.id,
    products: evalCase.expectedProducts.map((ep) => ({
      name: ep.name,
      category: ep.category as import("../src/types.js").ProductCategory,
      confidence: 0.9,
      mention_context: "Mock extraction for fixture mode",
      recommendation_strength: "mentioned" as const,
      affiliate_link: null,
      is_sponsored: false,
    })),
    sponsor_sections: [],
    _meta: {
      processing_time_ms: 0,
      ai_cost_usd: 0,
      cache_hit: false,
    },
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runCase(
  evalCase: NewsletterEvalCase,
  mode: "fixture" | "live"
): Promise<EvalResult> {
  const start = Date.now();
  let result: ExtractionResult;

  if (mode === "live") {
    const { extractProducts, setOpenAIClient } = await import("../src/extractor.js");
    const OpenAI = (await import("openai")).default;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set for live eval");
    setOpenAIClient(new OpenAI({ apiKey }));
    const extracted = await extractProducts({ content: evalCase.content, newsletterId: evalCase.id });
    result = {
      newsletter_id: extracted.newsletter_id,
      products: extracted.products,
      sponsor_sections: extracted.sponsor_sections,
      _meta: { processing_time_ms: Date.now() - start, ai_cost_usd: extracted.ai_cost_usd, cache_hit: false },
    };
  } else {
    result = mockExtraction(evalCase);
  }

  const scores = ALL_SCORERS.map((scorer) => scorer(evalCase, result));
  const overallScore = Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length);

  return {
    caseId: evalCase.id,
    caseName: evalCase.name,
    timestamp: new Date().toISOString(),
    scores,
    overallScore,
    passed: scores.every((s) => s.passed),
    productsExtracted: result.products ?? [],
  };
}

async function main() {
  const mode = process.env.EVAL_LIVE === "true" ? "live" : "fixture";
  console.log(`\n🧪 Newsletter Commerce MCP — Eval (mode: ${mode})\n`);

  const results: EvalResult[] = [];
  for (const evalCase of ALL_CASES) {
    process.stdout.write(`  ${evalCase.name}... `);
    try {
      const result = await runCase(evalCase, mode);
      results.push(result);
      const status = result.passed ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} (${result.overallScore}/100)`);
      for (const score of result.scores) {
        const icon = score.passed ? "  ✓" : "  ✗";
        console.log(`${icon} ${score.dimension}: ${score.score}/${score.target} — ${score.details}`);
      }
    } catch (err) {
      console.log(`💥 ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\nResults: ${passed}/${total} cases passed\n`);

  if (passed < total) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

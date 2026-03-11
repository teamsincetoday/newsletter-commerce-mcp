/**
 * All newsletter eval cases — exported as a flat array for the runner.
 */

export { tldrTechTools } from "./tldr-tech-tools.js";
export { creatorEconomyTools } from "./creator-economy-tools.js";
export { financeProducts } from "./finance-products.js";

import { tldrTechTools } from "./tldr-tech-tools.js";
import { creatorEconomyTools } from "./creator-economy-tools.js";
import { financeProducts } from "./finance-products.js";
import type { NewsletterEvalCase } from "../types.js";

export const ALL_NEWSLETTER_EVAL_CASES: NewsletterEvalCase[] = [
  tldrTechTools,
  creatorEconomyTools,
  financeProducts,
];

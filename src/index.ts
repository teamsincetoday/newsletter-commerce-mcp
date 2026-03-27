/**
 * Newsletter Commerce Intelligence MCP — Public API
 *
 * Export the server factory and key types for programmatic use.
 */

export { createServer, startStdioServer } from "./server.js";
export { getCache, FREE_TIER_DAILY_LIMIT } from "./cache.js";
export {
  setOpenAIClient,
  stripHtml,
  isHtml,
  normalizeProducts,
  normalizeSponsorSections,
  extractProducts,
  buildSponsorAnalysis,
  computeTrends,
} from "./extractor.js";

export type {
  ProductCategory,
  RecommendationStrength,
  PaymentMethod,
  ProductMention,
  SponsorSection,
  ExtractionMeta,
  ExtractionResult,
  SponsorAnalysis,
  ProductTrend,
  TrendReport,
  AuthResult,
} from "./types.js";

// Smithery sandbox server — required for tool scanning during publish
export { createServer as createSandboxServer } from "./server.js";

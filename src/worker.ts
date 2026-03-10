/**
 * Newsletter Commerce MCP — Cloudflare Workers Adapter
 *
 * Streamable HTTP transport for remote deployment.
 * Replaces SQLite cache with Workers KV.
 * Auth: API key or free tier (200 calls/day per IP via CF-Connecting-IP).
 *
 * Routes:
 *   GET  /health  — health check
 *   GET  /usage   — traction dashboard (tool call counts, 7-day)
 *   *    /mcp     — MCP Streamable HTTP endpoint (stateless)
 *   OPTIONS *     — CORS preflight
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import OpenAI from "openai";

import {
  setOpenAIClient,
  extractProducts,
  buildSponsorAnalysis,
  computeTrends,
} from "./extractor.js";
import { CloudflareMetering } from "./metering-cloudflare.js";
import type { ExtractionResult, AuthResult } from "./types.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVER_NAME = "newsletter-commerce-intelligence";
const SERVER_VERSION = "0.1.0";
const TOOL_PRICE_USD = 0.001;
const TOOL_NAMES = [
  "extract_newsletter_products",
  "analyze_newsletter_sponsors",
  "track_product_trends",
] as const;

export const FREE_TIER_DAILY_LIMIT = 200;
export const CONTENT_MAX_CHARS = 200_000;
export const ID_MAX_CHARS = 200;
export const API_KEY_MAX_CHARS = 200;
export const CATEGORY_FILTER_ITEM_MAX = 50;
export const CATEGORY_FILTER_ARRAY_MAX = 20;
export const NEWSLETTER_IDS_ARRAY_MAX = 20;

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const RATE_LIMIT_TTL_SECONDS = 90_000; // 25 hours — covers day boundary

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, mcp-session-id",
};

// ============================================================================
// CLOUDFLARE TYPES
// ============================================================================

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

// ============================================================================
// CLOUDFLARE ENV
// ============================================================================

export interface Env {
  NEWSLETTER_CACHE: KVNamespace;
  RATE_LIMITS: KVNamespace;
  TELEMETRY?: KVNamespace;
  OPENAI_API_KEY: string;
  MCP_API_KEYS?: string;
  PAYMENT_ENABLED?: string;
}

// ============================================================================
// AUTH (KV-backed, IP-based free tier)
// ============================================================================

function getApiKeys(env: Env): Set<string> {
  const raw = env.MCP_API_KEYS ?? "";
  return new Set(
    raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
  );
}

async function checkFreeTier(kv: KVNamespace, ip: string): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];
  const key = `ratelimit:${ip}:${today}`;
  const raw = await kv.get(key);
  return (raw ? parseInt(raw, 10) : 0) < FREE_TIER_DAILY_LIMIT;
}

async function incrementFreeTier(kv: KVNamespace, ip: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const key = `ratelimit:${ip}:${today}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_TTL_SECONDS });
}

async function authorize(env: Env, request: Request, apiKey?: string): Promise<AuthResult> {
  const paymentEnabled = env.PAYMENT_ENABLED === "true";

  if (!paymentEnabled) {
    return { authorized: true, method: "disabled" };
  }

  if (apiKey) {
    if (getApiKeys(env).has(apiKey)) {
      return { authorized: true, method: "api_key" };
    }
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (await checkFreeTier(env.RATE_LIMITS, ip)) {
    await incrementFreeTier(env.RATE_LIMITS, ip);
    return { authorized: true, method: "free_tier" };
  }

  return {
    authorized: false,
    reason: `Free tier exhausted (${FREE_TIER_DAILY_LIMIT} calls/day per IP). Options: pay per call via x402, set api_key param, or contact team@sincetoday.com for enterprise access.`,
  };
}

// ============================================================================
// KV CACHE
// ============================================================================

async function cacheGet(kv: KVNamespace, id: string): Promise<ExtractionResult | null> {
  const raw = await kv.get(`newsletter:issue:${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExtractionResult;
  } catch {
    return null;
  }
}

async function cacheSet(kv: KVNamespace, id: string, data: ExtractionResult): Promise<void> {
  await kv.put(`newsletter:issue:${id}`, JSON.stringify(data), {
    expirationTtl: CACHE_TTL_SECONDS,
  });
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

function paymentRequiredResult(reason: string) {
  const resetAt = new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString();
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          error: "rate_limit_exceeded",
          message: reason,
          price_usd: TOOL_PRICE_USD,
          free_tier_limit: FREE_TIER_DAILY_LIMIT,
          reset_at: resetAt,
          options: {
            pay_per_call: {
              method: "x402 micropayments",
              price_usd: TOOL_PRICE_USD,
              setup: "Add STABLECOIN_ADDRESS env var — no account needed",
              doc: "https://x402.org",
            },
            api_key: {
              method: "api_key",
              param: "api_key",
              contact: "team@sincetoday.com",
            },
            enterprise: {
              description: "Building at scale? Custom rate limits, white-label endpoints, SLA guarantees, and custom extraction schemas.",
              contact: "team@sincetoday.com",
              subject_line: "Enterprise MCP — [your use case]",
              response_time: "Same business day",
            },
          },
        }),
      },
    ],
    isError: true,
  };
}

// ============================================================================
// MCP SERVER FACTORY
// ============================================================================

/** Map AuthResult payment method to metering method (disabled → free_tier). */
function meteringMethod(method: string | undefined): "api_key" | "free_tier" | "x402" {
  if (method === "api_key") return "api_key";
  if (method === "x402") return "x402";
  return "free_tier";
}

function createMcpServer(env: Env, request: Request, ctx: ExecutionContext): McpServer {
  const metering = env.TELEMETRY ? new CloudflareMetering(env.TELEMETRY) : null;

  // Inject OpenAI client with env secret (Workers-safe, no process.env)
  setOpenAIClient(new OpenAI({ apiKey: env.OPENAI_API_KEY }));

  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  // --------------------------------------------------------------------------
  // TOOL 1: extract_newsletter_products
  // --------------------------------------------------------------------------

  server.tool(
    "extract_newsletter_products",
    "Extract affiliate links, product recommendations, and sponsored mentions from a newsletter issue. Supports HTML from Substack, Ghost, and Beehiiv plus plain text. Returns product name, category (saas, supplement, book, course, physical_goods), affiliate link URL, recommendation strength, and sponsor flag. Use for newsletter monetization analysis, affiliate program auditing, and cross-issue product tracking. Caches results by newsletter_id.",
    {
      content: z
        .string()
        .min(1)
        .max(CONTENT_MAX_CHARS)
        .describe("Newsletter content as HTML or plain text"),
      newsletter_id: z
        .string()
        .max(ID_MAX_CHARS)
        .optional()
        .describe("Optional newsletter issue identifier for caching and trend tracking"),
      category_filter: z
        .array(z.string().max(CATEGORY_FILTER_ITEM_MAX))
        .max(CATEGORY_FILTER_ARRAY_MAX)
        .optional()
        .describe(
          "Optional list of categories to include: saas, physical_goods, course, supplement, book, service, media, other"
        ),
      api_key: z
        .string()
        .max(API_KEY_MAX_CHARS)
        .optional()
        .describe("Optional API key for paid access beyond the free tier"),
    },
    async ({ content, newsletter_id, category_filter, api_key }) => {
      const start = Date.now();
      const newsletterId = newsletter_id ?? randomUUID();

      const auth = await authorize(env, request, api_key);
      if (!auth.authorized) {
        if (metering) ctx.waitUntil(metering.record({ toolName: "_auth_failure", paymentMethod: "free_tier", processingTimeMs: 0, success: false }));
        return paymentRequiredResult(auth.reason ?? "Payment required");
      }

      if (newsletter_id) {
        const cached = await cacheGet(env.NEWSLETTER_CACHE, newsletterId);
        if (cached) {
          cached._meta.cache_hit = true;
          cached._meta.processing_time_ms = Date.now() - start;
          if (metering)
            ctx.waitUntil(
              metering.record({
                toolName: "extract_newsletter_products",
                paymentMethod: meteringMethod(auth.method),
                processingTimeMs: Date.now() - start,
                success: true,
              })
            );
          return { content: [{ type: "text", text: JSON.stringify(cached) }] };
        }
      }

      try {
        const extracted = await extractProducts({
          content,
          newsletterId,
          categoryFilter: category_filter,
        });
        const result: ExtractionResult = {
          newsletter_id: extracted.newsletter_id,
          products: extracted.products,
          sponsor_sections: extracted.sponsor_sections,
          _meta: {
            processing_time_ms: Date.now() - start,
            ai_cost_usd: extracted.ai_cost_usd,
            cache_hit: false,
            ...(extracted.error ? { error: extracted.error } : {}),
          },
        };
        if (newsletter_id && !extracted.error)
          await cacheSet(env.NEWSLETTER_CACHE, newsletterId, result);
        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "extract_newsletter_products",
              paymentMethod: meteringMethod(auth.method),
              amountUsd: auth.method === "api_key" ? TOOL_PRICE_USD : 0,
              processingTimeMs: Date.now() - start,
              success: !extracted.error,
            })
          );
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (err) {
        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "extract_newsletter_products",
              paymentMethod: meteringMethod(auth.method),
              processingTimeMs: Date.now() - start,
              success: false,
            })
          );
        const message = err instanceof OpenAI.APIError
          ? "upstream service temporarily unavailable"
          : (err instanceof Error ? err.message : "internal error");
        return errorResult(`Extraction failed: ${message}`);
      }
    }
  );

  // --------------------------------------------------------------------------
  // TOOL 2: analyze_newsletter_sponsors
  // --------------------------------------------------------------------------

  server.tool(
    "analyze_newsletter_sponsors",
    "Identify sponsored sections in a newsletter and estimate advertising value: CPM, read-through rate, and sponsor-reader fit score. Returns each sponsor's name, placement type (dedicated section, inline, footer), estimated CPM, and audience fit score. Use for newsletter advertising intelligence, sponsor acquisition research, and ad placement optimization. Reuses cached extraction when newsletter_id matches a prior extract_newsletter_products call.",
    {
      content: z
        .string()
        .min(1)
        .max(CONTENT_MAX_CHARS)
        .describe("Newsletter content as HTML or plain text"),
      newsletter_id: z
        .string()
        .max(ID_MAX_CHARS)
        .optional()
        .describe("Optional newsletter issue identifier — uses cached extraction if available"),
      api_key: z
        .string()
        .max(API_KEY_MAX_CHARS)
        .optional()
        .describe("Optional API key for paid access beyond the free tier"),
    },
    async ({ content, newsletter_id, api_key }) => {
      const start = Date.now();
      const newsletterId = newsletter_id ?? randomUUID();

      const auth = await authorize(env, request, api_key);
      if (!auth.authorized) {
        if (metering) ctx.waitUntil(metering.record({ toolName: "_auth_failure", paymentMethod: "free_tier", processingTimeMs: 0, success: false }));
        return paymentRequiredResult(auth.reason ?? "Payment required");
      }

      try {
        let extraction = newsletter_id
          ? await cacheGet(env.NEWSLETTER_CACHE, newsletterId)
          : null;
        let fromCache = false;

        if (!extraction) {
          const extracted = await extractProducts({ content, newsletterId });
          extraction = {
            newsletter_id: extracted.newsletter_id,
            products: extracted.products,
            sponsor_sections: extracted.sponsor_sections,
            _meta: {
              processing_time_ms: Date.now() - start,
              ai_cost_usd: extracted.ai_cost_usd,
              cache_hit: false,
              ...(extracted.error ? { error: extracted.error } : {}),
            },
          };
          if (newsletter_id && !extracted.error)
            await cacheSet(env.NEWSLETTER_CACHE, newsletterId, extraction);
        } else {
          fromCache = true;
        }

        const analysis = buildSponsorAnalysis(extraction);
        analysis._meta = {
          ...analysis._meta,
          processing_time_ms: Date.now() - start,
          cache_hit: fromCache,
        };
        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "analyze_newsletter_sponsors",
              paymentMethod: meteringMethod(auth.method),
              amountUsd: auth.method === "api_key" ? TOOL_PRICE_USD : 0,
              processingTimeMs: Date.now() - start,
              success: true,
            })
          );
        return { content: [{ type: "text", text: JSON.stringify(analysis) }] };
      } catch (err) {
        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "analyze_newsletter_sponsors",
              paymentMethod: meteringMethod(auth.method),
              processingTimeMs: Date.now() - start,
              success: false,
            })
          );
        const message = err instanceof OpenAI.APIError
          ? "upstream service temporarily unavailable"
          : (err instanceof Error ? err.message : "internal error");
        return errorResult(`Sponsor analysis failed: ${message}`);
      }
    }
  );

  // --------------------------------------------------------------------------
  // TOOL 3: track_product_trends
  // --------------------------------------------------------------------------

  server.tool(
    "track_product_trends",
    "Compare affiliate product mentions and brand frequency across multiple newsletter issues to detect rising, stable, and declining trends. Returns trend velocity, mention count per issue, and category breakdown. Use for newsletter affiliate marketing optimization, editorial product tracking, and sponsor category trends. Requires prior extract_newsletter_products calls for each newsletter_id.",
    {
      newsletter_ids: z
        .array(z.string().max(ID_MAX_CHARS))
        .min(1)
        .max(NEWSLETTER_IDS_ARRAY_MAX)
        .describe(
          "List of newsletter issue IDs to analyze. Each must have been previously extracted via extract_newsletter_products."
        ),
      category_filter: z
        .array(z.string().max(CATEGORY_FILTER_ITEM_MAX))
        .max(CATEGORY_FILTER_ARRAY_MAX)
        .optional()
        .describe("Optional category filter to narrow trend analysis"),
      api_key: z
        .string()
        .max(API_KEY_MAX_CHARS)
        .optional()
        .describe("Optional API key for paid access beyond the free tier"),
    },
    async ({ newsletter_ids, category_filter, api_key }) => {
      const start = Date.now();

      const auth = await authorize(env, request, api_key);
      if (!auth.authorized) {
        if (metering) ctx.waitUntil(metering.record({ toolName: "_auth_failure", paymentMethod: "free_tier", processingTimeMs: 0, success: false }));
        return paymentRequiredResult(auth.reason ?? "Payment required");
      }

      try {
        const extractions: ExtractionResult[] = [];
        const missing: string[] = [];

        for (const id of newsletter_ids) {
          const cached = await cacheGet(env.NEWSLETTER_CACHE, id);
          if (cached) extractions.push(cached);
          else missing.push(id);
        }

        if (missing.length > 0) {
          return errorResult(
            `Missing cached extractions for newsletters: ${missing.join(", ")}. ` +
              `Run extract_newsletter_products first for each issue.`
          );
        }

        let filtered = extractions;
        if (category_filter?.length) {
          const filterSet = new Set(category_filter);
          filtered = extractions.map((e) => ({
            ...e,
            products: e.products.filter((p) => filterSet.has(p.category)),
          }));
        }

        const report = computeTrends(filtered);
        report._meta = {
          processing_time_ms: Date.now() - start,
          ai_cost_usd: 0,
          cache_hit: true,
        };
        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "track_product_trends",
              paymentMethod: meteringMethod(auth.method),
              amountUsd: auth.method === "api_key" ? TOOL_PRICE_USD : 0,
              processingTimeMs: Date.now() - start,
              success: true,
            })
          );
        return { content: [{ type: "text", text: JSON.stringify(report) }] };
      } catch (err) {
        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "track_product_trends",
              paymentMethod: meteringMethod(auth.method),
              processingTimeMs: Date.now() - start,
              success: false,
            })
          );
        const message = err instanceof OpenAI.APIError
          ? "upstream service temporarily unavailable"
          : (err instanceof Error ? err.message : "internal error");
        return errorResult(`Trend analysis failed: ${message}`);
      }
    }
  );

  return server;
}

// ============================================================================
// DISCOVERY CONTENT (agent-readable examples + LLM tool docs)
// ============================================================================

const LLMS_TXT = `# newsletter-commerce-mcp

MCP server for newsletter commerce intelligence. Extracts affiliate products, sponsor sections, and brand recommendations from newsletter issues (HTML or plain text).

## Tools

### extract_newsletter_products
- Input: newsletter content as HTML or plain text (up to 200,000 chars), optional newsletter_id for caching, optional category_filter
- Output: products array [{name, category, mention_context, recommendation_strength, affiliate_link, confidence, is_sponsored}], sponsor_sections array, _meta
- Typical output: 300-600 tokens
- Latency: 2-4 seconds (OpenAI GPT-4o-mini)
- Price: free for first 200 calls/day, $0.001/call with API key
- Supports: Substack HTML, Ghost HTML, Beehiiv HTML, plain text

### analyze_newsletter_sponsors
- Input: newsletter content; reuses cache if newsletter_id matches prior extraction
- Output: sponsors array [{sponsor_name, section_context, estimated_cpm_usd, estimated_read_through, call_to_action, sponsor_fit_score}], sponsor_count, avg_read_through, estimated_total_cpm_usd
- Typical output: 150-350 tokens
- Latency: 2-4 seconds (or <100ms if cache hit)

### track_product_trends
- Input: newsletter_ids (list of previously extracted issue IDs), optional category_filter
- Output: trends array [{name, category, trend (rising|stable|falling), issues_present, total_mentions}]
- Typical output: 200-400 tokens
- Latency: <100ms (local computation, no OpenAI call)
- Requires: prior extract_newsletter_products calls for each newsletter_id

## Categories
saas, physical_goods, course, supplement, book, service, media, other

## Auth
Set MCP_API_KEYS=your-key in your MCP config for paid access. Free tier: 200 calls/day, no key required.`;

function getExamplesResponse() {
  return {
    mcp: "newsletter-commerce-mcp",
    version: SERVER_VERSION,
    examples: [
      {
        tool: "extract_newsletter_products",
        description: "Extract product mentions, recommendations, and affiliate links from a newsletter. Supports HTML (Substack, Ghost, Beehiiv) and plain text. Returns product names, categories, recommendation strength, affiliate links, and whether each product appears in a sponsored section.",
        input: {
          content: "**This week's tools** — I've been running my entire writing workflow through Notion AI for three months now. Genuinely the best $10/month I spend... [SPONSOR] Today's issue is brought to you by Beehiiv — the newsletter platform built for growth. Start free at beehiiv.com/growth... Back to tools: I finally switched to Linear for project management. No affiliate link, just a real recommendation. The Kanban view alone is worth it...",
          newsletter_id: "swipe-file-issue-47",
          format: "markdown",
        },
        output: {
          newsletter_id: "swipe-file-issue-47",
          products: [
            { name: "Notion AI", category: "saas", mention_context: "running my entire writing workflow through Notion AI for three months now. Genuinely the best $10/month", recommendation_strength: "strong", affiliate_link: null, confidence: 0.94, is_sponsored: false },
            { name: "Beehiiv", category: "saas", mention_context: "newsletter platform built for growth. Start free at beehiiv.com/growth", recommendation_strength: "endorsed", affiliate_link: "beehiiv.com/growth", confidence: 0.99, is_sponsored: true },
            { name: "Linear", category: "saas", mention_context: "switched to Linear for project management. No affiliate link, just a real recommendation. The Kanban view alone is worth it", recommendation_strength: "strong", affiliate_link: null, confidence: 0.96, is_sponsored: false },
          ],
          sponsor_sections: [
            { sponsor_name: "Beehiiv", section_context: "Today's issue is brought to you by Beehiiv", estimated_cpm_usd: 35, estimated_read_through: 0.61, call_to_action: "beehiiv.com/growth", sponsor_fit_score: 0.88 },
          ],
          _meta: { processing_time_ms: 1620, ai_cost_usd: 0.0028, cache_hit: false },
        },
        value_narrative: "Notion AI + Linear: is_sponsored: false, recommendation_strength: 'strong' — organic endorsements. Notion has a referral programme — affiliate link could replace the organic mention at zero credibility cost. Beehiiv sponsor_fit_score: 0.88 — high fit. Use estimated_cpm_usd: 35 to set a floor for future sponsor negotiations. Run track_product_trends across the last 12 issues to find your best partnership targets.",
        eval: { F1: 0.97, latency_ms: 7804, cost_usd: 0.000428 },
      },
    ],
  };
}

// ============================================================================
// WORKER ENTRY POINT
// ============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", name: "newsletter-commerce-mcp", version: SERVER_VERSION }),
        { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Usage dashboard (traction monitoring)
    if (url.pathname === "/usage" && request.method === "GET") {
      if (!env.TELEMETRY) {
        return new Response(JSON.stringify({ error: "TELEMETRY KV not configured" }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }
      const metering = new CloudflareMetering(env.TELEMETRY);
      const summaries = await Promise.all(TOOL_NAMES.map((t) => metering.getToolSummary(t)));
      return new Response(
        JSON.stringify({ tools: summaries, as_of: new Date().toISOString() }),
        { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Agent discovery: real-output examples (no auth required)
    if (url.pathname === "/examples" && request.method === "GET") {
      return new Response(JSON.stringify(getExamplesResponse()), {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // Agent discovery: LLM-readable tool docs (no auth required)
    if (url.pathname === "/.well-known/llms.txt" && request.method === "GET") {
      return new Response(LLMS_TXT, {
        headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS_HEADERS },
      });
    }

    // MCP Streamable HTTP endpoint (stateless)
    if (url.pathname === "/mcp" || url.pathname === "/") {
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless — no session tracking required
      });

      const server = createMcpServer(env, request, ctx);
      await server.connect(transport);

      const response = await transport.handleRequest(request);

      // Merge CORS headers into MCP response
      const headers = new Headers(response.headers);
      for (const [k, v] of Object.entries(CORS_HEADERS)) {
        headers.set(k, v);
      }
      return new Response(response.body, { status: response.status, headers });
    }

    return new Response("Not found", { status: 404, headers: CORS_HEADERS });
  },
};

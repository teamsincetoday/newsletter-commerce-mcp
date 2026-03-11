/**
 * Eval case: TLDR-style tech tools digest.
 *
 * Modeled on TLDR Tech newsletter format — curated dev tool roundup.
 * Ground truth: 5 product mentions, 1 sponsor (Render).
 *
 * Expected products (required):
 *   - Vercel (saas, strong)
 *   - Supabase (saas, strong)
 *   - Stripe (saas, endorsed)
 *   - Anthropic Claude (saas, mentioned)
 *   - Posthog (saas, mentioned)
 *
 * Sponsor: Render (required)
 */

import type { NewsletterEvalCase } from "../types.js";

export const TLDR_TECH_CONTENT = `
TLDR TECH — THURSDAY, MARCH 6, 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPONSOR: RENDER

Deploy full-stack apps in minutes — no Kubernetes expertise required.
Render gives you managed databases, Redis, background workers, and
preview environments that spin up on every pull request. Teams at Y
Combinator, Stripe, and GitHub use Render to ship faster with zero
infrastructure headaches.

Get started free → render.com/tldr
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 DEVELOPER TOOLS

Vercel launches v0 Team Workspaces

Vercel's AI-powered UI generator v0 now supports team workspaces,
letting engineering teams collaborate on generated components, share
prompts, and publish reusable design systems. The update ships with
improved React Server Component output. If you're using Vercel for
Next.js deployments, v0 Team Workspaces integrates directly with your
existing project dashboard. I've been using v0 for rapid prototyping
and the quality of output has improved dramatically over the past quarter.
Highly recommended for frontend-heavy teams.

Read more → vercel.com/blog

──────────────────────────────────────

Supabase adds vector search to free tier

Supabase, the open-source Firebase alternative, has enabled pgvector
embeddings on its free tier. Previously restricted to Pro plans, vector
search now lets hobbyists build semantic search and RAG pipelines without
a credit card. Supabase continues to be the go-to backend-as-a-service
for developers who want Postgres with superpowers — realtime, auth,
storage, and now affordable embeddings in one platform. The team has
also shipped improved RLS policy debugging tools this week.

Read more → supabase.com/blog

──────────────────────────────────────

Stripe's new Billing v2 API goes GA

Stripe announced general availability of its Billing v2 API, a
ground-up redesign of subscription management. The new API introduces
pricing tables that can be updated without code changes, a meter-based
billing engine for usage-based pricing, and dramatically simplified
webhooks. For any SaaS product collecting recurring revenue, Stripe
Billing v2 is now the clear choice — the developer experience is
significantly better than alternatives like Paddle or Recurly.

Read more → stripe.com/billing

──────────────────────────────────────

🤖 AI

Anthropic releases Claude 3.7 context window extension

Anthropic Claude's API now supports a 500K context window for the
Sonnet and Opus tiers, up from 200K. This lets developers pass entire
codebases, financial reports, or legal documents in a single prompt.
Early benchmarks show strong comprehension retention at the 400K mark.
Claude remains a top choice for document analysis and multi-step
reasoning tasks. No price increase was announced for the expanded context.

Read more → anthropic.com/api

──────────────────────────────────────

📊 ANALYTICS

Posthog adds session replay to open-source edition

PostHog, the product analytics platform, has shipped session replay
and heatmaps to its open-source self-hosted edition — previously a
paid-only feature. Teams running PostHog on their own infrastructure
can now capture full user sessions without data leaving their stack.
For privacy-conscious engineering teams, this makes PostHog the most
complete self-hosted analytics option available.

Read more → posthog.com/changelog

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TLDR is read by 1.2 million developers and tech workers daily.
Advertise → tldr.tech/sponsor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

export const tldrTechTools: NewsletterEvalCase = {
  id: "tldr-tech-tools",
  name: "TLDR Tech — Developer Tools Digest",
  description:
    "TLDR-style tech newsletter with 5 SaaS product mentions and 1 sponsor (Render). Tests product extraction with sponsor detection.",
  content: TLDR_TECH_CONTENT,
  newsletterId: "tldr-tech-001",
  expectedProducts: [
    { name: "Vercel",           category: "saas", required: true,  minStrength: "strong" },
    { name: "Supabase",         category: "saas", required: true,  minStrength: "strong" },
    { name: "Stripe",           category: "saas", required: true,  minStrength: "endorsed" },
    { name: "Anthropic Claude", category: "saas", required: true,  minStrength: "mentioned" },
    { name: "Posthog",          category: "saas", required: true,  minStrength: "mentioned" },
    { name: "Render",           category: "saas", required: false },
  ],
  expectedSponsors: [
    { name: "Render", required: true },
  ],
  maxCostUsd: 0.01,
};

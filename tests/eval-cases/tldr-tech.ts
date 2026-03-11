/**
 * Eval case: TLDR Tech — developer-focused tech newsletter with product announcements.
 * Source: Representative of TLDR format (tldr.tech public issues).
 * Known products: developer tools, AI platforms, infrastructure, open source.
 * Tests: technical product extraction, low sponsored content ratio, SaaS categorization.
 */

import type { NewsletterEvalCase } from "../eval-types.js";

export const tldrTechCase: NewsletterEvalCase = {
  id: "tldr-tech-dev-tools",
  name: "TLDR Tech — Developer Tools Issue",
  source: "TLDR Tech — public newsletter format (tldr.tech)",
  content: `
TLDR | TECH
Thursday, March 6, 2025

🔥 BIG TECH & STARTUPS

Anthropic released Claude 3.7 Sonnet with extended thinking. The model can reason for up
to 16,000 tokens before responding — useful for complex coding and math tasks. Available
via the Anthropic API ($3/M input tokens, $15/M output tokens). Early benchmarks show it
beating o3-mini on GPQA Diamond and outperforming on coding evals.

GitHub Copilot now supports Claude 3.7 Sonnet alongside GPT-4o and Google Gemini as
selectable models. Copilot Business seats ($19/month) now let teams pick their preferred
AI backbone. This is the first time GitHub has offered model choice at the subscription level.

🛠 DEVELOPER TOOLS

Cursor (the AI-first code editor) hit $100M ARR — faster than Stripe, Notion, or Figma
reached the same milestone. The editor charges $20/month for the Pro plan with unlimited
Claude and GPT-4o calls. They're now building multi-file and agent-mode editing.

Vercel released v0 2.0. The AI UI generator now supports React Server Components, full-stack
Next.js generation, and Shadcn UI. Free tier: 10 credits/day. Pro: $20/month for 1,000 credits.

Supabase raised $200M Series C. The open-source Firebase alternative now manages 1M+ databases.
Their Postgres-based backend with built-in auth, storage, and edge functions is the default
choice for many indie hackers and startups.

⚡ SPONSOR: Build AI-powered apps faster with Netlify

Netlify's new AI-assisted deployment pipeline catches build errors before they ship. Integrates
with GitHub, Vercel, and all major CI/CD tools. Try Netlify free for 14 days →

📊 SCIENCE & RESEARCH

A new paper on "Scaling Laws for Agent Performance" shows that agent task completion rate
scales predictably with compute — implying that longer context windows and more tool calls
improve performance linearly. The team used Claude and GPT-4o as base models.

QUICK LINKS

• Raycast now supports MCP tools — the macOS launcher is quietly becoming a power-user's
AI hub. Free to start, $8/month for Pro.
• Linear shipped new Git integration that auto-links PRs to issues across GitHub and GitLab.
• Sentry launched a new AI error triaging feature that suggests root causes. $26/seat/month.
`.trim(),
  expectedProducts: [
    { name: "Claude", category: "saas", required: true },
    { name: "GitHub Copilot", category: "saas", required: true },
    { name: "Cursor", category: "saas", required: true },
    { name: "Vercel", category: "saas", required: true },
    { name: "v0", category: "saas", required: false },
    { name: "Supabase", category: "saas", required: true },
    { name: "Netlify", category: "saas", required: false },
    { name: "Raycast", category: "saas", required: false },
    { name: "Sentry", category: "saas", required: false },
  ],
  maxTokens: 2500,
};

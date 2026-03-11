/**
 * Eval case: Morning Brew — daily business newsletter with sponsor-dense format.
 * Source: Representative of Morning Brew format (morningbrew.com public issues).
 * Known products: SaaS tools, fintech, consumer brands, sponsored CTA sections.
 * Tests: is_sponsored flag, mixed organic + sponsored product extraction, CPM estimation.
 */

import type { NewsletterEvalCase } from "../eval-types.js";

export const morningBrewCase: NewsletterEvalCase = {
  id: "morning-brew-saas-fintech",
  name: "Morning Brew — SaaS & Fintech Issue",
  source: "Morning Brew — public newsletter format (morningbrew.com)",
  content: `
MORNING BREW
Wednesday, March 5, 2025

TECH ROUNDUP

Notion just raised $100M at a $10B valuation — yes, the note-taking app. The company now
has 35M+ users and is pushing hard into AI with its "Notion AI" add-on ($10/month). For
teams already living in Notion, it's an obvious upsell. For everyone else, the question is
whether they want to pay the AI tax.

SPONSOR: This edition is brought to you by Brex.

Brex is the corporate card built for startups and growth companies. Get 10-15x higher limits
than traditional cards, automated expense management, and rewards that actually matter —
think AWS, Google Workspace, and Stripe credits. Sign up at brex.com/morningbrew for a
$500 bonus.

MARKETS

The market selloff continued Tuesday as investors rotate out of tech growth into dividend
payers. The S&P 500 dropped 1.2%. On the bright side, if you're sitting on cash and want
a 5.3% yield, Treasury bills are looking better than they have in 16 years. Apps like
Public.com now let you buy T-bills commission-free.

INVESTING READS

→ Dollar-cost averaging via Betterment is outperforming active management for the third
straight year in their annual report. Their robo-advisor now manages $35B.
→ Wealthfront's cash account still sitting at 5.0% APY — hard to beat for liquid savings.
→ PayPal is doubling down on Venmo monetization. Expect more sponsored "pay with Venmo"
buttons at checkout for major e-commerce brands.

QUICK HITS

• Figma's IPO paperwork officially filed. The design tool that Adobe tried to acquire
for $20B is going public. If you're not using Figma for product design in 2025, you're
probably using Canva — which is also reportedly eyeing an IPO.
• HubSpot launched HubSpot AI — an all-in-one marketing suite with AI content creation,
CRM automation, and email sequencing. Starting at $15/seat/month for the Starter tier.
• Linear, the project management tool beloved by engineering teams, hit 50k paying customers
while staying profitable and remote-first.
`.trim(),
  expectedProducts: [
    { name: "Notion", category: "saas", required: true },
    { name: "Notion AI", category: "saas", required: false },
    { name: "Brex", category: "saas", required: true },
    { name: "Public.com", category: "saas", required: false },
    { name: "Betterment", category: "saas", required: true },
    { name: "Wealthfront", category: "saas", required: false },
    { name: "Figma", category: "saas", required: true },
    { name: "Canva", category: "saas", required: false },
    { name: "HubSpot", category: "saas", required: false },
    { name: "Linear", category: "saas", required: false },
  ],
  maxTokens: 2500,
};

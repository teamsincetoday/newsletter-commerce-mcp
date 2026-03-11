/**
 * Eval case: Creator economy tools newsletter.
 *
 * Modeled on a creator-focused newsletter (Trends.vc / The Hustle style).
 * Ground truth: 5 product mentions, 0 sponsors.
 *
 * Expected products (required):
 *   - Beehiiv (saas, strong)
 *   - ConvertKit (saas, endorsed)
 *   - Gumroad (saas, endorsed)
 *   - Lemon Squeezy (saas, strong)
 *
 * Optional: Canva
 */

import type { NewsletterEvalCase } from "../types.js";

export const CREATOR_ECONOMY_CONTENT = `
THE CREATOR STACK — ISSUE #47
Tools for Solopreneurs and Newsletter Operators

══════════════════════════════════════════════════════════

THE NEWSLETTER PLATFORM WARS: WHO WINS IN 2026?

If you're building a newsletter in 2026, you have more options than ever
— and more confusion. Let me break down what's actually worth your time.

──────────────────────────────────────

BEEHIIV: THE PLATFORM TO BEAT

I switched to Beehiiv six months ago and the growth has been real.
The built-in referral program drove a 40% subscriber lift in my first
quarter with zero paid acquisition. The analytics dashboard is the best
in the industry — open rates, click maps, subscriber growth cohorts,
and revenue attribution all in one view.

If you're starting a newsletter today, start on Beehiiv. The free plan
is genuinely generous (up to 2,500 subscribers, unlimited sends). When
you grow, the monetization features — boosts, ad network, paid
subscriptions — are ready to go.

Get started: beehiiv.com

──────────────────────────────────────

CONVERTKIT: STILL GREAT FOR AUTOMATION PROS

ConvertKit (recently rebranded to Kit) remains the gold standard for
email automation sequences. The visual sequence builder and tagging
system are unmatched for creators who run courses, digital product
launches, or complex funnels. If you sell multiple products to different
audience segments, ConvertKit's conditional logic handles it cleanly.

The platform has been around long enough that most third-party tools
integrate natively. I use ConvertKit for automation-heavy campaigns even
though my main newsletter now lives on Beehiiv.

Learn more: kit.com

──────────────────────────────────────

SELLING YOUR STUFF: GUMROAD VS LEMON SQUEEZY

Gumroad has powered creator income for over a decade. It's dead-simple:
upload a file, set a price, share a link. The 10% cut is higher than
competitors, but the zero monthly fee model works well for low-volume
or sporadic product launches. I've used Gumroad for selling PDF guides,
preset packs, and templates — setup takes about five minutes.

Lemon Squeezy is the modern challenger and it's genuinely better for
SaaS-adjacent products. Lemon Squeezy handles VAT compliance, global
tax remittance, and EU digital services rules automatically — things
that Gumroad still requires you to manage yourself. The checkout
experience is cleaner and the affiliate program builder is excellent.
If you're selling anything with subscriptions or software licenses,
Lemon Squeezy is the right call.

Gumroad: gumroad.com
Lemon Squeezy: lemonsqueezy.com

──────────────────────────────────────

DESIGN WITHOUT A DESIGNER

For social graphics, cover images, and promotional assets, Canva
remains the fastest path for non-designers. The newsletter template
library has improved substantially and the Brand Kit feature keeps
colors and fonts consistent across every asset you create.

Not a recommendation to skip a professional designer for brand-defining
work — but for day-to-day creator content, Canva is the right tool.

──────────────────────────────────────

WHAT I USE (SHORT VERSION):
- Newsletter hosting: Beehiiv
- Email automation: ConvertKit
- Digital products: Lemon Squeezy (subscriptions), Gumroad (one-offs)
- Visuals: Canva

══════════════════════════════════════════════════════════
Reply to this email with questions. I read every one.
— Alex
══════════════════════════════════════════════════════════
`;

export const creatorEconomyTools: NewsletterEvalCase = {
  id: "creator-economy-tools",
  name: "Creator Economy — Newsletter & Monetization Tools",
  description:
    "Creator-focused newsletter reviewing newsletter platforms and digital commerce tools. No sponsors — pure editorial recommendations.",
  content: CREATOR_ECONOMY_CONTENT,
  newsletterId: "creator-economy-001",
  expectedProducts: [
    { name: "Beehiiv",       category: "saas", required: true,  minStrength: "strong" },
    { name: "ConvertKit",    category: "saas", required: true,  minStrength: "endorsed" },
    { name: "Gumroad",       category: "saas", required: true,  minStrength: "endorsed" },
    { name: "Lemon Squeezy", category: "saas", required: true,  minStrength: "strong" },
    { name: "Canva",         category: "saas", required: false, minStrength: "mentioned" },
  ],
  expectedSponsors: [],
  maxCostUsd: 0.01,
};

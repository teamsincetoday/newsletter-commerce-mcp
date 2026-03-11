/**
 * Eval case: Personal finance newsletter.
 *
 * Modeled on a personal finance roundup (The Motley Fool / NerdWallet style).
 * Ground truth: 5 product mentions, 1 sponsor (Betterment).
 *
 * Expected products (required):
 *   - YNAB (saas/service, strong)
 *   - Wealthfront (service, endorsed)
 *   - Robinhood (saas, mentioned)
 *
 * Optional: Acorns, Marcus Goldman Sachs
 * Sponsor: Betterment (required)
 */

import type { NewsletterEvalCase } from "../types.js";

export const FINANCE_PRODUCTS_CONTENT = `
MONEY MOVES WEEKLY — ISSUE #112
Personal Finance Tools Worth Your Attention

══════════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THIS WEEK'S SPONSOR: BETTERMENT

Betterment is the automated investing platform used by over 850,000
customers to grow their wealth on autopilot. Smart rebalancing,
tax-loss harvesting, and goal-based portfolios work in the background
so you don't have to think about it.

Open an account with no minimum balance → betterment.com/moneymoves
Use code MONEYMOVES for $0 management fees for 90 days.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BUDGETING TOOLS THAT ACTUALLY WORK

Every year I test the top budgeting apps and every year YNAB (You Need
A Budget) wins. The zero-based budgeting philosophy is genuinely
behavior-changing — you assign every dollar a job before you spend it.
Readers who've made the switch consistently report cutting discretionary
spending by 15–20% in the first three months.

YNAB costs $109/year and syncs with most major banks. The mobile app
is polished, the reports are detailed, and the learning curve is real
but worth it. I have been using it for four years and I still find
features I hadn't noticed. Strong recommend for anyone who wants to
get serious about their finances.

Try YNAB → ynab.com

──────────────────────────────────────

AUTOMATED INVESTING: WEALTHFRONT IS THE DEFAULT

For investors who want sophisticated portfolio management without
paying a human advisor 1% annually, Wealthfront is the benchmark.
The platform offers daily tax-loss harvesting, direct indexing for
taxable accounts over $100K, and a cash account yielding competitive
APY.

What separates Wealthfront from the competition is the financial
planning tool — it models retirement scenarios, home purchases, and
college savings in one integrated dashboard. It's the closest thing
to having a CFP on retainer without the price tag.

I use Wealthfront for my taxable investment account and have been
happy with both the returns and the tax alpha generated. It's my
default recommendation for new investors who want a set-and-forget
approach.

Open account: wealthfront.com

──────────────────────────────────────

ROUND-UP INVESTING: WORTH IT?

Acorns built a business on micro-investing — connecting your debit card
and rounding up every transaction to invest the spare change. The
concept is clever for building the habit of investing. Realistically,
round-ups won't retire you, but for true beginners who've never
invested before, Acorns removes the friction to get started. The
$3/month fee is high relative to small balances, but the behavioral
nudge has value.

──────────────────────────────────────

HIGH-YIELD SAVINGS UPDATE

Marcus by Goldman Sachs remains one of the strongest high-yield savings
rates among traditional banking institutions. No fees, FDIC insured,
and no minimum deposit. Not exciting, but reliable. Rates fluctuate
with the Fed — check current rate at marcus.com before committing.

──────────────────────────────────────

QUICK NOTE ON ROBINHOOD

Robinhood's recent push into retirement accounts (Roth IRA with 3%
match) has turned some heads. The match is competitive and the platform
is easy to use. That said, the research tools are thin compared to
Fidelity or Schwab, and the options fee structure has evolved.
Worth watching but not a primary recommendation from me yet.

══════════════════════════════════════════════════════════
Questions? Hit reply — I read every email.
Unsubscribe | Manage Preferences
══════════════════════════════════════════════════════════
`;

export const financeProducts: NewsletterEvalCase = {
  id: "finance-products",
  name: "Personal Finance — Tools & Investment Platforms",
  description:
    "Personal finance newsletter reviewing budgeting and investment tools. Includes one sponsor (Betterment) and editorial coverage of YNAB, Wealthfront, Robinhood, Acorns, and Marcus.",
  content: FINANCE_PRODUCTS_CONTENT,
  newsletterId: "finance-products-001",
  expectedProducts: [
    { name: "YNAB",               category: "saas",    required: true,  minStrength: "strong" },
    { name: "Wealthfront",        category: "service", required: true,  minStrength: "endorsed" },
    { name: "Robinhood",          category: "saas",    required: true,  minStrength: "mentioned" },
    { name: "Acorns",             category: "saas",    required: false, minStrength: "mentioned" },
    { name: "Marcus",             category: "service", required: false, minStrength: "mentioned" },
  ],
  expectedSponsors: [
    { name: "Betterment", required: true },
  ],
  maxCostUsd: 0.01,
};

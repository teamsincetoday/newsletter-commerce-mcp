/**
 * Eval case: Milk Road — crypto/fintech newsletter with affiliate-heavy format.
 * Source: Representative of Milk Road format (milkroad.com public issues).
 * Known products: crypto exchanges, DeFi protocols, wallets, fintech services.
 * Tests: fintech/crypto product extraction, affiliate_link detection, strong endorsements.
 */

import type { NewsletterEvalCase } from "../eval-types.js";

export const milkRoadCase: NewsletterEvalCase = {
  id: "milk-road-crypto-fintech",
  name: "Milk Road — Crypto & DeFi Issue",
  source: "Milk Road — public newsletter format (milkroad.com)",
  content: `
MILK ROAD
Friday, March 7, 2025

Crypto's heating up again. Here's what you need to know.

📈 THIS WEEK IN CRYPTO

Bitcoin broke $85K on Thursday — its highest level since the November 2024 bull run peak.
Analysts at Coinbase Institutional are calling for $100K by Q2 if ETF inflows maintain
their current pace of $500M+/week.

If you're looking to buy the dip on the way up, here are the exchanges we actually use:

→ Coinbase: easiest on-ramp for US customers. Lowest fees for stablecoins. Has the most
regulated trading pairs. Use code MILKROAD for $10 free BTC on your first trade.

→ Kraken Pro: best for active traders. Maker fees as low as 0.16%. Their OTC desk handles
trades $100K+. If you're serious about size, Kraken is where we'd go.

→ Gemini: best for institutional accounts. Their ActiveTrader platform has good charting
and $200M+ FDIC pass-through insurance on USD holdings.

💡 SPONSOR: Earn yield on your crypto with Aave

Aave is the largest DeFi lending protocol by TVL ($12B+). Deposit USDC and earn 5-8% APY.
No sign-up, no KYC, fully non-custodial. Connect your MetaMask or Coinbase Wallet and
you're earning in 5 minutes. aave.com/earn →

🔧 TOOLS WE'RE USING

Hardware wallets are having a moment. Here's our current stack:

• Ledger Nano X: best Bluetooth hardware wallet. Supports 5,500+ coins. $149 on ledger.com.
• Trezor Model T: open-source, privacy-first. Great for ETH heavy portfolios. $219.
• Rabby Wallet (browser extension): the MetaMask killer for DeFi power users. Free. Has
built-in transaction simulation so you can see what a contract will do before you sign.

📊 QUICK NUMBERS

• Ethereum gas fees down 70% since the Dencun upgrade — now averaging $0.03/tx on mainnet.
• Solana DEX volume hit $8B/day — outpacing Ethereum mainnet for the 3rd week running.
• Jupiter (Solana's main DEX aggregator) processed $2B in trades yesterday alone.
`.trim(),
  expectedProducts: [
    { name: "Coinbase", category: "service", required: true },
    { name: "Kraken", category: "service", required: true },
    { name: "Gemini", category: "service", required: false },
    { name: "Aave", category: "service", required: true },
    { name: "Ledger Nano X", category: "physical_goods", required: true },
    { name: "Trezor", category: "physical_goods", required: false },
    { name: "Rabby Wallet", category: "saas", required: false },
    { name: "MetaMask", category: "saas", required: false },
  ],
  maxTokens: 2500,
};

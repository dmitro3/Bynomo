# ☂️ BYNOMO

**The first on-chain binary options trading dapp.**

Available on **BNB**, **SOL**, **SUI**, **XLM**, **XTZ**, and **NEAR**.

Powered by **Pyth Hermes** price attestations + off-chain state (Supabase) + x402-style payments.

> *Trade binary options with oracle-bound resolution and minimal trust.*

---

## Why BYNOMO?

Binary options trading in the Web3 world barely existed; Web2 alternatives are often fraudulent and algorithmically biased. Real-time sub-second oracles were missing, creating a gap between demand and what was possible.

- **590M+** crypto users and **400M+** txns per day
- One news event, one big move, one crash — oracles and apps falter

**BYNOMO** closes that gap: every millisecond is tracked by Pyth oracles for real-time data.

---

## What BYNOMO Does

- **300+ assets** — Crypto, stocks, metals, forex on a real-time price chart  
- **Bet without signing every txn** — Unlimited trades, no cap amounts, one treasury  
- **Fast rounds** — 5s, 10s, 15s, 30s, 1m  
- **1–10x leverage** — Trade in open crypto markets  
- **Settlement in &lt;0.001 ms** — Like Web2 binary options, but on-chain and transparent  

---

## How It Works (5 Steps)

1. **Connect & fund** — User connects a wallet and moves tokens from their wallet into the BYNOMO (house) balance.  
2. **Choose mode & bet** — User selects **Classic** (up/down + expiry) or **Box** (multiplier tiles), then amount and direction/tile.  
3. **Resolution** — In Classic mode, the outcome is determined by price at expiry; in Box mode, the passing line must touch the chosen multiplier tile.  
4. **Balance update** — Profit or loss is applied to the user’s BYNOMO balance.  
5. **Withdraw** — User can withdraw; funds are sent from the treasury (net of profit/loss).  

---

## Market Opportunity

- **Binary options / prediction:** ~$27.56B (2025) → ~$116B by 2034 (19.8% CAGR)  
- **Crypto prediction markets:** $45B+ annual volume  
- **Crypto derivatives:** $86T+ annual volume (2025)  
- **Crypto users:** 590M+ worldwide  

---

## Future

Expansion into stocks, forex, options, derivatives, futures, and DEX integrations.

**Ultimate goal:** Become the go-to PolyMarket for binary options — on-chain, oracle-bound, and trust-minimized.

---

## Tech Stack

- **Frontend:** Next.js, React, Tailwind  
- **State:** Zustand, Supabase  
- **Prices:** Pyth Hermes  
- **Chains:** BNB (Wagmi/Privy), Solana, Sui, Stellar, Tezos, NEAR  

## Development

```bash
npm install --legacy-peer-deps
npm run dev
```

See `.env.example` for required environment variables.

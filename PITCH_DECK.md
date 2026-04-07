# Bynomo — Investor Pitch Deck

> **The first binary options trading dapp on-chain.**
> Live at [bynomo.fun](https://bynomo.fun) · Contact: bynomo.fun@gmail.com

---

## Slide 1 — Cover

```
BYNOMO

The first on-chain binary options trading platform.

Fast binary rounds · Pyth oracle pricing · 12 blockchains · Transparent settlement

bynomo.fun  ·  bynomo.fun@gmail.com  ·  @bynomofun
```

---

## Slide 2 — The Origin

In 2021, I saw a Binomo ad promoted by major influencers. I tried the paper mode — made 10× in a week. I put in three months of savings in real mode and lost everything.

Later I found Reddit threads showing that **Binomo ran algorithms that let users win in demo mode and lose in real mode**. This happened to millions of traders worldwide.

That day I decided to build the transparent, oracle-driven alternative.

> In 2021, sub-1-second on-chain price feeds didn't exist. I waited 5 years. In 2026 Pyth Hermes made it possible. **Bynomo is the result.**

---

## Slide 3 — The Problem

| # | Problem | Scale |
|---|---------|-------|
| 1 | **Web2 binary options are rigged** — Binomo, IQ Option, Quotex use proprietary algorithms that let users win in demo and lose in real mode | 590M+ crypto users, millions defrauded |
| 2 | **No credible Web3 binary options product exists** — the category is wide open at production level | $27.56B market growing at 19.8% CAGR |
| 3 | **Sub-1s oracle feeds didn't exist until 2025** — the technical blocker that made this impossible for 5 years has only just been removed | Pyth Hermes reached production maturity in 2025 |
| 4 | **DeFi trading is too complex** — funding rates, liquidation, wallet sigs per trade, complex UX | 400M daily on-chain transactions with no simple fast-trading product |

---

## Slide 4 — The Solution

**Bynomo is the first on-chain binary options platform with sub-5s oracle-settled rounds across 12 blockchains.**

| Principle | How |
|-----------|-----|
| **No manipulation** | All settlement driven by Pyth Hermes — a public, verifiable oracle feed. No proprietary algorithm. |
| **Instant trades** | No wallet signature per bet — bets are instant off-chain balance ops with on-chain deposit/withdrawal |
| **Simple UX** | Deposit → pick a mode → set amount → bet. Three clicks. Beginner-friendly. |
| **Fully transparent** | Every deposit, withdrawal, and payout is logged in an immutable audit trail |
| **12 blockchains** | SOL · BNB · SUI · NEAR · STRK · XLM · XTZ · INIT · OCT · PUSH · 0G · SOMNIA — one unified UI |

---

## Slide 5 — Product: How It Works

### 3-Step User Journey

```
Step 1 — Fund
Connect any wallet → send mainnet tokens to Bynomo treasury
→ balance credited instantly (Supabase, off-chain)

Step 2 — Trade
Pick a mode · set amount · confirm
No wallet signature needed per bet

Step 3 — Settle
Pyth Hermes resolves the outcome at expiry
Win → payout credited · Lose → house keeps stake
P&L off-chain (Supabase) · deposits/withdrawals on-chain
```

### Game Modes

| Mode | Mechanic | Win Condition |
|------|----------|--------------|
| **Box Mode** | Select a pre-drawn multiplier tile on the live chart | Tip of the green price line touches the tile's start within its price band |
| **Draw Mode** | Draw your own rectangle on the live chart — dynamic multiplier calculated instantly | Price line passes end-to-end through the drawn rectangle |
| **Classic Mode** | Pick UP or DOWN + multiplier + expiry time | Price at expiry is above (UP) or below (DOWN) the strike price |
| **Blitz Mode** | Pay a one-time on-chain entry fee | All multipliers boosted 2× for the 1-min active window |

---

## Slide 6 — Traction

> Product is **100% ready and live**. All numbers below are real, pre-public-launch.

### On-Chain (Solana)

| Metric | Value |
|--------|-------|
| Bets settled | **12,567+** |
| Total staked volume | **249.89 SOL ($46,258)** |
| Platform revenue (10% fee) | **~$4,600** |
| Unique wallets | **76** |
| Active price feeds | **28** |
| Avg session time (last 7 days) | **2h 8m** |

### Web & Community (Last 30 Days)

| Metric | Value |
|--------|-------|
| Users | **3,200+** |
| Page views | **6,600+** |
| Traffic growth | **+799%** |
| Engagement growth | **+774%** |

### Community (3 Days Organic — Before Live Link)

| Platform | Members |
|----------|---------|
| X / Twitter | **2,261** |
| Telegram | **900** |
| Discord | **260** |
| **Total** | **3,421+** |

### Other Signals

- Multiple tweets went viral before product launch
- **5+ blockchain ecosystems sent inbound offers** to deploy Bynomo natively on their chain
- Product fully built, audited internally, and deployed on Vercel across 12 chains

---

## Slide 7 — Market Opportunity

| Market | Size | Signal |
|--------|------|--------|
| Binary options / prediction | **$27.56B (2025) → ~$116B by 2034** (19.8% CAGR) | Long-term structural demand for fast binary outcome trading |
| Crypto prediction markets | **$45B+ annual volume** (Polymarket, Kalshi) | Liquidity appetite for oracle-driven prediction already proven |
| Crypto derivatives | **$86T+ annually (2025)** | Massive speculative trader base looking for simpler instruments |
| Global crypto users | **590M+** | Reachable audience with wallets already set up |

**Bynomo's wedge:** The only product that combines fast oracle-settled binary rounds + transparent settlement + beginner-friendly UX + 12 chains. The category has no incumbent.

---

## Slide 8 — Business Model

### Three Revenue Streams

| Stream | Mechanism | Rate |
|--------|-----------|------|
| **Platform fees** | 10% on every deposit + 10% on every withdrawal | Applied to all 12 chains |
| **House edge** | Multipliers set below fair-odds parity (e.g. 1.9× at 52.6% break-even) | Every losing bet is net revenue |
| **Blitz entry fees** | One-time flat fee per Blitz window, paid on-chain directly to fee collector | Per chain: 1 SOL · 0.1 BNB · 50 SUI · 400 XLM · 150 XTZ · 50 NEAR · 1500 STRK |

### Revenue Projections

| Monthly Bet Volume | Expected Monthly Revenue |
|-------------------|-------------------------|
| $5M | $250K – $500K |
| $20M | $400K – $2.0M |

### Unit Economics

| Metric | Conservative | Base Case | Optimistic |
|--------|-------------|-----------|------------|
| Revenue per active user/month | ~$11 | ~$32 | ~$90 |
| Marginal infra cost per user | <$0.10 | <$0.10 | <$0.10 |
| CAC (paid) | $15 | $8 | $4 |
| LTV / CAC | ~0.7× | ~4× | ~22× |

---

## Slide 9 — Competitive Landscape

Bynomo is the only production product offering oracle-settled binary rounds at **5s–1m timeframes across 12 blockchains in a single UI**. It sits at the intersection of three large markets but is a direct substitute for none of them — the category is entirely vacant at the Web3 level.

| Segment | Examples | Why They Can't Compete |
|---------|----------|------------------------|
| **Web2 binary options** | Binomo, IQ Option, Quotex | Opaque pricing, algorithmically rigged outcomes, no on-chain settlement; users do not custody funds. Their business model depends on opacity — they cannot go transparent. |
| **Crypto prediction markets** | Polymarket, Kalshi, Azuro | Event/outcome markets ("Will X happen?"), not sub-minute price binary options. Resolution takes hours or days, not 5s–1m. Architecturally incompatible with fast rounds. |
| **Crypto derivatives (CEX)** | Binance Futures, Bybit, OKX | Leveraged perpetuals with funding rates and liquidation risk. No fixed-expiry binary product. Regulatory overhead prevents fast pivots. |
| **On-chain options / DeFi** | Dopex, Lyra, Premia | Standard calls/puts with complex UX, high gas, long settlement. No simple "price up/down in 30s" binary product. |
| **Fast trading dapps** | Euphoria Fi | Mobile-first perps on a single chain — no fixed-expiry timeframes, no binary options loop. Building multi-chain from scratch = 6–12 months minimum. |
| **Web3 binary options** | — | No established on-chain binary options dapp exists at production level. **Bynomo fills this gap entirely.** |

---

## Slide 10 — Go-To-Market

### Target Users

| Segment | Who | Channel |
|---------|-----|---------|
| **DeFi-native traders** | Options/perps/DEX users seeking 5s–1m high-frequency instruments | X/Twitter, DeFi Discord/Telegram, KOLs |
| **Web2 binary options refugees** | Former Binomo/IQ Option users — 590M+ globally | Reddit, SEO, YouTube, paid |
| **Traders, Gamblers & Communities** | KOLs, trading groups, Telegram/Discord seeking gamified trading | Micro-influencers, viral PnL clips, ambassador program |
| **Chain ecosystem communities** | Every supported chain's regional groups, ecosystem projects, and executives | Per-chain foundation outreach, ecosystem hackathons |

### GTM Strategy

**Phase 1 — Public Launch (Now)**
- Viral X launch using the Euphoria Fi / MegaETH giveaway playbook — giveaway + word-of-mouth cascade
- Per-chain ecosystem blitz — regional community groups + executive retweets + every ecosystem project, repeated across all 12 chains
- 100 micro-influencer campaign (1K–20K followers) in trading/crypto/Web3 niches
- Short-form PnL clips + Blitz streak highlights engineered for X/Telegram virality
- Perpetual referral fee share — deep links into Classic and Box modes

**Phase 2 — Community Depth (Days 30–90)**
- Bynomo Ambassador Program — regional groups, trading tutorials, local language content
- Weekly Podcast / AMA Series on X with top traders
- Blitz tournament events with community prize pools
- Chain foundation grant applications (Solana, Sui, NEAR, Starknet Foundations)

**Phase 3 — Scale (Days 91–180)**
- P2P mode, 200+ assets, mobile app, affiliate/white-label, regional expansion

---

## Slide 11 — Roadmap

| Phase | Timeline | Key Deliverables |
|-------|----------|-----------------|
| **Phase 0 — Stability** ✅ | Complete | Core loop · admin dashboard · multi-chain deposit/withdraw · fee system |
| **Phase 1 — Public Launch** | Now | Viral launch · community seeding · referral program · per-chain ecosystem blitz |
| **Phase 2 — Community Depth** | Days 30–90 | Ambassador program · weekly X AMA · tournaments · leaderboards · chain grants |
| **Phase 3 — Scale** | Days 91–180 | P2P mode · 200+ assets · mobile app · CEX/wallet integrations · regional expansion |

### Post-Raise Product Milestones

| Milestone | With $500K | With $1.5M |
|-----------|------------|------------|
| Security audit | ✅ Complete in 60 days | ✅ Full audit + bug bounty |
| P2P mode | ✅ Beta in 90 days | ✅ Full launch |
| Mobile app | Partial PWA | ✅ Native app |
| Chain expansion | +3 chains | +8 chains |
| Team | 3–4 people | 6–8 people |

---

## Slide 12 — The Raise

### Round Overview

| Item | Detail |
|------|--------|
| **Round** | Pre-Seed |
| **Raising** | $500K – $1.5M |
| **Instrument** | SAFE (post-money cap) or token warrant |
| **Investor profile** | Crypto-native VC · ecosystem fund · strategic angel |

### Use of Funds

| Category | $500K | $1.5M | What Gets Built |
|----------|-------|-------|----------------|
| **Engineering** (50%) | $250K | $750K | Security audit · P2P mode · mobile app · 200+ Pyth assets · smart contract layer |
| **Growth & Marketing** (35%) | $175K | $525K | KOL campaigns · paid acquisition · Blitz tournament prize pools · referral incentives · chain grants co-funding |
| **Operations** (15%) | $75K | $225K | Legal entity · compliance · infra scaling · core team hires |

### Why Now

- **$27.56B market** growing at 19.8% CAGR — zero credible Web3 incumbent
- **Technical unlock** — Pyth Hermes sub-1s feeds only production-ready in 2025
- **Working product** — real deposits, real payouts, real on-chain settlement today
- **Organic traction** — 3,421 community members, 12,567 bets, $46K volume before public launch
- **Inbound demand** — 5+ chains offered to deploy Bynomo on their ecosystem
- **Bull market timing** — crypto retail volume surging; demand for fast trading instruments at peak

---

## Slide 13 — Team

> Available on request — bynomo.fun@gmail.com

---

## Slide 14 — Contact & Links

| | |
|---|---|
| **Product** | [bynomo.fun](https://bynomo.fun) |
| **Live trade** | [bynomo.fun/trade](https://bynomo.fun/trade) |
| **Demo video** | [youtu.be/t76ltZH9XSU](https://youtu.be/t76ltZH9XSU) |
| **X / Twitter** | [@bynomofun](https://x.com/bynomofun) |
| **Telegram** | [t.me/bynomo](https://t.me/bynomo) |
| **Discord** | [discord.gg/5MAHQpWZ7b](https://discord.gg/5MAHQpWZ7b) |
| **Email** | bynomo.fun@gmail.com |
| **Deck / data room** | Available on request |

---

*Bynomo — Like Binomo of Web2, but 10× better and fully on-chain.*

 'use client';

import type { Metadata } from 'next';
import MermaidDiagram from '@/components/ui/MermaidDiagram';
import { ProductHuntBadge } from '@/components/landing/ProductHuntBadge';

// NOTE: metadata moved to runtime UI in client mode.
const DEMO_VIDEO_EMBED = 'https://www.youtube.com/embed/pjFNfzP9laA?si=ORvaAt1pkN4REEWB';
const PITCH_DECK_EMBED =
  'https://docs.google.com/presentation/d/1kDVnUCeJ-LZ3dfpo_YsSqen6qSzlgzHFWFk79Eodj9A/embed?start=false&loop=false&delayms=3000';
const PROJECT_GITHUB = 'https://github.com/AmaanSayyad/Bynomo';
const BNB_MENTORSHIP_POST = 'https://x.com/draffilog/status/2027606703559348356?s=20';
const APPLIED_PROGRAMS = [
  {
    name: 'YZi Labs EASY Residency',
    href: 'https://www.yzilabs.com/',
    logo: '/logos/yzilabs.jpg',
  },
  {
    name: 'Alliance Accelerator',
    href: 'https://alliance.xyz/',
    logo: '/logos/alliance.jpg',
  },
  {
    name: 'Nitro Accelerator',
    href: 'https://nitroacc.xyz/',
    logo: '/logos/nitro.svg',
  },
  {
    name: 'Y Combinator',
    href: 'https://www.ycombinator.com/',
    logo: '/logos/Y-Combinator.png',
  },
];

const sections: Array<{ id: string; title: string; body: string[]; mermaid?: string }> = [
  {
    id: 'thesis',
    title: '1. Protocol Thesis',
    body: [
      'Bynomo exists to replace opaque Web2 binary-option rails with a deterministic, auditable, oracle-settled execution model.',
      'The protocol is intentionally hybrid: it combines DeFi infrastructure discipline, TradeFi market framing, Prediction-market outcome logic, GameFi interaction loops, and GambleFi entertainment velocity.',
      'The core product primitive is a short-duration directional market (5s to 60s windows) where users opt into fixed payoff logic instead of leverage-liquidation complexity.',
      'Design objective: combine low-latency market interaction with explicit settlement rules and transparent treasury accounting.',
      'This document treats Bynomo as a protocol system, not a marketing page.',
    ],
  },
  {
    id: 'origin-story',
    title: '1A. Origin Story',
    body: [
      'Bynomo started its deployment journey from the BNB Hackathon and was shaped with guidance from Lucas Liao (Solutions Architect @BNBChain) and Vlad Veselov (Business Developer @BNBChain).',
      'The founding execution model focused on high-frequency binary interactions with deterministic resolution and transparent settlement semantics.',
      'Early product framing combined protocol reliability, market speed, and a builder-first rollout strategy designed for measurable adoption on BNB Chain.',
      'Reference context is documented publicly in the linked post and reflected through the founder/advisor profiles on this page.',
    ],
  },
  {
    id: 'motivation',
    title: '2. Problem & Motivation',
    body: [
      'Current alternatives split into three unsatisfactory buckets: (a) opaque Web2 binaries, (b) slow-resolution prediction markets, and (c) high-complexity derivatives stacks.',
      'Retail users who want speed, clarity, and verifiable fairness often end up choosing between poor UX and poor trust assumptions.',
      'Bynomo targets this gap by enforcing oracle-bound resolution and reducing discretionary settlement logic.',
      'Founding motivation is rooted in direct user harm observed in legacy platforms and translated into a protocol-first architecture.',
    ],
  },
  {
    id: 'scope',
    title: '3. Scope & Product Surface',
    body: [
      'Market universe includes crypto, forex, metals, and equities references exposed as short-window directional rounds.',
      'Execution modes are tuned for fast interaction (classic/box-like quick rounds) with strict round boundaries and deterministic close conditions.',
      'The protocol monetizes through withdrawal fee bands and house edge calibration in payout multipliers.',
      'Roadmap extensions include additional strategy surfaces (e.g., bounded leverage variants) while preserving deterministic settlement guarantees.',
    ],
  },
  {
    id: 'system-architecture',
    title: '4. System Architecture',
    body: [
      'Bynomo is implemented as a layered protocol stack: execution UI, deterministic trade engine, chain adapter layer, persistence/audit layer, and treasury execution workers.',
      'Sensitive operations (admin actions, referral mutation, balance writes) are server-authorized and never trusted from client state.',
      'Supabase is the operational data plane with strict RLS and service-role isolation for privileged flows.',
      'Market data ingestion uses oracle/external feed normalization with timeout, retry, and stale-feed protection to preserve deterministic round boundaries.',
    ],
    mermaid: `flowchart LR
    U[Trader Wallet] --> FE[Next.js Client]
    FE --> API[Trade/Balance Route Handlers]
    API --> DB[(Supabase Postgres)]
    API --> ORACLE[Pyth Market Data Ingest]
    API --> ADAPTER[Chain Adapter Layer]
    ADAPTER --> TREASURY[Treasury Execution Backends]
    DB --> DASH[Admin Dashboard]
    API --> AUDIT[Audit Logs and Bet History and Withdrawals]`,
  },
  {
    id: 'multichain-topology',
    title: '5. Multi-Chain Topology & Adapter Pattern',
    body: [
      'Bynomo operates a chain-agnostic core with chain-specific adapter modules. The trade engine and risk engine are shared; signing, transfer semantics, and explorer linkage are delegated to adapters.',
      'Each supported network has an isolated treasury identity and execution backend, reducing cross-chain blast radius and enabling per-chain operational controls.',
      'Adapters normalize heterogeneous chains (EVM, Solana, Sui, Near, Stellar, Tezos, Starknet, Push, etc.) into a common execution contract: transfer, balance read, tx hash, and finality status.',
      'This architecture keeps protocol invariants consistent while allowing chain-native transaction paths.',
    ],
    mermaid: `flowchart TB
    CORE[Core Protocol Engine]
    CORE --> CA[Chain Adapter Interface]

    CA --> EVM[EVM Adapter]
    CA --> SOL[Solana Adapter]
    CA --> SUI[Sui Adapter]
    CA --> NEAR[Near Adapter]
    CA --> XLM[Stellar Adapter]
    CA --> XTZ[Tezos Adapter]
    CA --> STRK[Starknet Adapter]

    EVM --> T1[(EVM Treasury)]
    SOL --> T2[(Solana Treasury)]
    SUI --> T3[(Sui Treasury)]
    NEAR --> T4[(Near Treasury)]
    XLM --> T5[(Stellar Treasury)]
    XTZ --> T6[(Tezos Treasury)]
    STRK --> T7[(Starknet Treasury)]`,
  },
  {
    id: 'trade-lifecycle',
    title: '6. Trade Lifecycle & Settlement Semantics',
    body: [
      'Each round has a clearly defined open timestamp, lock timestamp, and settlement timestamp.',
      'Strike price and end price are derived from attested feed snapshots bound to round boundaries.',
      'Settlement path is binary and deterministic: payout = 0 on loss; payout = amount * multiplier on win.',
      'No hidden dealer discretion exists in round resolution when feed data is valid and within policy thresholds.',
    ],
    mermaid: `sequenceDiagram
    participant W as Wallet
    participant UI as Bynomo UI
    participant API as Trade API
    participant PF as Price Feed Layer
    participant DB as Postgres

    W->>UI: Choose asset/direction/amount/duration
    UI->>API: Place bet
    API->>DB: Persist pending bet + debit balance
    API->>PF: Read strike snapshot
    PF-->>API: strike price + timestamp
    API-->>UI: Bet accepted
    API->>PF: Read close snapshot at round end
    PF-->>API: end price + timestamp
    API->>DB: Resolve bet + write payout/audit
    API-->>UI: Result + updated balance`,
  },
  {
    id: 'risk-engine',
    title: '7. Risk Engine & Treasury Controls',
    body: [
      'Treasury risk is controlled through payout calibration, manual-review withdrawal thresholds, and account state gates (active/frozen/banned).',
      'Withdrawal requests pass a state machine with explicit accept/reject transitions and immutable audit trails.',
      'Protocol health monitoring focuses on edge drift, payout pressure, and per-asset volatility regimes.',
      'The risk objective is continuity first: avoid insolvency scenarios while preserving fair payout semantics.',
    ],
    mermaid: `stateDiagram-v2
    [*] --> Pending
    Pending --> Accepted: Admin approve and checks pass
    Pending --> Rejected: Admin reject or policy failure
    Accepted --> Executed: Treasury transfer succeeds
    Accepted --> Failed: Transfer or balance sync fails
    Failed --> Accepted: Retry path
    Executed --> [*]
    Rejected --> [*]`,
  },
  {
    id: 'crosschain-consistency',
    title: '8. Cross-Chain Consistency Model',
    body: [
      'The protocol applies event-sourced accounting: every balance mutation is paired with an immutable audit row keyed by operation type and tx hash.',
      'Write ordering follows a strict intent model: request accepted -> chain execution attempted -> ledger reconciliation -> terminal status.',
      'If chain execution succeeds but persistence fails (or vice versa), reconciliation workers converge state by replaying tx evidence and operation logs.',
      'Consistency target is operationally eventual with deterministic replayability, not blind optimistic finality.',
    ],
    mermaid: `sequenceDiagram
    participant API as API Handler
    participant AD as Chain Adapter
    participant CH as Target Chain
    participant DB as Ledger DB
    participant RC as Reconciliation Worker

    API->>DB: Write intent + pending operation
    API->>AD: Execute transfer(requestId)
    AD->>CH: Broadcast transaction
    CH-->>AD: txHash + status
    AD-->>API: execution result
    API->>DB: Commit terminal state + audit row
    DB-->>RC: emit for integrity checks
    RC->>DB: reconcile missing/partial transitions`,
  },
  {
    id: 'referrals',
    title: '9. Referral Integrity Model',
    body: [
      'Referral mutation is server-owned. Clients can request registration, but cannot directly mutate referral_count.',
      'Leaderboard-facing referral data is exposed as presentation-safe outputs, while core writes remain backend-restricted.',
      'All direct public-table mutation risks are mitigated through RLS deny-by-default + privileged service-role routes.',
      'This model prevents replay/patch abuse previously possible via open REST table writes.',
    ],
  },
  {
    id: 'security',
    title: '10. Security Architecture',
    body: [
      'Admin endpoints use server-side authentication and short-lived httpOnly signed session cookies.',
      'Browser hardening includes CSP, anti-clickjacking headers, strict content typing, and scoped permissions policies.',
      'Database hardening includes RLS on critical tables, privilege revocation for anon/authenticated roles, and service-role-only privileged operations.',
      'Sensitive state transitions (withdrawals, bans, status mutations) are authenticated, auditable, and constrained by role logic.',
    ],
    mermaid: `flowchart TD
    A[Client Request] --> B{Admin Session Cookie Valid}
    B -- No --> X[401 Unauthorized]
    B -- Yes --> C[Route Handler]
    C --> D{Policy Input Validation}
    D -- Fail --> Y[Reject and Log]
    D -- Pass --> E[Service Role DB and Treasury Action]
    E --> F[Audit Log Write]
    F --> G[Response]`,
  },
  {
    id: 'threats',
    title: '11. Threat Model (Practical)',
    body: [
      'Primary threats: unauthorized admin access, direct DB table abuse, payout manipulation attempts, and feed degradation under volatility spikes.',
      'Secondary threats: referral gaming, UI spoofing/clickjacking, and stale-cache induced misinterpretation of state.',
      'Mitigations map to control planes: identity controls, database controls, network/browser controls, and operational controls.',
      'Residual risk is documented and accepted only when compensating controls and monitoring are in place.',
    ],
    mermaid: `flowchart LR
    T((Bynomo Threat Surface))
    T --> A[Access Control]
    T --> D[Data Plane]
    T --> S[Settlement]
    T --> R[Treasury]

    A --> A1[Admin endpoint abuse]
    A --> A2[Session theft attempts]

    D --> D1[Open table writes]
    D --> D2[Unauthorized reads]

    S --> S1[Feed outage]
    S --> S2[Outlier spikes]

    R --> R1[Withdrawal abuse]
    R --> R2[State desync]`,
  },
  {
    id: 'economics',
    title: '12. Unit Economics & Revenue Model',
    body: [
      'Revenue components: (1) withdrawal fee take-rate and (2) realized house edge from payout calibration.',
      'Protocol-level expected gross take-rate is a function of round volume, win-rate distribution, and multiplier policy.',
      'Economic tuning must preserve user competitiveness while maintaining treasury solvency across volatility regimes.',
      'VIP/tiers can reduce withdrawal friction while shifting monetization weight toward sustained volume and retention.',
    ],
  },
  {
    id: 'market',
    title: '13. Market Positioning',
    body: [
      'Bynomo is positioned at the intersection of derivatives UX simplification and prediction-market speed.',
      'Category framing: DeFi x TradeFi x Prediction x GameFi x GambleFi.',
      'Competitive strategy is not to replicate complex derivatives terminals, but to dominate fast deterministic rounds with transparent settlement.',
      'Distribution strategy combines crypto-native channels (X/Telegram/communities), referral loops, and ecosystem-level partnerships.',
      'Long-term moat is execution quality + trust posture + treasury discipline, not short-term promotional spend.',
    ],
  },
  {
    id: 'roadmap',
    title: '14. Technical & Ecosystem Roadmap (0-3 Months)',
    body: [
      'Core execution shift: evolve classic mode from P2T (person-to-treasury) into P2P matching to minimize treasury directional risk; protocol monetization focuses on platform trading fees and withdrawal fees.',
      'Market expansion target: add 200+ additional tradable references (crypto, forex, stocks, commodities) for binary rounds, powered by Pyth price feeds and the existing normalization layer.',
      'Product UX target: mobile-first design parity so onboarding, charting, order entry, and settlement visibility work cleanly on handheld screens.',
      'Access model target: enable invite-only controls through access-code + referral mode with waitlist gating for staged rollout and abuse control.',
      'Multichain target: expand toward top high-usage chains in phased approvals, with a 3-month post-public-launch adoption window on BNB Chain before broader chain expansion decisions.',
      'Optional product extensions: leverage surfaces (1x-100x), trader profiles (highest PnL, best accuracy, most trades, biggest risk), tournaments, and social trading primitives (follow/copy/win-rate visibility).',
      'Observability extension: public dashboard track for total trades, volume, payouts, treasury balance, and win/loss ratio to increase operational transparency.',
      'Ecosystem growth plan (50% focus): micro-influencer program (1k-20k follower creators), public X launch playbook with giveaway-led virality, ambassador cohorts, invite-only access-code campaigns, referral-driven onboarding, and waitlist conversion.',
      'Optional ecosystem extension: launch of BYNOMO token on BNB Chain and weekly X podcast/AMA series with top traders for visibility acceleration.',
      '3-month product outcomes target: production-ready binary stack, full P2P mode implemented, and 200+ assets integrated.',
      '3-month growth outcomes target: 10,000+ users onboarded, 5,000+ active traders, and sustained trading activity on BNB Chain.',
      '3-month ecosystem impact target: establish a real-time binary trading use case on BNB Chain and position Bynomo among early high-activity Web3 trading dApps.',
    ],
  },
  {
    id: 'governance',
    title: '15. Governance & Transparency',
    body: [
      'Changes affecting settlement, treasury policy, or user permissions must be documented in release notes and reflected in this litepaper versioning.',
      'Incident response standards include rapid containment, public postmortem summaries, and control upgrades.',
      'Security reports are treated as first-class protocol inputs and integrated into engineering backlog with severity-based SLAs.',
      'Transparency is operational: logs, dashboards, and deterministic flow semantics reduce trust ambiguity.',
    ],
  },
  {
    id: 'disclosures',
    title: '16. Disclosures',
    body: [
      'This litepaper is a technical and product architecture document, not investment advice.',
      'Feature scope may evolve based on security, compliance, and infrastructure constraints.',
      'Availability may be restricted by jurisdiction; users are responsible for local regulatory obligations.',
      'Version updates supersede prior statements where architecture or policy changes are explicitly declared.',
    ],
  },
  {
    id: 'oracle-pipeline',
    title: '17. Oracle Normalization & Price Integrity',
    body: [
      'The price subsystem treats raw market feeds as untrusted until normalized through symbol mapping, feed-id canonicalization, timeout controls, and sanity bounds.',
      'Ingestion is chunked and parallelized to avoid single-request bottlenecks and long-tail timeout amplification under volatile market conditions.',
      'Each settlement round binds to deterministic snapshots (strike/end) and records temporal provenance to avoid post-hoc ambiguity.',
      'Outlier handling prioritizes integrity over speed: if feed confidence degrades beyond policy thresholds, the round is delayed or fails closed rather than settling on questionable data.',
      'Protocol-level rule: no payout transition may occur without an explicit, auditable price source path.',
    ],
    mermaid: `flowchart TB
    R[Raw Feed Responses] --> N1[Feed ID Canonicalization]
    N1 --> N2[Symbol and Asset Mapping]
    N2 --> Q{Integrity Checks}
    Q -->|timeout stale mismatch| H[Fail Closed Hold]
    Q -->|valid| N3[Strike & End Snapshot Binding]
    N3 --> L[Settlement Engine]
    L --> A[Audit Evidence + Round Trace]
    H --> A`,
  },
  {
    id: 'deterministic-invariants',
    title: '18. Deterministic Invariants',
    body: [
      'Invariant I1 (Balance Conservation): for a resolved bet, total debit/credit effects must equal the documented payout semantics and be represented in balance + audit planes.',
      'Invariant I2 (Single Terminal State): each withdrawal request has exactly one terminal status (`accepted` + executed, or `rejected`) after transition completion.',
      'Invariant I3 (No Unauthenticated Mutations): all privileged state transitions require validated server-side identity and policy checks.',
      'Invariant I4 (Replay Safety): repeated API submissions with the same logical operation must be idempotent or explicitly rejected with deterministic error codes.',
      'Invariant I5 (Traceability): every monetary state mutation is queryable via a stable correlation key (`bet_id`, `request_id`, `tx_hash`, or equivalent).',
      'Engineering implication: when uncertain, fail closed and preserve invariant integrity over partial liveness.',
    ],
  },
  {
    id: 'state-machine',
    title: '19. Protocol State Transition Model',
    body: [
      'Trade operations follow an explicit transition graph: Draft -> Accepted -> Settling -> Resolved. Illegal jumps are rejected.',
      'Balance-affecting transitions are written with causal ordering guarantees so reconciliation can rebuild exact operation history.',
      'A settlement operation must include both semantic state (won/lost, multiplier, net effect) and storage state (ledger + audit persistence).',
      'Administrative interventions are scoped to operational states and cannot rewrite historical settlement semantics.',
    ],
    mermaid: `stateDiagram-v2
    [*] --> Draft
    Draft --> Accepted: validation and balance debit
    Accepted --> Settling: round close window reached
    Settling --> ResolvedWon: end above strike by rule
    Settling --> ResolvedLost: inverse condition
    ResolvedWon --> [*]
    ResolvedLost --> [*]`,
  },
  {
    id: 'latency-slo',
    title: '20. Latency Budget, SLOs & Throughput',
    body: [
      'Bynomo is optimized for short-window rounds; therefore latency budgets are treated as first-class protocol constraints.',
      'Target decomposition: client submit latency, API validation latency, feed read latency, and persistence latency are independently monitored to isolate regressions.',
      'Backpressure strategy includes request caps, timeout-aware fallbacks, and stale-cache safeguards to prevent cascading degradation during volatility spikes.',
      'Operational SLOs are defined around settlement timeliness and correctness, not raw request throughput alone.',
      'A protocol can tolerate delayed rounds; it cannot tolerate incorrect settlement.',
    ],
    mermaid: `flowchart LR
    U[User Submit]
    V[API Validation]
    F[Feed Snapshot Read]
    P[Ledger Persistence]
    O[Outcome Render]
    M[SLO Monitor]
    G1[Rate Limit Guard]
    G2[Retry Budget Guard]
    G3[Delay Round Guard]
    G4[Fail Closed Guard]

    U --> V --> F --> P --> O --> M
    M -->|latency breach| G1
    M -->|timeout burst| G2
    M -->|feed instability| G3
    M -->|integrity risk| G4
    G1 --> V
    G2 --> F
    G3 --> O
    G4 --> O`,
  },
  {
    id: 'failure-recovery',
    title: '21. Failure Domains & Recovery Playbooks',
    body: [
      'Failure domains are separated by control plane: feed plane, execution plane, persistence plane, and treasury plane.',
      'Feed failures trigger settlement hold semantics; persistence failures trigger replay/reconciliation; treasury failures trigger retry workflows with terminal visibility.',
      'Recovery is evidence-driven: tx receipts, audit logs, and request lineage are used to converge state instead of manual balance edits.',
      'Playbooks are versioned and tested against realistic degraded scenarios (timeout storms, partial writes, chain congestion, and provider churn).',
      'Incident response emphasizes containment first, then deterministic recovery, then public postmortem transparency.',
    ],
    mermaid: `flowchart LR
    E[Execution Attempt] --> C1{Feed Healthy?}
    C1 -- No --> H[Hold Settlement]
    C1 -- Yes --> C2{DB Commit OK?}
    C2 -- No --> R1[Queue Reconciliation]
    C2 -- Yes --> C3{Treasury Transfer OK}
    C3 -- No --> R2[Retry and Manual Review]
    C3 -- Yes --> T[Terminal Success]
    R1 --> T2[State Convergence]
    R2 --> T2`,
  },
  {
    id: 'data-model',
    title: '22. Data Model & Auditability',
    body: [
      'Core tables are modeled around financial truth surfaces: balances, balance audit log, bet history, withdrawal requests, user profiles/referrals, and admin control planes.',
      'Write paths are intentionally denormalized where needed to preserve queryability for operations and incident response.',
      'Auditing strategy is append-oriented for history and mutation-oriented for current state, enabling both fast reads and forensic replay.',
      'Public exposure is restricted through RLS and scoped APIs; service-role paths are reserved for trusted backend execution.',
      'Data model principle: make the correct state easy to verify and the incorrect state difficult to produce silently.',
    ],
  },
  {
    id: 'box-multiplier',
    title: '23. Box Mode Multiplier Engine (Implementation Spec)',
    body: [
      'In Box mode, multiplier is not static and not fetched from an external API. It is generated per-cell in the chart engine at render-time, then passed into bet placement as part of targetId.',
      'Generation source: `components/game/LiveChart.tsx` creates grid cells and computes each cell multiplier from (a) price distance risk and (b) time distance bonus.',
      'Step 1 - price-distance base: if current price is inside a row band, base = 1.01 (near-min risk). Else compute normalized distance from current price and apply non-linear curve: base = 1.05 + pow(normalizedDist, 1.3) * 3.95.',
      'Step 2 - time bonus: cells farther in future columns get additive bonus: timeBonus = max(0, (colX - tipX) / 800) * 0.25.',
      'Step 3 - cap and format: calculated = min(base + timeBonus, 10.0) in normal mode; display formatted as fixed decimal string (e.g. 2.75x).',
      'Step 4 - Blitz optional boost: when Blitz is active + user eligible and cell condition matches (high-stake or lucky diagonal), multiplier is multiplied by blitzMultiplier and clamped to max 20.',
      'Placement path: clicking a cell builds targetId = `${UP|DOWN}-${cell.multiplier}-${timeframeSeconds}` and sends it into `placeBetFromHouseBalance()` in `lib/store/gameSlice.ts`.',
      'Persistence path: store parses targetId, extracts numeric multiplier, saves it to active bet state; on resolution payout = won ? amount * multiplier : 0.',
      'Therefore, the exact multiplier shown on the box cell is the same multiplier used in final payout math.',
    ],
    mermaid: `flowchart LR
    C[Grid Cell Candidate] --> P[Price-distance Base]
    P --> T[Time Bonus]
    T --> M[Normal Clamp Max 10]
    M --> B{Blitz Eligible}
    B -->|No| D[Display xN]
    B -->|Yes| X[Apply Blitz Multiplier]
    X --> C2[Clamp Max 20]
    C2 --> D
    D --> ID[targetId DIR multiplier seconds]
    ID --> S[placeBetFromHouseBalance]
    S --> R[resolveBet payout amount multiplied by multiplier if won]`,
  },
  {
    id: 'formal-spec',
    title: '24. Formal Spec (Pseudo-Math)',
    body: [
      'Let a bet b = (u, a, d, n, m, t_open, t_close) where u is user, a is asset, d in {UP, DOWN}, n is stake, m is payout multiplier, and [t_open, t_close] is the round window.',
      'Define strike S = P(a, t_open) and end E = P(a, t_close), where P is the normalized oracle price function constrained by feed-integrity policy.',
      'Outcome function O(b): for UP, O=1 iff E>S; for DOWN, O=1 iff E<S; otherwise O=0 (draw policy can be explicitly parameterized by market mode).',
      'Payout function: payout(b) = n*m if O=1, else 0. Net user PnL: pnl_u(b) = payout(b) - n. Protocol edge on b: edge(b) = n - payout(b).',
      'For any settled set B, aggregate edge: Edge(B) = Σ_{b∈B}(n_b - payout_b). Conservation constraint: Σ debits - Σ credits = Edge(B) over the same accounting domain and window.',
      'Withdrawal fee model: for withdrawal w with amount A and fee rate r, net transfer T = A*(1-r), fee F = A*r, with constraint A = T + F and A>0, 0<=r<1.',
      'Idempotency constraint: repeated submission of identical operation key k must satisfy apply(k, state) = apply(k, apply(k, state)).',
      'Terminal-state uniqueness: each withdrawal request id transitions to exactly one terminal class in {executed, rejected}.',
      'Audit traceability constraint: every monetary mutation x must map to at least one immutable evidence tuple (op_type, op_id, timestamp, amount_delta, tx_hash?).',
      'Safety-first rule: if oracle integrity predicate I(a,t)=false at required boundary points, settlement transition is blocked (fail-closed) until I is restored or manual policy path is invoked.',
    ],
  },
];

const sectionMap = Object.fromEntries(sections.map((s) => [s.id, s])) as Record<string, (typeof sections)[number]>;

const groupedFlow = [
  {
    title: 'Context & Strategic Premise',
    ids: ['thesis', 'origin-story', 'motivation', 'scope'],
  },
  {
    title: 'Execution & Settlement Engine',
    ids: ['system-architecture', 'multichain-topology', 'trade-lifecycle', 'risk-engine', 'crosschain-consistency'],
  },
  {
    title: 'Security, Integrity & Threats',
    ids: ['referrals', 'security', 'threats'],
  },
  {
    title: 'Economics, Market & Governance',
    ids: ['economics', 'market', 'roadmap', 'governance', 'disclosures'],
  },
  {
    title: 'Research Appendices',
    ids: ['oracle-pipeline', 'deterministic-invariants', 'state-machine', 'latency-slo', 'failure-recovery', 'data-model', 'box-multiplier', 'formal-spec'],
  },
];

export default function LitepaperPage() {
  return (
    <main className="lp-root min-h-screen text-white litepaper-dark">
      <div className="w-full px-6 py-16 lg:px-10">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-white/40">Official Technical Document</p>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h1
            className="text-4xl font-black uppercase tracking-tight text-white sm:text-5xl"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            Bynomo Litepaper
          </h1>
          <div className="flex items-center gap-2">
            <a
              href={PROJECT_GITHUB}
              target="_blank"
              rel="noreferrer"
              className="lp-chip rounded-full border border-white/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-white/80 hover:bg-white/10"
            >
              GitHub
            </a>
          </div>
        </div>
        <p className="mb-8 text-sm text-white/60">
          Version <span className="font-mono">v1.1.0</span> · Last updated{' '}
          <span className="font-mono">2026-04-01</span>
        </p>

        <div className="lp-panel mb-10 rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-5">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-violet-200/70">Mission</p>
          <p className="text-sm leading-7 text-white/80">
            Build a high-frequency, oracle-settled trading protocol that replaces opaque binary systems with deterministic,
            auditable execution.
          </p>
        </div>

        <div className="lp-panel mb-10 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-5 sm:p-6">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-amber-200/80">Origin Story</p>
          <p className="text-sm leading-7 text-white/80">
            Bynomo started its deployment journey from the BNB Hackathon, developed with guidance from Lucas Liao
            (Solutions Architect @BNBChain) and Vlad Veselov (Business Developer @BNBChain). The project direction,
            execution discipline, and protocol framing were shaped in that builder environment.
          </p>
          <a href={BNB_MENTORSHIP_POST} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-amber-200 underline">
            Reference post on X
          </a>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="lp-article rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="aspect-[4/5] overflow-hidden rounded-lg border border-white/10 bg-black/40">
                <img src="/logos/Lucas.JPEG" alt="Lucas Liao, Solutions Architect at BNBChain" className="h-full w-full scale-125 object-cover object-center" loading="lazy" />
              </div>
              <p className="mt-2 text-xs font-black uppercase tracking-wide text-white/85">Lucas Liao</p>
              <p className="text-[11px] text-white/60">Solutions Architect @BNBChain</p>
              <div className="mt-1 flex items-center gap-3 text-[11px]">
                <a href="https://www.linkedin.com/in/0x11a0/" target="_blank" rel="noreferrer" className="text-white/70 underline">LinkedIn</a>
                <a href="https://x.com/0xlucasliao" target="_blank" rel="noreferrer" className="text-white/70 underline">X</a>
              </div>
            </div>
            <div className="lp-article rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="aspect-[4/5] overflow-hidden rounded-lg border border-white/10 bg-black/40">
                <img src="/logos/Amaan.jpg" alt="Amaan pitching Bynomo" className="h-full w-full object-contain p-1" loading="lazy" />
              </div>
              <p className="mt-2 text-xs font-black uppercase tracking-wide text-white/85">Amaan Sayyad</p>
              <p className="text-[11px] text-white/60">Pitching Bynomo</p>
              <div className="mt-1 flex items-center gap-3 text-[11px]">
                <a href="https://www.linkedin.com/in/amaan-sayyad-/" target="_blank" rel="noreferrer" className="text-white/70 underline">LinkedIn</a>
                <a href="https://x.com/amaanbiz" target="_blank" rel="noreferrer" className="text-white/70 underline">X</a>
              </div>
            </div>
            <div className="lp-article rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="aspect-[4/5] overflow-hidden rounded-lg border border-white/10 bg-black/40">
                <img src="/logos/Vlad.JPEG" alt="Vlad Veselov, Business Developer at BNBChain" className="h-full w-full object-cover" loading="lazy" />
              </div>
              <p className="mt-2 text-xs font-black uppercase tracking-wide text-white/85">Vlad Veselov</p>
              <p className="text-[11px] text-white/60">Business Developer @BNBChain</p>
              <div className="mt-1 flex items-center gap-3 text-[11px]">
                <a href="https://x.com/draffilog" target="_blank" rel="noreferrer" className="text-white/70 underline">X</a>
              </div>
            </div>
          </div>
        </div>

        <div className="lp-panel mb-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-white/45">Media Room</p>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="lp-article rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Product Demo Video</p>
              <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
                <iframe
                  src={DEMO_VIDEO_EMBED}
                  title="Bynomo demo video"
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>

            <div className="lp-article rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                Initial Deck That BNB Liked
              </p>
              <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
                <iframe
                  src={PITCH_DECK_EMBED}
                  title="Bynomo initial deck"
                  className="h-[420px] w-full"
                  allowFullScreen
                />
              </div>
              <p className="mt-2 text-xs text-white/45">
                Prepared and presented in the presence of Lucas Liao (Solutions Architect @BNBChain){' '}
                <a href="https://x.com/0xlucasliao" target="_blank" rel="noreferrer" className="underline">
                  @0xlucasliao
                </a>{' '}
                and Vlad Veselov (Business Developer @BNBChain){' '}
                <a href="https://x.com/draffilog" target="_blank" rel="noreferrer" className="underline">
                  @draffilog
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="lp-panel mb-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-white/45">Applied For</p>
          <p className="mb-4 text-sm text-white/70">
            Bynomo has applied to the following accelerators/incubation programs.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {APPLIED_PROGRAMS.map((program) => (
              <a
                key={program.name}
                href={program.href}
                target="_blank"
                rel="noreferrer"
                className="lp-article rounded-xl border border-white/10 bg-black/30 p-4 hover:border-white/20"
              >
                <div className="mb-3 aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/40">
                  <img src={program.logo} alt={program.name} className="h-full w-full object-contain p-2" loading="lazy" />
                </div>
                <p className="text-xs font-black uppercase tracking-wide text-white/85">{program.name}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-4">
          {[
            ['Primary timeframes', '5s · 10s · 15s · 30s · 60s'],
            ['Asset surface', '300+ crypto, equities, metals, forex'],
            ['Monetization rails', 'Withdrawal fee bands + calibrated house edge'],
            ['Security posture', 'Admin auth + RLS + CSP + audit logs'],
          ].map(([k, v]) => (
            <div key={k} className="lp-panel rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{k}</p>
              <p className="mt-2 text-sm font-semibold text-white/85">{v}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lp-panel lg:sticky lg:top-20 lg:h-fit rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-white/45">Table of contents</p>
            <div className="space-y-5">
              {groupedFlow.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-violet-200/60">{group.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.ids.map((id) => (
                      <a
                        key={id}
                        href={`#${id}`}
                        className="lp-chip rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white/70 hover:bg-white/10"
                      >
                        {sectionMap[id].title.replace(/^\d+\.\s*/, '')}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-8">
            {groupedFlow.map((group) => (
              <section key={group.title} className="lp-panel rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
                <h2 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-violet-200/70">{group.title}</h2>
                <div className="grid gap-5 md:grid-cols-2">
                  {group.ids.map((id) => {
                    const section = sectionMap[id];
                    return (
                      <article
                        key={section.id}
                        id={section.id}
                        className={`lp-article min-w-0 rounded-xl border border-white/10 bg-black/30 p-5 ${section.mermaid ? 'md:col-span-2' : ''}`}
                      >
                        <h3 className="mb-3 text-base font-black uppercase tracking-wide text-white">{section.title}</h3>
                        <div className="space-y-3 break-words">
                          {section.body.map((paragraph) => (
                            <p key={paragraph} className="text-sm leading-7 text-white/75 break-words">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                        {section.mermaid && (
                          <div className="lp-diagram mt-5 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4">
                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Architecture Diagram</p>
                            <MermaidDiagram chart={section.mermaid} theme="dark" />
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
            <div className="lp-panel rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">Applied For</p>
              <p className="mt-1 text-xs text-white/60">Accelerators and incubation programs Bynomo has applied to.</p>
              <div className="lp-marquee-wrap mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <div className="lp-marquee-track flex w-max items-center">
                  {[0, 1].map((loop) => (
                    <div key={loop} className="flex items-center">
                      {APPLIED_PROGRAMS.map((program) => (
                        <a
                          key={`${loop}-${program.name}`}
                          href={program.href}
                          target="_blank"
                          rel="noreferrer"
                          className="mx-2 inline-flex min-w-[170px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 hover:border-white/20"
                        >
                          <img src={program.logo} alt={program.name} className="h-7 w-7 rounded object-contain bg-white/5 p-0.5" loading="lazy" />
                          <span className="text-[11px] font-semibold text-white/80">{program.name}</span>
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lp-panel rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">Project Repository</p>
              <a
                href={PROJECT_GITHUB}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-mono text-violet-300 underline"
              >
                {PROJECT_GITHUB}
              </a>
            </div>
            <div className="lp-panel rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-5 sm:p-6">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-amber-200/80">Founder Story</p>
              <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  <img src="/logos/Amaan-Sayyad.jpg" alt="Amaan Sayyad founder" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wide text-white">Amaan Sayyad</h3>
                  <p className="mt-2 text-sm leading-7 text-white/80">
                    An entrepreneur, growth hacker, serial builder, and someone who chose building over everything else.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm leading-7 text-white/75">
                    <li>- 5+ years in Web3 space; 15+ projects across DeFi, SocialFi, GameFi and GambleFi.</li>
                    <li>- Participated in 70+ hackathons and won 45+.</li>
                    <li>- Worked with 8 Web3 companies across development, advocacy and growth.</li>
                    <li>- Built communities, reviewed 500+ projects, and led grants-level execution.</li>
                  </ul>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
                    <a href="https://github.com/AmaanSayyad" target="_blank" rel="noreferrer" className="text-white/70 underline">GitHub</a>
                    <a href="https://amaan-sayyad-portfolio.vercel.app" target="_blank" rel="noreferrer" className="text-white/70 underline">Portfolio</a>
                    <a href="https://linkedin.com/in/amaan-sayyad-/" target="_blank" rel="noreferrer" className="text-white/70 underline">LinkedIn</a>
                    <a href="https://x.com/amaanbiz" target="_blank" rel="noreferrer" className="text-white/70 underline">X</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="py-24 px-10 border-t border-white/5 bg-black relative z-10 w-full overflow-hidden">
        <div className="huge-footer-logo">BYNOMO</div>

        <div className="flex w-full max-w-[1400px] mx-auto justify-center px-4 pt-8 pb-2">
          <ProductHuntBadge />
        </div>

        <div className="footer-meta">
          <div className="footer-meta-item">2026 © All rights reserved</div>

          <div className="footer-link-group">
            <a href="https://x.com/bynomofun" target="_blank" rel="noopener noreferrer" className="footer-meta-item">
              X / Twitter
            </a>
            <a href="https://linktr.ee/bynomo.fun" target="_blank" rel="noopener noreferrer" className="footer-meta-item">
              Linktree
            </a>
            <a href="https://github.com/AmaanSayyad/Bynomo" target="_blank" rel="noopener noreferrer" className="footer-meta-item">
              GitHub
            </a>
            <a href="https://t.me/bynomo" target="_blank" rel="noopener noreferrer" className="footer-meta-item">
              Telegram
            </a>
            <a href="https://discord.gg/5MAHQpWZ7b" target="_blank" rel="noopener noreferrer" className="footer-meta-item">
              Discord
            </a>
            <a
              href="https://bags.fm/Faw8wwB6MnyAm9xG3qeXgN1isk9agXBoaRZX9Ma8BAGS"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-meta-item"
            >
              Bags
            </a>
          </div>

          <div className="footer-link-group">
            <a href="#" className="footer-meta-item">
              Terms
            </a>
            <a href="#" className="footer-meta-item">
              Privacy
            </a>
            <a href="#" className="footer-meta-item">
              Cookies
            </a>
          </div>
        </div>
      </footer>
      <style jsx global>{`
        .litepaper-dark {
          background: #02040a;
          color: #e5e7eb;
        }
        .lp-marquee-track {
          animation: lp-applied-scroll 24s linear infinite;
        }
        .huge-footer-logo {
          font-size: clamp(5rem, 15vw, 15rem);
          font-weight: 950;
          letter-spacing: -0.06em;
          line-height: 0.8;
          text-align: center;
          width: 100%;
          margin-bottom: 80px;
          background: linear-gradient(180deg, #fff 40%, rgba(255, 255, 255, 0.05) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-family: var(--font-orbitron);
        }
        .footer-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding-top: 40px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .footer-meta-item {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: rgba(255, 255, 255, 0.2);
        }
        .footer-link-group {
          display: flex;
          gap: 32px;
        }
        .footer-link-group a {
          color: rgba(255, 255, 255, 0.2);
          transition: color 0.3s ease;
        }
        .footer-link-group a:hover {
          color: #fff;
        }
        @media (max-width: 768px) {
          .footer-meta {
            flex-direction: column;
            gap: 30px;
            text-align: center;
          }
          .footer-link-group {
            flex-wrap: wrap;
            justify-content: center;
            gap: 16px;
          }
        }
        .lp-marquee-wrap:hover .lp-marquee-track {
          animation-play-state: paused;
        }
        @keyframes lp-applied-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </main>
  );
}


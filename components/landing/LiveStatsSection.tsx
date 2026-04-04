'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Wallet,
  Users,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PublicStats {
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalWagered: number;
  totalPaidOut: number;
  uniqueWallets: number;
  chainsActive: number;
  totalDeposits: number;
  topCurrencies: { currency: string; wagered: number; paid: number; count: number }[];
  houseBalanceByCurrency: Record<string, number>;
}

// ─── Animated Counter ───────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1800, started = false) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (!started || target === 0) return;
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    }

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration, started]);

  return value;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  accent: string;
  accentSoft: string;
  phase: string;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  description: string;
  icon: LucideIcon;
  index: number;
  started: boolean;
  children?: React.ReactNode;
}

function StatCard({
  accent, accentSoft, phase, label, value, suffix = '', decimals = 0,
  description, icon: Icon, index, started, children,
}: StatCardProps) {
  const count = useCountUp(value, 1600, started);
  const display = decimals > 0
    ? (count / Math.pow(10, decimals)).toFixed(decimals)
    : fmt(count);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      <article
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0b12]/90 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-[transform,border-color,box-shadow] duration-300 lg:rounded-3xl lg:p-7 lg:hover:-translate-y-1 lg:hover:border-white/[0.13] lg:hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_32px_70px_-36px_rgba(0,0,0,0.95)]"
      >
        {/* Corner glow */}
        <div
          className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-30"
          style={{ background: accent }}
          aria-hidden
        />
        {/* Subtle inner light */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent"
          aria-hidden
        />
        {/* Left accent bar */}
        <div
          className="absolute bottom-6 left-0 top-6 w-[3px] rounded-full"
          style={{
            background: `linear-gradient(180deg, ${accent}, ${accent}55)`,
            boxShadow: `0 0 18px ${accentSoft}`,
          }}
          aria-hidden
        />

        <div className="relative z-[1] flex flex-1 flex-col gap-5 pl-5">
          {/* Top row: icon + phase label */}
          <div className="flex items-center justify-between gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] transition-transform duration-300 group-hover:scale-[1.06]"
              style={{
                backgroundColor: accentSoft,
                boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.09), 0 8px 24px -8px ${accent}`,
              }}
            >
              <Icon className="h-5 w-5" style={{ color: accent }} strokeWidth={1.7} aria-hidden />
            </div>

            <span
              className="inline-flex rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] ring-1 ring-inset ring-white/[0.07]"
              style={{ backgroundColor: accentSoft, color: accent }}
            >
              {phase}
            </span>
          </div>

          {/* Big number */}
          <div>
            <div
              className="font-black leading-none tabular-nums text-white"
              style={{
                fontFamily: 'var(--font-orbitron), monospace',
                fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                textShadow: `0 0 40px ${accent}50`,
              }}
            >
              {display}
              {suffix && (
                <span className="ml-1 text-[0.55em] font-extrabold" style={{ color: accent }}>
                  {suffix}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] font-semibold tracking-tight text-white/40">
              {label}
            </p>
          </div>

          {/* Custom children (e.g. bar) */}
          {children}

          {/* Description */}
          <p className="mt-auto text-[12px] leading-[1.65] text-white/40 sm:text-[13px]">
            {description}
          </p>
        </div>

        {/* Bottom edge shine on hover */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />
      </article>
    </motion.div>
  );
}

// ─── Win / Loss Bar ───────────────────────────────────────────────────────────

function WinLossBar({ wins, losses, started }: { wins: number; losses: number; started: boolean }) {
  const total = wins + losses || 1;
  const winPct = (wins / total) * 100;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!started) return;
    const t = setTimeout(() => setWidth(winPct), 300);
    return () => clearTimeout(t);
  }, [started, winPct]);

  return (
    <div className="space-y-2.5">
      {/* Bar */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-[1400ms] ease-out"
          style={{
            width: `${width}%`,
            background: 'linear-gradient(90deg, #10b981, #6ee7b7)',
            boxShadow: '0 0 12px rgba(16,185,129,0.6)',
          }}
        />
        <div
          className="absolute top-0 h-full rounded-full transition-[left,width] duration-[1400ms] ease-out"
          style={{
            left: `${width}%`,
            width: `${100 - width}%`,
            background: 'linear-gradient(90deg, #ef444455, #ef444433)',
          }}
        />
      </div>
      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] font-bold tabular-nums">
        <span className="flex items-center gap-1.5 text-emerald-400/80">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {fmt(wins)} wins
        </span>
        <span className="flex items-center gap-1.5 text-red-400/70">
          {fmt(losses)} losses
          <span className="h-1.5 w-1.5 rounded-full bg-red-400/70" />
        </span>
      </div>
    </div>
  );
}

// ─── Treasury Badges ─────────────────────────────────────────────────────────

const CURRENCY_ACCENT: Record<string, string> = {
  SOL:   '#9945FF',
  USDC:  '#2775CA',
  BNB:   '#F0B90B',
  ETH:   '#627EEA',
  SUI:   '#6fbcf0',
  NEAR:  '#00EC97',
  BYNOMO:'#10b981',
};

function TreasuryBadges({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data)
    .filter(([, v]) => v > 0.0001)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (entries.length === 0) {
    return <p className="text-[12px] text-white/25 italic">Treasury data loading…</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([cur, bal]) => {
        const color = CURRENCY_ACCENT[cur.toUpperCase()] ?? '#a855f7';
        return (
          <span
            key={cur}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ring-white/[0.06]"
            style={{ background: `${color}18`, color }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: color, boxShadow: `0 0 6px ${color}` }}
            />
            {cur.toUpperCase()}
            <span className="font-mono text-[10px] tabular-nums text-white/50">
              {bal >= 1000 ? fmt(Math.round(bal)) : bal.toFixed(2)}
            </span>
          </span>
        );
      })}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

const CARDS = [
  {
    key: 'trades',
    phase: 'TRADE VOLUME',
    label: 'Total Rounds Played',
    accent: '#3b82f6',
    accentSoft: 'rgba(59,130,246,0.13)',
    icon: BarChart3,
    description: 'Every prediction round resolved on-chain across all supported assets and chains.',
  },
  {
    key: 'winrate',
    phase: 'WIN / LOSS',
    label: 'Platform Win Rate',
    accent: '#a855f7',
    accentSoft: 'rgba(168,85,247,0.13)',
    icon: Trophy,
    description: 'Aggregate win rate across all real-money rounds since genesis.',
  },
  {
    key: 'payouts',
    phase: 'PAYOUTS',
    label: 'Winning Rounds',
    accent: '#10b981',
    accentSoft: 'rgba(16,185,129,0.13)',
    icon: TrendingUp,
    description: 'Total rounds where the house paid out a winning position to the trader.',
  },
  {
    key: 'deposits',
    phase: 'TREASURY FLOW',
    label: 'Deposits Processed',
    accent: '#f59e0b',
    accentSoft: 'rgba(245,158,11,0.13)',
    icon: Wallet,
    description: 'On-chain deposit transactions confirmed and credited to house balances.',
  },
  {
    key: 'wallets',
    phase: 'COMMUNITY',
    label: 'Unique Traders',
    accent: '#06b6d4',
    accentSoft: 'rgba(6,182,212,0.13)',
    icon: Users,
    description: `Distinct wallets that have placed at least one real-money round.`,
  },
] as const;

export default function LiveStatsSection() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.15 });

  useEffect(() => {
    fetch('/api/stats/public')
      .then(r => r.json())
      .then(setStats)
      .catch(() => null);
  }, []);

  const s = stats ?? {
    totalBets: 0, totalWins: 0, totalLosses: 0, winRate: 0,
    totalWagered: 0, totalPaidOut: 0, uniqueWallets: 0,
    chainsActive: 12, totalDeposits: 0, totalWithdrawals: 0,
    topCurrencies: [], houseBalanceByCurrency: {},
  };

  const cardValues: Record<string, number> = {
    trades:   s.totalBets,
    winrate:  Math.round(s.winRate * 10),
    payouts:  s.totalWins,
    deposits: s.totalDeposits,
    wallets:  s.uniqueWallets,
  };

  const started = inView && stats !== null;

  return (
    <section
      ref={sectionRef}
      className="relative border-t border-white/[0.05] bg-[#02040a]"
      aria-labelledby="stats-heading"
    >
      {/* Background ambiance */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-blue-600/[0.04] blur-[140px]" />
        <div className="absolute -bottom-40 left-0 h-[400px] w-[500px] rounded-full bg-purple-600/[0.04] blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[400px] w-[500px] rounded-full bg-emerald-600/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 py-28 sm:px-10 lg:py-36">

        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14 sm:mb-16 lg:mb-20"
        >
          <p className="mb-4 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
            ● Protocol Analytics
          </p>
          <h2
            id="stats-heading"
            className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl"
            style={{ fontFamily: 'var(--font-orbitron), system-ui, sans-serif' }}
          >
            Platform{' '}
            <span
              className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent"
              style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Intelligence
            </span>
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/45">
            Real-time metrics sourced directly from the BYNOMO protocol. Every number is backed by on-chain data.
          </p>
        </motion.div>

        {/* 5 stat cards — top row 3, bottom row 2 */}
        <div className="space-y-5 sm:space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7">
            {CARDS.slice(0, 3).map((card, i) => (
              <StatCard
                key={card.key}
                index={i}
                accent={card.accent}
                accentSoft={card.accentSoft}
                phase={card.phase}
                label={card.label}
                icon={card.icon}
                description={card.description}
                started={started}
                value={cardValues[card.key]}
                suffix={card.key === 'winrate' ? '%' : ''}
                decimals={card.key === 'winrate' ? 1 : 0}
              >
                {card.key === 'winrate' && (
                  <WinLossBar wins={s.totalWins} losses={s.totalLosses} started={started} />
                )}
              </StatCard>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:gap-7">
            {CARDS.slice(3).map((card, i) => (
              <StatCard
                key={card.key}
                index={i + 3}
                accent={card.accent}
                accentSoft={card.accentSoft}
                phase={card.phase}
                label={card.label}
                icon={card.icon}
                description={card.description}
                started={started}
                value={cardValues[card.key]}
              />
            ))}
          </div>
        </div>

        {/* Treasury row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 sm:mt-8"
        >
          <article
            className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0b12]/90 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-[border-color] duration-300 lg:rounded-3xl lg:p-7 lg:hover:border-white/[0.12]"
          >
            {/* glow */}
            <div
              className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full opacity-15 blur-3xl transition-opacity duration-500 group-hover:opacity-25"
              style={{ background: '#f59e0b' }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent"
              aria-hidden
            />
            {/* accent bar */}
            <div
              className="absolute bottom-6 left-0 top-6 w-[3px] rounded-full"
              style={{
                background: 'linear-gradient(180deg, #f59e0b, #f59e0b55)',
                boxShadow: '0 0 18px rgba(245,158,11,0.3)',
              }}
              aria-hidden
            />

            <div className="relative z-[1] pl-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span
                    className="mb-2 inline-flex rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] ring-1 ring-inset ring-white/[0.07]"
                    style={{ backgroundColor: 'rgba(245,158,11,0.13)', color: '#f59e0b' }}
                  >
                    Treasury Balance
                  </span>
                  <h3
                    className="text-lg font-black leading-snug tracking-tight text-white sm:text-xl"
                    style={{ fontFamily: 'var(--font-orbitron), system-ui, sans-serif' }}
                  >
                    House Custody — by Chain
                  </h3>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"
                    style={{ boxShadow: '0 0 6px rgba(52,211,153,0.8)' }}
                  />
                  <span className="text-[11px] font-semibold text-white/40">Live</span>
                </div>
              </div>

              <TreasuryBadges data={s.houseBalanceByCurrency} />

              <p className="mt-4 text-[12px] leading-relaxed text-white/30">
                Total funds currently custodied in the BYNOMO treasury across all supported chains. Balances reflect deposited assets not yet withdrawn.
              </p>
            </div>

            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
          </article>
        </motion.div>

        {/* Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 text-center text-[11px] font-medium tracking-wide text-white/20"
        >
          Updated every 5 minutes from on-chain protocol data · Demo bets excluded
        </motion.p>
      </div>
    </section>
  );
}

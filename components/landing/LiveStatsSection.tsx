'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface PlatformStats {
  totalBets: number;
  uniqueWallets: number;
  chainsSupported: number;
  totalDeposits: number;
  winRate: number;
}

function useCountUp(target: number, duration = 1800, started = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!started || target === 0) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, started]);
  return value;
}

function StatCard({
  label,
  value,
  suffix = '',
  prefix = '',
  description,
  accent,
  started,
}: {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  description: string;
  accent: string;
  started: boolean;
}) {
  const count = useCountUp(value, 1600, started);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-6 py-7 backdrop-blur-sm overflow-hidden"
    >
      {/* Accent glow */}
      <div
        className="pointer-events-none absolute -top-10 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full blur-[60px] opacity-30"
        style={{ background: accent }}
      />

      <span
        className="font-mono text-[10px] font-black uppercase tracking-[0.25em]"
        style={{ color: accent }}
      >
        {label}
      </span>

      <div className="flex items-end gap-1 leading-none">
        {prefix && (
          <span className="font-mono text-2xl font-black text-white/60 mb-0.5">{prefix}</span>
        )}
        <span className="font-mono text-4xl font-black text-white tabular-nums">
          {count.toLocaleString()}
        </span>
        {suffix && (
          <span className="font-mono text-2xl font-black text-white/60 mb-0.5">{suffix}</span>
        )}
      </div>

      <p className="text-[11px] text-white/35 leading-relaxed">{description}</p>
    </motion.div>
  );
}

export default function LiveStatsSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  useEffect(() => {
    fetch('/api/stats/public')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const s = stats ?? { totalBets: 0, uniqueWallets: 0, chainsSupported: 12, totalDeposits: 0, winRate: 0 };
  const started = inView && !!stats;

  const statCards = [
    {
      label: 'Rounds Played',
      value: s.totalBets,
      suffix: '+',
      description: 'Real on-chain prediction rounds executed across all chains.',
      accent: '#a78bfa',
    },
    {
      label: 'Unique Wallets',
      value: s.uniqueWallets,
      suffix: '+',
      description: 'Distinct wallet addresses that have traded on Bynomo.',
      accent: '#34d399',
    },
    {
      label: 'Chains Supported',
      value: s.chainsSupported,
      description: 'Mainnet & ecosystem chains live — deposit and play natively.',
      accent: '#60a5fa',
    },
    {
      label: 'Deposits Made',
      value: s.totalDeposits,
      suffix: '+',
      description: 'Confirmed on-chain deposits processed through the treasury.',
      accent: '#f59e0b',
    },
  ];

  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] bg-[#02040a] py-16 sm:py-20 lg:py-24">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[350px] w-[700px] -translate-x-1/2 rounded-full bg-purple-600/[0.04] blur-[120px]" />

      <div ref={ref} className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 sm:mb-12 text-center"
        >
          <div className="mb-3 flex items-center justify-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-white/25">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
            Live platform data
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
          </div>
          <h2
            className="mb-3 text-2xl min-[400px]:text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tighter text-white"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            By the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-purple-400">
              numbers
            </span>
          </h2>
          <p className="mx-auto max-w-lg text-[11px] sm:text-sm font-bold uppercase tracking-wide text-white/35 leading-relaxed">
            Real-time stats pulled directly from our on-chain treasury and smart contracts.
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 sm:gap-5">
          {statCards.map((card, i) => (
            <StatCard key={card.label} {...card} started={started} />
          ))}
        </div>

        {/* Live pulse indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-6 flex items-center justify-center gap-2"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/20">
            Updated every 5 minutes from on-chain data
          </span>
        </motion.div>
      </div>
    </section>
  );
}

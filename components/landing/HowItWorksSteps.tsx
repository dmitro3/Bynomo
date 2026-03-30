'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Wallet,
    LayoutGrid,
    Scale,
    Zap,
    ChevronDown,
    type LucideIcon,
} from 'lucide-react';

const STEPS: {
    id: string;
    phase: string;
    title: string;
    description: string;
    accent: string;
    accentSoft: string;
    icon: LucideIcon;
}[] = [
    {
        id: '01',
        phase: 'LIQUIDITY INJECTION',
        title: 'Neural Link & Deposit',
        description:
            'Connect your wallet and deposit to the BYNOMO treasury. Once recorded, your balance updates in the house balance (Supabase) so you can bet instantly without on-chain bet transactions.',
        accent: '#3b82f6',
        accentSoft: 'rgba(59, 130, 246, 0.14)',
        icon: Wallet,
    },
    {
        id: '02',
        phase: 'PREDICTIVE ANALYSIS',
        title: 'Choose Your Game Mode',
        description:
            'Pick from Classic, Box, or Draw. Classic is up/down with fixed 2x logic; Box targets a price range with higher multipliers; Draw uses your custom drawn zone as the win condition.',
        accent: '#a855f7',
        accentSoft: 'rgba(168, 85, 247, 0.14)',
        icon: LayoutGrid,
    },
    {
        id: '03',
        phase: 'MATCHING ENGINE',
        title: 'Mode-Specific Settlement',
        description:
            'At expiry, BYNOMO resolves from oracle prices by mode: Classic checks direction, Box checks whether the close lands inside your box, and Draw checks your drawn region. Results and payouts are posted to history.',
        accent: '#f59e0b',
        accentSoft: 'rgba(245, 158, 11, 0.14)',
        icon: Scale,
    },
    {
        id: '04',
        phase: 'INSTANT SETTLEMENT',
        title: 'Atomic Payouts',
        description:
            'At round completion, wins credit to your house balance immediately (no on-chain bet settlement to wait for). When you withdraw, the treasury sends funds on-chain and your house balance updates.',
        accent: '#10b981',
        accentSoft: 'rgba(16, 185, 129, 0.14)',
        icon: Zap,
    },
];

const ROWS: (typeof STEPS)[] = [STEPS.slice(0, 2), STEPS.slice(2, 4)];

function StepCard({
    step,
    globalIndex,
}: {
    step: (typeof STEPS)[number];
    globalIndex: number;
}) {
    const Icon = step.icon;
    return (
        <motion.li
            // Never leave items invisible on mobile scroll.
            // `#how-it-works` uses `overflow-hidden`, and the old `opacity: 0` + negative
            // viewport margin could prevent IntersectionObserver from firing in time.
            initial={{ opacity: 1, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{
                duration: 0.52,
                delay: globalIndex * 0.06,
                ease: [0.16, 1, 0.3, 1],
            }}
            className="min-w-0"
        >
            <article
                className="group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b12]/90 p-5 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.92)] backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-300 sm:p-6 lg:rounded-3xl lg:p-7 lg:hover:-translate-y-1 lg:hover:border-white/[0.12] lg:hover:shadow-[0_32px_70px_-36px_rgba(0,0,0,0.95)]"
                style={{
                    boxShadow:
                        'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(0,0,0,0.4)',
                }}
            >
                <div
                    className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full opacity-[0.28] blur-3xl transition-[opacity,transform] duration-500 group-hover:opacity-[0.42] group-hover:scale-105"
                    style={{ background: step.accent }}
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent"
                    aria-hidden
                />

                <div
                    className="absolute bottom-5 left-0 top-5 w-1 rounded-full sm:bottom-6 sm:top-6"
                    style={{
                        background: `linear-gradient(180deg, ${step.accent}, ${step.accent}88)`,
                        boxShadow: `0 0 28px ${step.accentSoft}`,
                    }}
                    aria-hidden
                />

                <div className="relative z-[1] flex flex-1 flex-col gap-3.5 pl-4 sm:gap-4 sm:pl-5 lg:gap-5">
                    <div className="flex items-start justify-between gap-3">
                        <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] transition-transform duration-300 group-hover:scale-[1.06] group-hover:border-white/15 sm:h-[3.25rem] sm:w-[3.25rem]"
                            style={{
                                backgroundColor: step.accentSoft,
                                boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.1), 0 10px 32px -10px ${step.accent}`,
                            }}
                        >
                            <Icon
                                className="h-6 w-6 sm:h-7 sm:w-7"
                                style={{ color: step.accent }}
                                strokeWidth={1.65}
                                aria-hidden
                            />
                        </div>
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-black tabular-nums text-white sm:h-11 sm:w-11 sm:text-sm"
                            style={{
                                borderColor: `${step.accent}50`,
                                background: `linear-gradient(160deg, ${step.accentSoft}, rgba(0,0,0,0.15))`,
                                boxShadow: `0 0 24px ${step.accentSoft}`,
                            }}
                            aria-label={`Step ${step.id}`}
                        >
                            {step.id}
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <span
                            className="inline-flex max-w-full rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/90 ring-1 ring-inset ring-white/[0.08] sm:tracking-[0.2em]"
                            style={{
                                backgroundColor: step.accentSoft,
                                color: step.accent,
                                textShadow: '0 0 24px rgba(255,255,255,0.15)',
                            }}
                        >
                            {step.phase}
                        </span>
                        <h3
                            className="text-lg font-black leading-snug tracking-tight text-white sm:text-xl lg:text-2xl lg:leading-tight"
                            style={{
                                fontFamily: 'var(--font-orbitron), system-ui, sans-serif',
                            }}
                        >
                            {step.title}
                        </h3>
                    </div>

                    <p className="text-[13px] leading-[1.68] text-white/60 sm:text-[0.9375rem] lg:leading-relaxed">
                        {step.description}
                    </p>
                </div>

                <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                />
            </article>
        </motion.li>
    );
}

function RowFlowDivider() {
    return (
        <div
            className="my-2 flex items-center justify-center gap-3 sm:my-3 lg:my-5"
            aria-hidden
        >
            <div className="h-px max-w-[min(8rem,28vw)] flex-1 bg-gradient-to-r from-transparent via-purple-500/35 to-purple-500/25" />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-purple-500/25 bg-purple-500/[0.08] shadow-[0_0_24px_rgba(168,85,247,0.15)]">
                <ChevronDown className="h-4 w-4 text-purple-300/90" strokeWidth={2.5} />
            </div>
            <div className="h-px max-w-[min(8rem,28vw)] flex-1 bg-gradient-to-l from-transparent via-purple-500/35 to-purple-500/25" />
        </div>
    );
}

export default function HowItWorksSteps() {
    return (
<<<<<<< Updated upstream
        <div className="relative w-full py-0">
            <div className="flex flex-col gap-0">
                {ROWS.map((row, rowIndex) => (
                    <React.Fragment key={row.map((s) => s.id).join('-')}>
                        {rowIndex > 0 && <RowFlowDivider />}
                        <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 sm:gap-6 lg:gap-7">
                            {row.map((step, colIndex) => (
                                <StepCard
                                    key={step.id}
                                    step={step}
                                    globalIndex={rowIndex * 2 + colIndex}
                                />
                            ))}
                        </ul>
                    </React.Fragment>
                ))}
=======
        <section className="w-full max-w-6xl mx-auto px-6 py-32 relative">
            <div className="relative">
                {/* Snake Path Container (Desktop) - Behind cards for glow-through effect */}
                <div className="hidden lg:block absolute inset-0 z-0 pointer-events-none overflow-visible">
                    <svg
                        viewBox="0 0 1000 1000"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full preserve-3d"
                        style={{ overflow: 'visible' }}
                    >
                        {/* Background Static Path - Closed Loop */}
                        <path
                            d="M 200 250 L 800 250 C 950 250 950 750 800 750 L 200 750 C 50 750 50 250 200 250"
                            stroke="white"
                            strokeWidth="2"
                            strokeOpacity="0.05"
                            strokeLinecap="round"
                        />

                        {/* Flowing Light 1 - Slow & Long (Deep Purple) */}
                        <motion.path
                            d="M 200 250 L 800 250 C 950 250 950 750 800 750 L 200 750 C 50 750 50 250 200 250"
                            stroke="#a855f7"
                            strokeWidth="8"
                            strokeLinecap="round"
                            initial={{ pathLength: 0.4, pathOffset: 0 }}
                            animate={{ pathOffset: 1 }}
                            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                            className="blur-[10px] opacity-20"
                        />

                        {/* Flowing Light 2 - Medium Speed (Electric Purple with White Core) */}
                        <motion.path
                            d="M 200 250 L 800 250 C 950 250 950 750 800 750 L 200 750 C 50 750 50 250 200 250"
                            stroke="url(#snakeGradient)"
                            strokeWidth="5"
                            strokeLinecap="round"
                            initial={{ pathLength: 0.15, pathOffset: 0.3 }}
                            animate={{ pathOffset: 1.3 }}
                            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                            className="drop-shadow-[0_0_15px_#a855f7]"
                        />
                        <motion.path
                            d="M 200 250 L 800 250 C 950 250 950 750 800 750 L 200 750 C 50 750 50 250 200 250"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            initial={{ pathLength: 0.1, pathOffset: 0.3 }}
                            animate={{ pathOffset: 1.3 }}
                            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                            className="drop-shadow-[0_0_8px_#fff] opacity-60"
                        />

                        {/* Flowing Light 3 - Fast Pulse (Subtle) */}
                        <motion.path
                            d="M 200 250 L 800 250 C 950 250 950 750 800 750 L 200 750 C 50 750 50 250 200 250"
                            stroke="#d8b4fe"
                            strokeWidth="3"
                            strokeLinecap="round"
                            initial={{ pathLength: 0.05, pathOffset: 0.7 }}
                            animate={{ pathOffset: 1.7 }}
                            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                            className="blur-[2px] opacity-40"
                        />

                        <defs>
                            <linearGradient id="snakeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="transparent" />
                                <stop offset="50%" stopColor="#d8b4fe" />
                                <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-20 gap-y-12 lg:gap-y-40 relative z-10">
                    {STEPS.map((step, index) => {
                        const isRight = index === 1 || index === 2; // Step 2 and 3 on the right

                        return (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{
                                    duration: 0.8,
                                    delay: index * 0.15,
                                    ease: [0.16, 1, 0.3, 1]
                                }}
                                className={`lg:col-span-6 flex ${isRight ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className="w-full max-w-xl group relative">
                                    {/* Glassmorphism Card with High Blur for Glow-Through */}
                                    <div className="h-full bg-transparent backdrop-blur-[40px] border border-white/10 rounded-[2rem] lg:rounded-[3.5rem] p-8 lg:p-12 flex flex-col hover:bg-white/[0.02] hover:border-purple-500/40 transition-all duration-700 relative overflow-hidden lg:group-hover:-translate-y-4 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.8)]">
                                        {/* Grid Background Pattern */}
                                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
                                        </div>

                                        <div className="mb-8 lg:mb-14 relative z-10">
                                            <div className={`inline-flex px-4 py-1.5 rounded-full bg-gradient-to-br ${step.color} border border-white/5 mb-6 lg:mb-8 shadow-inner`}>
                                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">
                                                    {step.phase}
                                                </span>
                                            </div>

                                            <h3 className="text-2xl lg:text-4xl font-black text-white leading-none tracking-tighter mb-4 lg:mb-6 group-hover:text-purple-100 transition-colors">
                                                {step.title}
                                            </h3>
                                        </div>

                                        <p className="text-white/30 text-sm lg:text-base leading-relaxed font-medium lg:pr-10 relative z-10 group-hover:text-white/60 transition-colors">
                                            {step.description}
                                        </p>

                                        {/* Decorative Step ID */}
                                        <span className="absolute -right-4 lg:-right-8 -bottom-6 lg:-bottom-10 text-[120px] lg:text-[200px] font-black text-white/[0.01] select-none group-hover:text-purple-500/[0.03] transition-all duration-1000 italic pointer-events-none">
                                            {step.id}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
>>>>>>> Stashed changes
            </div>
        </div>
    );
}

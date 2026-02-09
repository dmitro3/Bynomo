'use client';

import React, { useEffect, useState } from 'react';
import { useOverflowStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SettlementNotification Component
 * Displays a Binomo-style popup when a bet is settled (win or loss)
 */
export const SettlementNotification: React.FC = () => {
    const lastResult = useOverflowStore(state => state.lastResult);
    const clearLastResult = useOverflowStore(state => state.clearLastResult);
    const accountType = useOverflowStore(state => state.accountType);

    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (lastResult) {
            setVisible(true);

            // Auto-hide after 5 seconds
            const timer = setTimeout(() => {
                setVisible(false);
                // Delay clearing the state to allow exit animation
                setTimeout(clearLastResult, 500);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [lastResult, clearLastResult]);

    return (
        <AnimatePresence>
            {visible && lastResult && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[320px]"
                >
                    <div className={`
            relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl
            ${lastResult.won
                            ? 'border-green-500/50 bg-green-500/10 shadow-green-500/20'
                            : 'border-red-500/50 bg-red-500/10 shadow-red-500/20'
                        }
          `}>
                        {/* Background Glow Effect */}
                        <div className={`absolute -inset-2 opacity-20 blur-2xl ${lastResult.won ? 'bg-green-500' : 'bg-red-500'}`} />

                        <div className="relative flex flex-col items-center text-center gap-2">
                            <div className={`
                w-12 h-12 rounded-full flex items-center justify-center mb-1
                ${lastResult.won ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}
              `}>
                                {lastResult.won ? (
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </div>

                            <h3 className={`text-xl font-black uppercase tracking-tighter ${lastResult.won ? 'text-green-400' : 'text-red-400'}`}>
                                {lastResult.won ? 'Trade Won!' : 'Trade Lost'}
                            </h3>

                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                                    {lastResult.won ? 'Profit Received' : 'Investment Lost'}
                                </span>
                                <span className={`text-3xl font-mono font-black ${lastResult.won ? 'text-green-400' : 'text-red-400'}`}>
                                    {lastResult.won ? `+${lastResult.payout.toFixed(4)}` : `-${lastResult.amount.toFixed(4)}`}
                                    <span className="text-sm ml-1 opacity-70">BNB</span>
                                </span>
                            </div>

                            <div className="mt-2 flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/5">
                                <div className={`w-1.5 h-1.5 rounded-full ${accountType === 'demo' ? 'bg-yellow-400' : 'bg-purple-500'}`} />
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${accountType === 'demo' ? 'text-yellow-400' : 'text-purple-400'}`}>
                                    {accountType === 'demo' ? 'Practice Account' : 'Real Account'}
                                </span>
                            </div>

                            <button
                                onClick={() => setVisible(false)}
                                className="absolute top-0 right-0 p-1 text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Progress bar for auto-hide */}
                        <motion.div
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: 5, ease: "linear" }}
                            className={`absolute bottom-0 left-0 h-1 ${lastResult.won ? 'bg-green-500' : 'bg-red-400'}`}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';

interface TourStep {
    target: string;
    title: string;
    content: string;
    action?: () => void;
    position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
    {
        target: '[data-tour="asset-selector"]',
        title: 'Choose Your Asset',
        content: 'Click here to switch between Crypto, Metals, Forex, and Stocks. Each has different volatility and returns.',
        position: 'bottom'
    },
    {
        target: '[data-tour="classic-mode"]',
        title: 'Classic Mode',
        content: 'Predict if the price will be Higher or Lower after a set amount of time. Simple and powerful.',
        action: () => {
            // We can't easily trigger a store action here without access to it, 
            // but the component itself will handle the view.
        },
        position: 'top'
    },
    {
        target: '[data-tour="box-mode"]',
        title: 'Box Mode',
        content: 'Place bets directly on the grid. Multipliers vary based on the price distance. High risk, high reward!',
        position: 'top'
    },
    {
        target: '[data-tour="wallet-tab"]',
        title: 'Manage Your Funds',
        content: 'Switch to the Wallet tab to see your balance, deposit funds, or request a withdrawal.',
        position: 'top'
    },
    {
        target: '[data-tour="deposit-section"]',
        title: 'Quick Deposit',
        content: 'Easily deposit BNB or SOL to start trading. Transactions are instant and secure.',
        position: 'top'
    }
];

export const QuickTour: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    // Use specific selectors for stability
    const isConnected = useStore(state => state.isConnected);
    const setActiveTab = useStore(state => state.setActiveTab);
    const setGameMode = useStore(state => state.setGameMode);

    // Memoize steps to prevent infinite loops
    const steps: TourStep[] = useMemo(() => [
        ...(isConnected ? [] : [{
            target: '[data-tour="connect-button"]',
            title: 'Welcome! Connect First',
            content: 'Start by connecting your wallet. Choose any supported chain to begin trading.',
            position: 'bottom' as const
        }]),
        {
            target: '[data-tour="asset-selector"]',
            title: 'Choose Your Asset',
            content: 'Switch between Crypto, Metals, Forex, and Stocks. Each has different volatility and returns.',
            position: 'bottom' as const
        },
        {
            target: '[data-tour="classic-mode"]',
            title: 'Classic Mode',
            content: 'Predict if the price will be Higher or Lower after a set amount of time. Simple and powerful.',
            position: 'top' as const
        },
        {
            target: '[data-tour="box-mode"]',
            title: 'Box Mode',
            content: 'Place bets directly on the grid. Multipliers vary based on the price distance. High risk, high reward!',
            position: 'top' as const
        },
        {
            target: '[data-tour="wallet-tab"]',
            title: 'Navigation Controls',
            content: 'Switch between Bet, Wallet, and Blitz modes using these tabs.',
            position: 'top' as const
        },
        {
            target: '[data-tour="deposit-section"]',
            title: 'Manage Your Funds',
            content: isConnected
                ? 'Deposit funds on your selected chain. Your house balance is updated instantly.'
                : 'After connecting, you can manage your deposits and withdrawals right here.',
            // Prefer below the wallet stack so the card is not pushed off-screen (sidebar is tall).
            position: 'bottom' as const
        }
    ], [isConnected]);

    // Handle view state changes (tabs/modes) independently of positioning
    useEffect(() => {
        if (!isOpen) return;

        const step = steps[currentStep];
        if (!step) return;

        // Force open the mobile panel if a target is inside it
        const isTargetInPanel = [
            '[data-tour="classic-mode"]',
            '[data-tour="box-mode"]',
            '[data-tour="wallet-tab"]',
            '[data-tour="deposit-section"]'
        ].includes(step.target);

        if (isTargetInPanel && window.innerWidth < 640) {
            const panel = document.querySelector('.sm\\:w-\\[300px\\]');
            if (panel && panel.classList.contains('translate-y-full')) {
                // This is a bit hacky but we need to ensure the panel is visible
                // For a real fix, we should use a shared state, but this works given the current structure
                // Assuming GameBoard has a way to reactive to these changes
            }
            // Better: use the store to ensure panel is open
            // Since we don't have setIsPanelOpen in store, we hope the component handles it
        }

        if (step.target === '[data-tour="classic-mode"]') setGameMode('binomo');
        if (step.target === '[data-tour="box-mode"]') setGameMode('box');
        if (step.target === '[data-tour="wallet-tab"]') setActiveTab('bet');
        if (step.target === '[data-tour="deposit-section"]') setActiveTab('wallet');
    }, [currentStep, isOpen, steps, setGameMode, setActiveTab]);

    const updateTargetRect = useCallback(() => {
        const step = steps[currentStep];
        if (!step) return;

        const element = document.querySelector(step.target);
        if (element) {
            setTargetRect(element.getBoundingClientRect());
        }
    }, [currentStep, steps]);

    useEffect(() => {
        if (isOpen) {
            // Initial position and scroll
            const step = steps[currentStep];
            setTimeout(() => {
                const element = document.querySelector(step?.target || '');
                if (element) {
                    // Tall wallet column: "center" can scroll the viewport such that the tooltip clips; "nearest" keeps more UI in view.
                    const block =
                        step?.target === '[data-tour="deposit-section"]' ? 'nearest' : 'center';
                    element.scrollIntoView({ behavior: 'smooth', block, inline: 'nearest' });
                    updateTargetRect();
                }
            }, 300); // Increased timeout for panel animations

            window.addEventListener('resize', updateTargetRect);
            window.addEventListener('scroll', updateTargetRect);
            return () => {
                window.removeEventListener('resize', updateTargetRect);
                window.removeEventListener('scroll', updateTargetRect);
            };
        }
    }, [isOpen, currentStep, steps, updateTargetRect]);

    if (!isOpen || !targetRect) return null;

    const currentStepData = steps[currentStep];
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const tooltipWidth = isMobile ? Math.min(window.innerWidth - 40, 280) : 300;
    // Layout estimate for viewport math (real card is taller; must not under-estimate or the bottom clips).
    const tooltipLayoutHeight = isMobile ? 280 : 300;

    // Calculate clamped position
    const calculatePosition = () => {
        const padding = 16;
        const gap = 16;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

        let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        let preferBottom = currentStepData.position === 'bottom';
        let top = preferBottom ? targetRect.bottom + gap : targetRect.top - tooltipLayoutHeight - gap;

        if (currentStepData.position === 'right' && !isMobile) {
            left = targetRect.right + gap;
            top = targetRect.top;
        } else if (currentStepData.position === 'left' && !isMobile) {
            left = targetRect.left - tooltipWidth - gap;
            top = targetRect.top;
        }

        // Mobile: pick side with more room
        if (isMobile) {
            const spaceAbove = targetRect.top - padding;
            const spaceBelow = vh - padding - targetRect.bottom;
            preferBottom = spaceBelow >= spaceAbove;
            top = preferBottom ? targetRect.bottom + gap : targetRect.top - tooltipLayoutHeight - gap;
        }

        // If "top" placement would go above viewport, flip below (and vice versa when possible).
        if (!preferBottom && top < padding) {
            top = targetRect.bottom + gap;
            preferBottom = true;
        }
        if (preferBottom && top + tooltipLayoutHeight > vh - padding) {
            const above = targetRect.top - tooltipLayoutHeight - gap;
            if (above >= padding) {
                top = above;
                preferBottom = false;
            }
        }

        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
        top = Math.max(padding, Math.min(top, vh - tooltipLayoutHeight - padding));

        // Arrow sits on the edge of the tooltip that faces the highlight.
        const tooltipBelowTarget = preferBottom;
        return { left, top, tooltipBelowTarget };
    };

    const pos = calculatePosition();

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
            setCurrentStep(0);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            {/* Dimmed Background with Hole */}
            <svg className="absolute inset-0 w-full h-full pointer-events-auto">
                <defs>
                    <mask id="tour-mask">
                        <rect width="100%" height="100%" fill="white" />
                        <rect
                            x={targetRect.left - 8}
                            y={targetRect.top - 8}
                            width={targetRect.width + 16}
                            height={targetRect.height + 16}
                            rx="12"
                            fill="black"
                        />
                    </mask>
                </defs>
                <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.75)"
                    mask="url(#tour-mask)"
                    onClick={onClose}
                />
            </svg>

            {/* Spotlight Border */}
            <motion.div
                initial={false}
                animate={{
                    left: targetRect.left - 8,
                    top: targetRect.top - 8,
                    width: targetRect.width + 16,
                    height: targetRect.height + 16,
                }}
                className="absolute border-2 border-purple-500 rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.6)] pointer-events-none"
            />

            {/* Tooltip */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    left: pos.left,
                    top: pos.top,
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute bg-[#0d0d0d] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl pointer-events-auto backdrop-blur-2xl flex flex-col max-h-[min(420px,calc(100vh-2rem))]"
                style={{ width: tooltipWidth }}
            >
                <div className="flex justify-between items-start mb-2 sm:mb-3 shrink-0">
                    <h3 className="text-purple-400 font-bold text-[11px] sm:text-sm uppercase tracking-wider pr-2">
                        {currentStepData.title}
                    </h3>
                    <span className="text-[9px] sm:text-[10px] text-gray-500 font-mono shrink-0">
                        {currentStep + 1} / {steps.length}
                    </span>
                </div>

                <p className="text-gray-300 text-[11px] sm:text-xs leading-relaxed mb-4 sm:mb-6 min-h-0 overflow-y-auto overscroll-contain">
                    {currentStepData.content}
                </p>

                <div className="flex justify-between items-center mt-auto shrink-0 pt-1">
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                        Skip
                    </button>

                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={handleBack}
                                className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border border-white/10 transition-all"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="px-3 sm:px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-purple-500/20 transition-all"
                        >
                            {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>

                {/* Arrow - Only show on desktop */}
                {!isMobile && (
                    <div
                        className={`absolute w-3 h-3 bg-[#0d0d0d] border-white/10 transform rotate-45 left-1/2 -translate-x-1/2
                ${pos.tooltipBelowTarget ? '-top-1.5 border-t border-l' : '-bottom-1.5 border-b border-r'}
              `}
                    />
                )}
            </motion.div>
        </div>
    );
};

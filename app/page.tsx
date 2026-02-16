'use client';

import React, { useState, useRef } from 'react';
import { GameBoard } from '@/components/game';
import { BetHistory, MiniHistory } from '@/components/history';
import { WalletConnect, WalletInfo } from '@/components/wallet';
import { QuickTour } from '@/components/tour/QuickTour';
import { TierStatusModal } from '@/components/game/TierStatusModal';
import { HeaderMenu } from '@/components/game/HeaderMenu';
import { useStore, useUserTier } from '@/lib/store';

export default function Home() {
  const [clickCount, setClickCount] = useState(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);
  const [demoActivated, setDemoActivated] = useState(false);

  // Get store values and actions
  const setAddress = useStore((state) => state.setAddress);
  const setBalance = useStore((state) => state.setBalance);
  const setIsConnected = useStore((state) => state.setIsConnected);
  const toggleAccountType = useStore((state) => state.toggleAccountType);
  const accountType = useStore((state) => state.accountType);
  const isTourOpen = useStore((state) => state.isTourOpen);
  const setIsTourOpen = useStore((state) => state.setIsTourOpen);
  const isStatusOpen = useStore((state) => state.isStatusOpen);
  const setIsStatusOpen = useStore((state) => state.setIsStatusOpen);
  const userTier = useUserTier();

  const tierIcon = userTier === 'vip' ? '⬢' : userTier === 'standard' ? '♢' : '△';

  const handleOverflowClick = () => {
    // Clear existing timer
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
    }

    const newCount = clickCount + 1;
    setClickCount(newCount);

    // Check if 3 clicks reached
    if (newCount >= 3) {
      // Activate demo mode
      setAddress('0xDEMO_1234567890');
      setBalance(50); // 50 BNB is reasonable
      setIsConnected(true);
      if (accountType === 'real') toggleAccountType();
      setDemoActivated(true);
      setClickCount(0);

      // Show confirmation briefly
      setTimeout(() => setDemoActivated(false), 2000);
    } else {
      // Reset click count after 1 second of inactivity
      clickTimer.current = setTimeout(() => {
        setClickCount(0);
      }, 1000);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#02040A] overflow-hidden flex flex-col relative">
      {/* Header - Mobile Responsive */}
      <header className="absolute top-0 left-0 right-0 z-50 px-2 sm:px-6 py-2 sm:py-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="flex items-center gap-1 sm:gap-3">
            <span
              onClick={handleOverflowClick}
              className="text-lg sm:text-3xl font-black tracking-tighter sm:tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-400 to-white cursor-pointer select-none"
              style={{ fontFamily: 'var(--font-orbitron)' }}
            >
              Bynomo
            </span>
            {demoActivated && (
              <span className="text-green-400 text-[10px] font-mono font-normal border border-green-400/50 px-2 py-0.5 rounded bg-green-400/10 animate-pulse">
                DEMO MODE
              </span>
            )}
          </h1>
        </div>

        <div className="pointer-events-auto flex items-center gap-1 sm:gap-4">
          <HeaderMenu />
          <WalletConnect />
        </div>
      </header>

      {/* Main Content - Full Screen */}
      <main className="flex-1 w-full h-full relative">
        <GameBoard />
        <MiniHistory />
      </main>

      {/* Tour Component */}
      <QuickTour isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />

      {/* Status Component */}
      <TierStatusModal isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} />
    </div>
  );
}

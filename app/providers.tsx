'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useOverflowStore } from '@/lib/store';
import { startPriceFeed } from '@/lib/store/gameSlice';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { WagmiProvider } from 'wagmi';
import { ConnectKitProvider } from 'connectkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config as bnbConfig } from '@/lib/bnb/wagmi';
import { useWalletConnection } from '@/lib/bnb/wallet';

// Wallet Sync component to bridge Wagmi state with our Zustand store
function WalletSync() {
  useWalletConnection();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Create a QueryClient instance
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializeApp = async () => {
      try {
        const { updateAllPrices, loadTargetCells, startGlobalPriceFeed } = useOverflowStore.getState();

        // Load target cells
        await loadTargetCells().catch(console.error);

        // Start global multi-asset price feed
        console.log('Starting global multi-asset price feed tracker');
        const stopPriceFeed = startGlobalPriceFeed(updateAllPrices);

        // Mark as ready
        setIsReady(true);

        return () => {
          if (stopPriceFeed) stopPriceFeed();
        };

      } catch (error) {
        console.error('Error initializing app:', error);
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF006E] mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing Binomo...</p>
        </div>
      </div>
    );
  }

  return (
    <WagmiProvider config={bnbConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <WalletSync />
          {children}
          <ToastProvider />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

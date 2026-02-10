'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useOverflowStore } from '@/lib/store';
import { startPriceFeed } from '@/lib/store/gameSlice';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { WagmiProvider } from 'wagmi';
import { ConnectKitProvider } from 'connectkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config as bnbConfig } from '@/lib/bnb/wagmi';
import { useWalletConnection as useBNBConnection } from '@/lib/bnb/wallet';
import { useWalletConnection as useSOLConnection } from '@/lib/solana/wallet';

// Solana Imports
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles for Solana Wallet Adapter UI
import '@solana/wallet-adapter-react-ui/styles.css';

// Wallet Sync component to bridge Wagmi and Solana state with our Zustand store
function WalletSync() {
  useBNBConnection();
  useSOLConnection();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Solana Network (Mainnet-Beta for production)
  const endpoint = useMemo(() => process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com', []);
  // Use an empty array to rely on Wallet Standard for discovery (prevents duplicate key errors)
  const wallets = useMemo(() => [], []);

  // Create a QueryClient instance
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializeApp = async () => {
      try {
        const { updateAllPrices, loadTargetCells, startGlobalPriceFeed } = useOverflowStore.getState();
        await loadTargetCells().catch(console.error);
        const stopPriceFeed = startGlobalPriceFeed(updateAllPrices);
        setIsReady(true);
        return () => { if (stopPriceFeed) stopPriceFeed(); };
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <WagmiProvider config={bnbConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
              <WalletModalProvider>
                <WalletSync />
                {children}
                <ToastProvider />
              </WalletModalProvider>
            </WalletProvider>
          </ConnectionProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

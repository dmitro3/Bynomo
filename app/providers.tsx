'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useOverflowStore } from '@/lib/store';
import { startPriceFeed } from '@/lib/store/gameSlice';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { getSolanaConfig } from '@/lib/solana/config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import Solana styles
import '@solana/wallet-adapter-react-ui/styles.css';

import { useWalletConnection } from '@/lib/solana/wallet';

// Wallet Sync component to bridge Solana adapter state with our Zustand store
function WalletSync() {
  useWalletConnection();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Create a QueryClient instance
  const [queryClient] = useState(() => new QueryClient());

  // Get Solana configuration
  const config = useMemo(() => {
    try {
      return getSolanaConfig();
    } catch (e) {
      console.warn('Solana config not found, using defaults for providers');
      return {
        rpcEndpoint: 'https://api.devnet.solana.com',
        network: 'devnet',
      };
    }
  }, []);

  // Initialize wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializeApp = async () => {
      try {
        const { updatePrice, loadTargetCells } = useOverflowStore.getState();

        // Restore Solana wallet session - skip for now as autoConnect is on
        // await restoreSolanaWalletSession().catch(console.error);

        // Load target cells
        await loadTargetCells().catch(console.error);

        // Start price feed
        console.log('Starting price feed for real-time BTC/USD prices');
        const stopPriceFeed = startPriceFeed(updatePrice);

        // Mark as ready
        setIsReady(true);

        return () => {
          stopPriceFeed();
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
          <p className="text-gray-400">Initializing Solnomo...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={config.rpcEndpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletSync />
          <WalletModalProvider>
            {children}
            <ToastProvider />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}

'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useOverflowStore } from '@/lib/store';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { bsc } from 'viem/chains';
import { WagmiProvider, useAccount } from 'wagmi';
import { ConnectKitProvider } from 'connectkit';
import { config as wagmiConfig } from '@/lib/bnb/wagmi';

// Solana Imports
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

// Sui Imports
import { createNetworkConfig, SuiClientProvider, WalletProvider, useCurrentAccount } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import '@mysten/dapp-kit/dist/index.css';

// Custom Components
import { WalletConnectModal } from '@/components/wallet/WalletConnectModal';

// Wallet Sync component to bridge all wallet states with our Zustand store
function WalletSync() {
  const { user, authenticated, ready: privyReady } = usePrivy();
  const { wallets: privyWallets } = useWallets();
  const { connected: solanaConnected, publicKey: solanaPublicKey } = useWallet();
  const suiAccount = useCurrentAccount();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();

  const {
    setAddress,
    setIsConnected,
    setNetwork,
    refreshWalletBalance,
    preferredNetwork
  } = useOverflowStore();

  useEffect(() => {
    // 1. Check Solana (Priority if preferred)
    if (solanaConnected && solanaPublicKey && preferredNetwork === 'SOL') {
      setAddress(solanaPublicKey.toBase58());
      setIsConnected(true);
      setNetwork('SOL');
      refreshWalletBalance();
      return;
    }

    // 2. Check Sui
    if (suiAccount?.address && preferredNetwork === 'SUI') {
      setAddress(suiAccount.address);
      setIsConnected(true);
      setNetwork('SUI');
      refreshWalletBalance();
      return;
    }

    // 3. Check BNB (Wagmi or Privy)
    if (preferredNetwork === 'BNB') {
      if (wagmiConnected && wagmiAddress) {
        setAddress(wagmiAddress);
        setIsConnected(true);
        setNetwork('BNB');
        refreshWalletBalance();
        return;
      }
      if (privyReady && authenticated && privyWallets[0]) {
        setAddress(privyWallets[0].address);
        setIsConnected(true);
        setNetwork('BNB');
        refreshWalletBalance();
        return;
      }
    }

    // 4. Check Stellar
    if (preferredNetwork === 'XLM') {
      // For Stellar, we usually rely on manual connection which sets the store,
      // but we should ensure the state is persisted if possible.
      // However, if it's already set in store by handleStellarConnect, we don't need to do much here
      // unless we want to "reconnect" automatically. 
      // For now, let's just make sure it doesn't clear if network is XLM and address exists.
      if (useOverflowStore.getState().address && useOverflowStore.getState().network === 'XLM') {
        return;
      }
    }

    // 5. Cleanup/Sync Decision
    const hasSolana = solanaConnected && solanaPublicKey;
    const hasSui = !!suiAccount?.address;
    const hasBNB = (wagmiConnected && !!wagmiAddress) || (privyReady && authenticated && !!privyWallets[0]);
    const hasStellar = useOverflowStore.getState().network === 'XLM' && !!useOverflowStore.getState().address;

    // Determine if we should clear
    let shouldClear = false;
    if (preferredNetwork === 'SOL' && !hasSolana) shouldClear = true;
    else if (preferredNetwork === 'SUI' && !hasSui) shouldClear = true;
    else if (preferredNetwork === 'BNB' && !hasBNB) shouldClear = true;
    else if (preferredNetwork === 'XLM' && !hasStellar) shouldClear = true;
    else if (!preferredNetwork && !hasBNB && !hasSolana && !hasSui && !hasStellar) shouldClear = true;

    if (shouldClear) {
      setAddress(null);
      setIsConnected(false);
      setNetwork(null);
    }
  }, [
    user, authenticated, privyWallets, privyReady,
    solanaConnected, solanaPublicKey,
    suiAccount,
    wagmiAddress, wagmiConnected,
    preferredNetwork,
    setAddress, setIsConnected, setNetwork, refreshWalletBalance
  ]);

  return null;
}

const { networkConfig } = createNetworkConfig({
  mainnet: { url: getFullnodeUrl('mainnet') },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [queryClient] = useState(() => new QueryClient());

  // Solana wallet adapter v2+ auto-discovers installed wallets via Wallet Standard
  // No need to explicitly add adapters - this avoids duplicate key errors (e.g. MetaMask)
  const solanaWallets = useMemo(() => [], []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializeApp = async () => {
      try {
        const { updateAllPrices, loadTargetCells, startGlobalPriceFeed } = useOverflowStore.getState();

        // Initialize Stellar Wallet Kit
        const { initWalletKit } = await import('@/lib/stellar/wallet-kit');
        await initWalletKit().catch(console.error);

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

  const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cm7377f0a00gup9u2w4m3v6be';

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="dark">
          <PrivyProvider
            appId={PRIVY_APP_ID}
            config={{
              appearance: {
                theme: 'dark',
                accentColor: '#A855F7',
                showWalletLoginFirst: true,
              },
              supportedChains: [bsc],
              defaultChain: bsc,
              embeddedWallets: {
                createOnLogin: 'users-without-wallets',
              },
              rpcConfig: {
                56: 'https://bsc-dataseed.binance.org/'
              }
            }}
          >
            <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
              <SolanaWalletProvider wallets={solanaWallets} autoConnect>
                <WalletModalProvider>
                  <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
                    <WalletProvider autoConnect>
                      <WalletSync />
                      {children}
                      <WalletConnectModal />
                      <ToastProvider />
                    </WalletProvider>
                  </SuiClientProvider>
                </WalletModalProvider>
              </SolanaWalletProvider>
            </ConnectionProvider>
          </PrivyProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useOverflowStore } from '@/lib/store';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { bsc } from 'viem/chains';
import { WagmiProvider, useAccount, useBalance } from 'wagmi';
import { ConnectKitProvider } from 'connectkit';
import { config as wagmiConfig, pushChainDonut } from '@/lib/bnb/wagmi';

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
import { ReferralSync } from './ReferralSync';

// Wallet Sync component to bridge all wallet states with our Zustand store
function WalletSync() {
  const { user, authenticated, ready: privyReady } = usePrivy();
  const { wallets: privyWallets } = useWallets();
  const { connected: solanaConnected, publicKey: solanaPublicKey } = useWallet();
  const suiAccount = useCurrentAccount();
  const { address: wagmiAddress, isConnected: wagmiConnected, chainId: wagmiChainId } = useAccount();

  // Fetch PC balance via wagmi (reliable, uses already-established connection)
  const { data: pushBalanceData } = useBalance({
    address: wagmiAddress,
    chainId: pushChainDonut.id,
    query: { enabled: wagmiConnected && !!wagmiAddress && wagmiChainId === pushChainDonut.id },
  });

  const {
    address,
    accountType,
    setAddress,
    setIsConnected,
    setNetwork,
    refreshWalletBalance,
    fetchProfile,
    preferredNetwork
  } = useOverflowStore();

  // Sync Push Chain PC balance directly into the store whenever wagmi reports it
  useEffect(() => {
    if (preferredNetwork === 'PUSH' && pushBalanceData) {
      useOverflowStore.setState({ walletBalance: parseFloat(pushBalanceData.formatted) });
    }
  }, [pushBalanceData, preferredNetwork]);

  // Restoration Effect for Stellar
  const attemptedRestore = useRef(false);
  useEffect(() => {
    if (preferredNetwork === 'XLM' && !attemptedRestore.current) {
      attemptedRestore.current = true;
      const checkStellar = async () => {
        if (useOverflowStore.getState().address && useOverflowStore.getState().network === 'XLM') return;
        try {
          const { restoreSession } = await import('@/lib/stellar/wallet-kit');
          const restoredAddress = await restoreSession();
          if (restoredAddress) {
            setAddress(restoredAddress);
            setIsConnected(true);
            setNetwork('XLM');
            refreshWalletBalance();
            fetchProfile(restoredAddress);
          }
        } catch (e) {
          console.error("Stellar restore failed", e);
        }
      };
      checkStellar();
    }
  }, [preferredNetwork, address, setAddress, setIsConnected, setNetwork, refreshWalletBalance, fetchProfile]);

  // Main Sync Effect
  useEffect(() => {
    // 0. Demo Mode
    if (accountType === 'demo') {
      if (address !== '0xDEMO_1234567890') {
        setAddress('0xDEMO_1234567890');
        setIsConnected(true);
        setNetwork('BNB');
      }
      return;
    }

    // 1. Solana
    if (solanaConnected && solanaPublicKey && preferredNetwork === 'SOL') {
      const addr = solanaPublicKey.toBase58();
      if (address !== addr) {
        setAddress(addr);
        setIsConnected(true);
        setNetwork('SOL');
        refreshWalletBalance();
        fetchProfile(addr);
      }
      return;
    }

    // 2. Sui
    if (suiAccount?.address && preferredNetwork === 'SUI') {
      if (address !== suiAccount.address) {
        setAddress(suiAccount.address);
        setIsConnected(true);
        setNetwork('SUI');
        refreshWalletBalance();
        fetchProfile(suiAccount.address);
      }
      return;
    }

    // 3. Push Chain (via wagmi/ConnectKit on chainId 42101)
    if (preferredNetwork === 'PUSH') {
      if (wagmiConnected && wagmiAddress && wagmiChainId === pushChainDonut.id) {
        if (address !== wagmiAddress) {
          setAddress(wagmiAddress);
          setIsConnected(true);
          setNetwork('PUSH');
          refreshWalletBalance();
          fetchProfile(wagmiAddress);
        }
        return;
      }
      // Still waiting for user to switch network — keep existing state
      if (useOverflowStore.getState().address && useOverflowStore.getState().network === 'PUSH') return;
      return;
    }

    // 4. BNB (Wagmi or Privy)
    if (preferredNetwork === 'BNB') {
      if (wagmiConnected && wagmiAddress) {
        if (address !== wagmiAddress) {
          setAddress(wagmiAddress);
          setIsConnected(true);
          setNetwork('BNB');
          refreshWalletBalance();
          fetchProfile(wagmiAddress);
        }
        return;
      }
      if (privyReady && authenticated && privyWallets[0]) {
        const addr = privyWallets[0].address;
        if (address !== addr) {
          setAddress(addr);
          setIsConnected(true);
          setNetwork('BNB');
          refreshWalletBalance();
          fetchProfile(addr);
        }
        return;
      }
    }

    // 5. Stellar
    if (preferredNetwork === 'XLM') {
      if (useOverflowStore.getState().address && useOverflowStore.getState().network === 'XLM') return;
    }

    // 6. Tezos
    if (preferredNetwork === 'XTZ') {
      if (useOverflowStore.getState().address && useOverflowStore.getState().network === 'XTZ') return;
    }

    // 7. NEAR
    if (preferredNetwork === 'NEAR') {
      if (useOverflowStore.getState().address && useOverflowStore.getState().network === 'NEAR') return;
    }

    // 8. Starknet
    if (preferredNetwork === 'STRK') {
      const injectedStarknetAddress = typeof window !== 'undefined'
        ? (window as unknown as { starknet?: { selectedAddress?: string } }).starknet?.selectedAddress
        : null;
      if (injectedStarknetAddress && address !== injectedStarknetAddress) {
        setAddress(injectedStarknetAddress);
        setIsConnected(true);
        setNetwork('STRK');
        refreshWalletBalance();
        fetchProfile(injectedStarknetAddress);
        return;
      }
      if (useOverflowStore.getState().address && useOverflowStore.getState().network === 'STRK') return;
    }

    // 9. Cleanup
    const state = useOverflowStore.getState();
    const isDemoMode = state.accountType === 'demo';
    const hasSolana = solanaConnected && solanaPublicKey;
    const hasSui = !!suiAccount?.address;
    const hasBNB = (wagmiConnected && !!wagmiAddress) || (privyReady && authenticated && !!privyWallets[0]);
    const hasStellar = state.network === 'XLM' && !!state.address;
    const hasTezos = state.network === 'XTZ' && !!state.address;
    const hasNEAR = state.network === 'NEAR' && !!state.address;
    const hasSTRK = state.network === 'STRK' && !!state.address;
    const hasPUSH = wagmiConnected && !!wagmiAddress && wagmiChainId === pushChainDonut.id;

    let shouldClear = false;
    if (isDemoMode) {
      shouldClear = false;
    } else {
      if (preferredNetwork === 'SOL' && !hasSolana) shouldClear = true;
      else if (preferredNetwork === 'SUI' && !hasSui) shouldClear = true;
      else if (preferredNetwork === 'BNB' && !hasBNB) shouldClear = true;
      else if (preferredNetwork === 'XLM' && !hasStellar) shouldClear = true;
      else if (preferredNetwork === 'XTZ' && !hasTezos) shouldClear = true;
      else if (preferredNetwork === 'NEAR' && !hasNEAR) shouldClear = true;
      else if (preferredNetwork === 'STRK' && !hasSTRK) shouldClear = true;
      else if (preferredNetwork === 'PUSH' && !hasPUSH) shouldClear = true;
      else if (!preferredNetwork && !hasBNB && !hasSolana && !hasSui && !hasStellar && !hasTezos && !hasNEAR && !hasSTRK && !hasPUSH) shouldClear = true;
    }

    if (shouldClear && address !== null) {
      setAddress(null);
      setIsConnected(false);
      setNetwork(null);
    }
  }, [
    user, authenticated, privyWallets, privyReady,
    solanaConnected, solanaPublicKey,
    suiAccount,
    wagmiAddress, wagmiConnected, wagmiChainId,
    preferredNetwork, address, accountType,
    setAddress, setIsConnected, setNetwork, refreshWalletBalance, fetchProfile
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

  const solanaWallets = useMemo(() => [], []);

  const solanaEndpoint = useMemo(() => {
    try {
      const { getSolanaConfig } = require('@/lib/solana/config');
      return getSolanaConfig().rpcEndpoint;
    } catch (e) {
      return "https://solana-rpc.publicnode.com";
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializeApp = async () => {
      try {
        const { updateAllPrices, loadTargetCells, startGlobalPriceFeed } = useOverflowStore.getState();
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
        <ConnectKitProvider mode="dark">
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
            }}
          >
            <ConnectionProvider endpoint={solanaEndpoint}>
              <SolanaWalletProvider wallets={solanaWallets} autoConnect>
                <WalletModalProvider>
                  <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
                    <WalletProvider autoConnect>
                      <WalletSync />
                      <ReferralSync />
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

'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useOverflowStore } from '@/lib/store';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { formatUnits } from 'viem';
import { WagmiProvider, useAccount, useBalance } from 'wagmi';
import { ConnectKitProvider } from 'connectkit';
import { config as wagmiConfig, pushChainDonut, somniaTestnet } from '@/lib/bnb/wagmi';
import { bsc } from 'wagmi/chains';

// Solana Imports
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

// Sui Imports
import { createNetworkConfig, SuiClientProvider, WalletProvider, useCurrentAccount, useSuiClientContext } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import '@mysten/dapp-kit/dist/index.css';

// Custom Components
import { WalletConnectModal } from '@/components/wallet/WalletConnectModal';
import { ReferralSync } from './ReferralSync';
import type { AssetType } from '@/lib/utils/priceFeed';

// Wallet Sync component to bridge all wallet states with our Zustand store
function WalletSync() {
  const { user, authenticated, ready: privyReady } = usePrivy();
  const { wallets: privyWallets } = useWallets();
  const { connected: solanaConnected, publicKey: solanaPublicKey } = useWallet();
  const suiAccount = useCurrentAccount();
  const { selectNetwork: selectSuiNetwork } = useSuiClientContext();
  const { address: wagmiAddress, isConnected: wagmiConnected, chainId: wagmiChainId } = useAccount();

  // Fetch PC balance via wagmi (reliable, uses already-established connection)
  const { data: pushBalanceData } = useBalance({
    address: wagmiAddress,
    chainId: pushChainDonut.id,
    query: { enabled: wagmiConnected && !!wagmiAddress && wagmiChainId === pushChainDonut.id },
  });

  // Fetch STT balance via wagmi (Somnia)
  const { data: somniaBalanceData } = useBalance({
    address: wagmiAddress,
    chainId: somniaTestnet.id,
    query: { enabled: wagmiConnected && !!wagmiAddress && wagmiChainId === somniaTestnet.id },
  });


  const {
    address,
    isConnected: storeIsConnected,
    network: storeNetwork,
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
    if (wagmiChainId === pushChainDonut.id && pushBalanceData) {
      const formatted = formatUnits(pushBalanceData.value, pushBalanceData.decimals);
      useOverflowStore.setState({ walletBalance: Number.parseFloat(formatted) });
    }
  }, [pushBalanceData, wagmiChainId]);

  // Sync Somnia STT balance into the store whenever wagmi reports it
  useEffect(() => {
    if (wagmiChainId === somniaTestnet.id && somniaBalanceData) {
      const formatted = formatUnits(somniaBalanceData.value, somniaBalanceData.decimals);
      useOverflowStore.setState({ walletBalance: Number.parseFloat(formatted) });
    }
  }, [somniaBalanceData, wagmiChainId]);


  // Switch Sui client network based on preferredNetwork
  useEffect(() => {
    if (preferredNetwork === 'OCT') {
      selectSuiNetwork('onechain');
    } else if (preferredNetwork === 'SUI') {
      selectSuiNetwork('mainnet');
    }
  }, [preferredNetwork, selectSuiNetwork]);

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
        // Demo mode is also push-only for now.
        setNetwork('PUSH');
      }
      return;
    }

    // EVM auto-detection (authoritative from active chain).
    // This prevents Somnia/Push connections from being mislabeled as BNB
    // when preferredNetwork is stale in localStorage.
    if (wagmiConnected && wagmiAddress) {
      const evmNetwork =
        wagmiChainId === somniaTestnet.id
          ? 'SOMNIA'
          : wagmiChainId === pushChainDonut.id
            ? 'PUSH'
            : wagmiChainId === bsc.id
              ? 'BNB'
              : null;

      if (evmNetwork) {
        if (address !== wagmiAddress || !storeIsConnected || storeNetwork !== evmNetwork) {
          setAddress(wagmiAddress);
          setIsConnected(true);
          setNetwork(evmNetwork);
          refreshWalletBalance();
          fetchProfile(wagmiAddress);
        }
        return;
      }
    }

    // 1. Solana
    if (solanaConnected && solanaPublicKey && preferredNetwork === 'SOL') {
      const addr = solanaPublicKey.toBase58();
      if (address !== addr || !storeIsConnected || storeNetwork !== 'SOL') {
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
      if (address !== suiAccount.address || !storeIsConnected || storeNetwork !== 'SUI') {
        setAddress(suiAccount.address);
        setIsConnected(true);
        setNetwork('SUI');
        refreshWalletBalance();
        fetchProfile(suiAccount.address);
      }
      return;
    }

    // 2b. OneChain (OCT) — also uses Sui-compatible wallet
    if (suiAccount?.address && preferredNetwork === 'OCT') {
      if (address !== suiAccount.address || !storeIsConnected || storeNetwork !== 'OCT') {
        setAddress(suiAccount.address);
        setIsConnected(true);
        setNetwork('OCT');
        refreshWalletBalance();
        fetchProfile(suiAccount.address);
      }
      return;
    }

    // 3. Push Chain (via wagmi/ConnectKit on chainId 42101)
    if (preferredNetwork === 'PUSH') {
      if (wagmiConnected && wagmiAddress && wagmiChainId === pushChainDonut.id) {
        if (address !== wagmiAddress || !storeIsConnected || storeNetwork !== 'PUSH') {
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

    // 4. Somnia (via wagmi/ConnectKit)
    if (preferredNetwork === 'SOMNIA') {
      if (wagmiConnected && wagmiAddress && wagmiChainId === somniaTestnet.id) {
        if (address !== wagmiAddress || !storeIsConnected || storeNetwork !== 'SOMNIA') {
          setAddress(wagmiAddress);
          setIsConnected(true);
          setNetwork('SOMNIA');
          refreshWalletBalance();
          fetchProfile(wagmiAddress);
        }
        return;
      }
      // Still waiting for user to switch network — keep existing state
      if (useOverflowStore.getState().address && useOverflowStore.getState().network === 'SOMNIA') return;
      return;
    }

    // 6. BNB (Wagmi or Privy)
    if (preferredNetwork === 'BNB') {
      if (wagmiConnected && wagmiAddress) {
        if (address !== wagmiAddress || !storeIsConnected || storeNetwork !== 'BNB') {
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
        if (address !== addr || !storeIsConnected || storeNetwork !== 'BNB') {
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
    const hasBNB = (wagmiConnected && !!wagmiAddress && wagmiChainId === bsc.id) || (privyReady && authenticated && !!privyWallets[0]);
    const hasStellar = state.network === 'XLM' && !!state.address;
    const hasTezos = state.network === 'XTZ' && !!state.address;
    const hasNEAR = state.network === 'NEAR' && !!state.address;
    const hasSTRK = state.network === 'STRK' && !!state.address;
    const hasPUSH = wagmiConnected && !!wagmiAddress && wagmiChainId === pushChainDonut.id;
    const hasSOMNIA = wagmiConnected && !!wagmiAddress && wagmiChainId === somniaTestnet.id;
    const hasOCT = preferredNetwork === 'OCT' && !!suiAccount?.address;

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
      else if (String(preferredNetwork) === 'SOMNIA' && !hasSOMNIA) shouldClear = true;
      else if (preferredNetwork === 'OCT' && !hasOCT) shouldClear = true;
      else if (!preferredNetwork && !hasBNB && !hasSolana && !hasSui && !hasStellar && !hasTezos && !hasNEAR && !hasSTRK && !hasPUSH && !hasSOMNIA && !hasOCT) shouldClear = true;
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
    storeIsConnected, storeNetwork,
    setAddress, setIsConnected, setNetwork, refreshWalletBalance, fetchProfile
  ]);

  return null;
}

const { networkConfig } = createNetworkConfig({
  mainnet: { url: getFullnodeUrl('mainnet') },
  onechain: { url: process.env.NEXT_PUBLIC_ONECHAIN_RPC || 'https://rpc-testnet.onelabs.cc' },
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

        // Seed a faster default asset for the chart.
        // We try a small set in parallel and pick the first one that returns a valid price.
        // This helps avoid long "Connecting to Pyth Network..." delays when some feeds are slower.
        try {
          const { fetchPrice } = await import('@/lib/utils/priceFeed');
          const store = useOverflowStore.getState();

          const candidates: AssetType[] = ['BTC', 'ETH', 'SOL', 'SUI', 'BNB'];

          const seeded = await Promise.any(
            candidates.map(async (asset) => {
              const p = await fetchPrice(asset);
              if (p?.price && p.price > 0) return { asset, price: p.price };
              throw new Error('No valid price');
            })
          );

          store.setSelectedAsset(seeded.asset);
          // Seed at least 2 points so LiveChart can render quickly.
          store.updatePrice(seeded.price, seeded.asset);
          store.updatePrice(seeded.price, seeded.asset);
        } catch (e) {
          // Non-fatal: we'll still start the global feed and show the default BNB chart.
        }

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
              supportedChains: [somniaTestnet, bsc, pushChainDonut],
              defaultChain: somniaTestnet,
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

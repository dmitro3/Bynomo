/**
 * Wallet state slice for Zustand store
 * Manages wallet connection status and address
 * 
 * Note: This slice is now primarily used for storing wallet state.
 * Actual wallet connection is handled by BNB Wallet integration in lib/bnb/wallet.ts
 */

import { StateCreator } from "zustand";

export interface WalletState {
  // State
  address: string | null;
  walletBalance: number;
  isConnected: boolean;
  isConnecting: boolean;
  network: 'BNB' | 'SOL' | 'SUI' | 'XLM' | 'XTZ' | 'NEAR' | null;
  preferredNetwork: 'BNB' | 'SOL' | 'SUI' | 'XLM' | 'XTZ' | 'NEAR' | null;
  error: string | null;
  isConnectModalOpen: boolean;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshWalletBalance: () => Promise<void>;
  clearError: () => void;
  setConnectModalOpen: (open: boolean) => void;

  // Setters for wallet integration
  setAddress: (address: string | null) => void;
  setIsConnected: (connected: boolean) => void;
  setNetwork: (network: 'BNB' | 'SOL' | 'SUI' | 'XLM' | 'XTZ' | 'NEAR' | null) => void;
  setPreferredNetwork: (network: 'BNB' | 'SOL' | 'SUI' | 'XLM' | 'XTZ' | 'NEAR' | null) => void;
}

/**
 * Create wallet slice for Zustand store
 * Handles wallet state management for multi-chain integration
 */
export const createWalletSlice: StateCreator<WalletState> = (set, get) => ({
  // Initial state
  address: null,
  walletBalance: 0,
  isConnected: false,
  isConnecting: false,
  network: null,
  preferredNetwork: typeof window !== 'undefined' ? localStorage.getItem('solnomo_preferred_network') as 'BNB' | 'SOL' | 'SUI' | 'XLM' | 'XTZ' | 'NEAR' | null : null,
  error: null,
  isConnectModalOpen: false,

  /**
   * Connect wallet
   * Note: Actual connection is handled by Privy integration
   */
  connect: async () => {
    set({ isConnectModalOpen: true });
  },

  /**
   * Disconnect wallet
   * Note: Actual disconnection is handled by Privy integration
   */
  disconnect: () => {
    console.log('Disconnect called - handled by Privy');

    // Reset state
    set({
      address: null,
      walletBalance: 0,
      isConnected: false,
      isConnecting: false,
      network: null,
      error: null
    });
  },

  /**
   * Refresh token balance for connected wallet
   */
  refreshWalletBalance: async () => {
    const { address, isConnected, network } = get();

    if (!isConnected || !address || !network) {
      return;
    }

    try {
      if (network === 'BNB') {
        const { getBNBBalance } = await import('@/lib/bnb/client');
        const bal = await getBNBBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'SOL') {
        const { getSOLBalance } = await import('@/lib/solana/client');
        const bal = await getSOLBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'SUI') {
        const { getUSDCBalance } = await import('@/lib/sui/client');
        const bal = await getUSDCBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'XLM') {
        const { getXLMBalance } = await import('@/lib/stellar/client');
        const bal = await getXLMBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'XTZ') {
        const { getXTZBalance } = await import('@/lib/tezos/client');
        const bal = await getXTZBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'NEAR') {
        const { getNearBalance } = await import('@/lib/near/wallet');
        const bal = await getNearBalance(address);
        set({ walletBalance: bal });
      }
    } catch (error) {
      console.error("Error refreshing wallet balance:", error);
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Set connect modal visibility
   */
  setConnectModalOpen: (open: boolean) => {
    set({ isConnectModalOpen: open });
  },

  /**
   * Set address (used by wallet integration)
   */
  setAddress: (address: string | null) => {
    set({ address });
  },

  /**
   * Set connected status (used by wallet integration)
   */
  setIsConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },

  /**
   * Set active network (BNB, SOL, SUI, XLM, XTZ or NEAR)
   */
  setNetwork: (network: 'BNB' | 'SOL' | 'SUI' | 'XLM' | 'XTZ' | 'NEAR' | null) => {
    set({ network });
  },

  /**
   * Set preferred network (manually chosen by user)
   */
  setPreferredNetwork: (network: 'BNB' | 'SOL' | 'SUI' | 'XLM' | 'XTZ' | 'NEAR' | null) => {
    set({ preferredNetwork: network });
    if (typeof window !== 'undefined') {
      if (network) {
        localStorage.setItem('solnomo_preferred_network', network);
      } else {
        localStorage.removeItem('solnomo_preferred_network');
      }
    }
  }
});

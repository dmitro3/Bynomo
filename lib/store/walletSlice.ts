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
  balance: string;
  isConnected: boolean;
  isConnecting: boolean;
  network: 'BNB' | 'SOL' | null;
  error: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  clearError: () => void;

  // Setters for wallet integration
  setAddress: (address: string | null) => void;
  setIsConnected: (connected: boolean) => void;
  setNetwork: (network: 'BNB' | 'SOL' | null) => void;
}

/**
 * Create wallet slice for Zustand store
 * Handles wallet state management for BNB integration
 */
export const createWalletSlice: StateCreator<WalletState> = (set, get) => ({
  // Initial state
  address: null,
  balance: "0.0",
  isConnected: false,
  isConnecting: false,
  network: null,
  error: null,

  /**
   * Connect wallet
   * Note: Actual connection is handled by BNB or Solana Wallet integration
   */
  connect: async () => {
    console.log('Connect called - handled by adapter');
  },

  /**
   * Disconnect wallet
   * Note: Actual disconnection is handled by BNB or Solana Wallet integration
   */
  disconnect: () => {
    console.log('Disconnect called - handled by adapter');

    // Reset state
    set({
      address: null,
      balance: "0.0",
      isConnected: false,
      isConnecting: false,
      network: null,
      error: null
    });
  },

  /**
   * Refresh token balance for connected wallet
   */
  refreshBalance: async () => {
    const { address, isConnected, network } = get();

    if (!isConnected || !address || !network) {
      return;
    }

    try {
      // Balance is fetched by components or store hooks
      console.log(`Balance refresh for ${network} - handled by components`);
    } catch (error) {
      console.error("Error refreshing balance:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to refresh balance"
      });
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
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
   * Set active network (BNB or SOL)
   */
  setNetwork: (network: 'BNB' | 'SOL' | null) => {
    set({ network });
  }
});

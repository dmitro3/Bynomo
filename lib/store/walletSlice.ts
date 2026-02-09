/**
 * Wallet state slice for Zustand store
 * Manages wallet connection status and address
 * 
 * Note: This slice is now primarily used for storing wallet state.
 * Actual wallet connection is handled by Solana Wallet Adapter in lib/solana/wallet.ts
 */

import { StateCreator } from "zustand";

export interface WalletState {
  // State
  address: string | null;
  balance: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  clearError: () => void;

  // Setters for Solana wallet integration
  setAddress: (address: string | null) => void;
  setIsConnected: (connected: boolean) => void;
}

/**
 * Create wallet slice for Zustand store
 * Handles wallet state management for Solana integration
 */
export const createWalletSlice: StateCreator<WalletState> = (set, get) => ({
  // Initial state
  address: null,
  balance: "0.0",
  isConnected: false,
  isConnecting: false,
  error: null,

  /**
   * Connect wallet
   * Note: Actual connection is handled by Solana Wallet Adapter
   */
  connect: async () => {
    console.log('Connect called - handled by adapter');
  },

  /**
   * Disconnect wallet
   * Note: Actual disconnection is handled by Solana Wallet Adapter
   */
  disconnect: () => {
    console.log('Disconnect called - handled by adapter');

    // Reset state
    set({
      address: null,
      balance: "0.0",
      isConnected: false,
      isConnecting: false,
      error: null
    });
  },

  /**
   * Refresh SOL token balance for connected wallet
   */
  refreshBalance: async () => {
    const { address, isConnected } = get();

    if (!isConnected || !address) {
      return;
    }

    try {
      // Balance is fetched by components using getSOLBalance from lib/solana/client.ts
      console.log('Balance refresh - handled by components');
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
   * Set address (used by Solana wallet integration)
   */
  setAddress: (address: string | null) => {
    set({ address });
  },

  /**
   * Set connected status (used by Solana wallet integration)
   */
  setIsConnected: (connected: boolean) => {
    set({ isConnected: connected });
  }
});

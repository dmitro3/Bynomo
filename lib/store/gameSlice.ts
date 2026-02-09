/**
 * Game state slice for Zustand store
 * Manages game state, active rounds, price data, and betting actions
 * 
 * Note: After Sui migration, game logic remains off-chain.
 * Only deposit/withdrawal operations interact with the blockchain.
 */

import { StateCreator } from "zustand";
import { TargetCell, PricePoint, ActiveRound } from "@/types/game";
import { AssetType } from "@/lib/utils/priceFeed";

// Active bet type for instant-resolution system
export interface ActiveBet {
  id: string;
  cellId: string; // The cell this bet is placed on (e.g., "cell-1737748395000-3")
  amount: number;
  multiplier: number;
  direction: 'UP' | 'DOWN';
  timestamp: number;
}

export interface GameState {
  // State
  selectedAsset: AssetType;
  currentPrice: number;
  priceHistory: PricePoint[];
  activeRound: ActiveRound | null; // Keep for backward compatibility
  activeBets: ActiveBet[]; // Multiple concurrent bets
  targetCells: TargetCell[];
  isPlacingBet: boolean;
  isSettling: boolean;
  error: string | null;

  // Actions
  setSelectedAsset: (asset: AssetType) => void;
  placeBet: (amount: string, targetId: string) => Promise<void>;
  placeBetFromHouseBalance: (amount: string, targetId: string, userAddress: string, cellId?: string) => Promise<{ betId: string; remainingBalance: number; bet: ActiveBet } | void>;
  addActiveBet: (bet: ActiveBet) => void;
  resolveBet: (betId: string, won: boolean, payout: number) => void;
  settleRound: (betId: string) => Promise<void>;
  updatePrice: (price: number) => void;
  setActiveRound: (round: ActiveRound | null) => void;
  loadTargetCells: () => Promise<void>;
  clearError: () => void;
}

// Maximum price history points (5 minutes at 1 second intervals)
const MAX_PRICE_HISTORY = 300;

// Default target cells configuration
const DEFAULT_TARGET_CELLS: TargetCell[] = [
  { id: '1', label: '+$5 in 30s', multiplier: 1.5, priceChange: 5, direction: 'UP' },
  { id: '2', label: '+$10 in 30s', multiplier: 2.0, priceChange: 10, direction: 'UP' },
  { id: '3', label: '+$20 in 30s', multiplier: 3.0, priceChange: 20, direction: 'UP' },
  { id: '4', label: '+$50 in 30s', multiplier: 5.0, priceChange: 50, direction: 'UP' },
  { id: '5', label: '+$100 in 30s', multiplier: 10.0, priceChange: 100, direction: 'UP' },
  { id: '6', label: '-$5 in 30s', multiplier: 1.5, priceChange: -5, direction: 'DOWN' },
  { id: '7', label: '-$10 in 30s', multiplier: 2.0, priceChange: -10, direction: 'DOWN' },
  { id: '8', label: '-$20 in 30s', multiplier: 3.0, priceChange: -20, direction: 'DOWN' },
];

/**
 * Create game slice for Zustand store
 * Handles betting, round management, and price updates
 */
export const createGameSlice: StateCreator<GameState> = (set, get) => ({
  // Initial state
  selectedAsset: 'BTC',
  currentPrice: 0,
  priceHistory: [],
  activeRound: null,
  activeBets: [], // Multiple concurrent bets
  targetCells: DEFAULT_TARGET_CELLS,
  isPlacingBet: false,
  isSettling: false,
  error: null,

  /**
   * Set selected asset for price tracking
   */
  setSelectedAsset: (asset: AssetType) => {
    const { selectedAsset: currentAsset } = get();
    
    // Only reset if actually changing asset
    if (currentAsset !== asset) {
      set({ 
        selectedAsset: asset,
        priceHistory: [], // Clear history when switching assets
        currentPrice: 0,
        activeBets: [], // Clear active bets when switching
        activeRound: null
      });
    }
  },

  /**
   * Place a bet on a target cell
   * Note: After Sui migration, this method is deprecated.
   * Use placeBetFromHouseBalance instead for off-chain betting.
   * @param amount - Bet amount in USDC tokens (e.g., "1.0")
   * @param targetId - ID of the target cell (1-8) OR dynamic grid target (e.g., "UP-2.50")
   */
  placeBet: async (amount: string, targetId: string) => {
    throw new Error("placeBet is deprecated after Sui migration. Use placeBetFromHouseBalance instead.");
  },

  /**
   * Place a bet using house balance (no wallet signature required)
   * Instant-resolution system: bet is placed on a specific cell, resolves when chart hits it
   * @param amount - Bet amount in USDC tokens
   * @param targetId - Dynamic grid target (e.g., "UP-2.50") containing direction and multiplier
   * @param userAddress - User's wallet address
   * @param cellId - Optional: The specific cell ID this bet is placed on
   */
  placeBetFromHouseBalance: async (amount: string, targetId: string, userAddress: string, cellId?: string) => {
    const { targetCells, currentPrice, addActiveBet } = get();

    try {
      // Parse amount for validation
      const betAmount = parseFloat(amount);
      if (isNaN(betAmount) || betAmount <= 0) {
        throw new Error("Invalid bet amount");
      }

      // Ensure address starts with 0x
      const formattedAddress = userAddress.startsWith('0x') ? userAddress : `0x${userAddress}`;

      let target: TargetCell;
      let direction: 'UP' | 'DOWN' = 'UP';
      let multiplier = 1.5;

      // Check if this is a dynamic grid target (e.g., "UP-2.50" or "DOWN-1.80")
      if (targetId.startsWith('UP-') || targetId.startsWith('DOWN-')) {
        const parts = targetId.split('-');
        direction = parts[0] as 'UP' | 'DOWN';
        multiplier = parseFloat(parts[1]) || 1.5;

        // Create dynamic target
        target = {
          id: targetId,
          label: `${direction} x${multiplier}`,
          multiplier: multiplier,
          priceChange: direction === 'UP' ? 10 : -10,
          direction: direction
        };
      } else {
        // Find predefined target cell
        const foundTarget = targetCells.find(cell => cell.id === targetId);
        if (!foundTarget) {
          throw new Error("Invalid target cell");
        }
        target = foundTarget;
        direction = target.direction;
        multiplier = target.multiplier;
      }

      // DEMO MODE: Skip API call for demo addresses
      const isDemoMode = formattedAddress.startsWith('0xDEMO');

      if (isDemoMode) {
        set({ isPlacingBet: true, error: null });

        // Simulate bet placement without API
        const fakeBetId = `demo-${Date.now()}`;

        // Create active bet for tracking
        const activeBet: ActiveBet = {
          id: fakeBetId,
          cellId: cellId || targetId,
          amount: betAmount,
          multiplier: multiplier,
          direction: direction,
          timestamp: Date.now()
        };

        // Add to active bets
        addActiveBet(activeBet);

        set({ isPlacingBet: false, error: null });

        return {
          betId: fakeBetId,
          remainingBalance: 1000 - betAmount, // Fake remaining balance
          bet: activeBet
        };
      }

      set({ isPlacingBet: true, error: null });

      // Call API endpoint to place bet from house balance
      const response = await fetch('/api/balance/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: formattedAddress,
          betAmount,
          roundId: Date.now(),
          targetPrice: currentPrice,
          isOver: direction === 'UP',
          multiplier: multiplier,
          targetCell: {
            id: 9, // Always use 9 for dynamic grid bets
            priceChange: target.priceChange,
            direction: direction,
            timeframe: 30,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place bet');
      }

      const data = await response.json();

      // Create active bet for tracking (instant-resolution system)
      const activeBet: ActiveBet = {
        id: data.betId,
        cellId: cellId || targetId,
        amount: betAmount,
        multiplier: multiplier,
        direction: direction,
        timestamp: Date.now()
      };

      // Add to active bets (multiple bets can be active simultaneously)
      addActiveBet(activeBet);

      set({
        isPlacingBet: false,
        error: null
      });

      // Return bet info for UI
      return {
        betId: data.betId,
        remainingBalance: data.remainingBalance,
        bet: activeBet
      };
    } catch (error) {
      console.error("Error placing bet from house balance:", error);
      set({
        isPlacingBet: false,
        error: error instanceof Error ? error.message : "Failed to place bet"
      });
      throw error;
    }
  },

  /**
   * Settle an active round
   * Note: After Sui migration, settlement is handled automatically by the instant-resolution system.
   * This method is kept for backward compatibility but does nothing.
   * @param betId - The unique bet ID to settle
   */
  settleRound: async (betId: string) => {
    console.log('settleRound called but is deprecated after Sui migration');
    set({ isSettling: false });
  },

  /**
   * Update current price and add to history
   * Maintains rolling 5-minute window of price data
   * @param price - New price in USD
   */
  updatePrice: (price: number) => {
    const { priceHistory, selectedAsset } = get();
    const now = Date.now();

    // Create new price point
    const newPoint: PricePoint = {
      timestamp: now,
      price
    };

    // Add to history
    const updatedHistory = [...priceHistory, newPoint];

    // Maintain rolling 5-minute window
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    const filteredHistory = updatedHistory.filter(
      point => point.timestamp >= fiveMinutesAgo
    );

    // Limit to MAX_PRICE_HISTORY points
    const trimmedHistory = filteredHistory.slice(-MAX_PRICE_HISTORY);

    set({
      currentPrice: price,
      priceHistory: trimmedHistory
    });
  },

  /**
   * Set active round (used by event listeners)
   * @param round - Active round data or null to clear
   */
  setActiveRound: (round: ActiveRound | null) => {
    set({ activeRound: round });
  },

  /**
   * Load target cells from configuration
   * Note: After Sui migration, target cells are configured off-chain.
   * No blockchain query needed.
   */
  loadTargetCells: async () => {
    // Use default configuration (off-chain)
    set({ targetCells: DEFAULT_TARGET_CELLS });
  },

  /**
   * Add a new active bet (for instant-resolution system)
   * @param bet - The bet to add
   */
  addActiveBet: (bet: ActiveBet) => {
    const { activeBets } = get();
    set({ activeBets: [...activeBets, bet] });
  },

  /**
   * Resolve a bet (win or lose) and update house balance
   * @param betId - The bet ID to resolve
   * @param won - Whether the bet was won
   * @param payout - The payout amount if won
   */
  resolveBet: (betId: string, won: boolean, payout: number) => {
    const { activeBets } = get();
    // Remove the resolved bet from active bets
    set({ activeBets: activeBets.filter(b => b.id !== betId) });

    // Log resolution for debugging
    console.log(`Bet ${betId} resolved: ${won ? 'WON' : 'LOST'}, payout: ${payout}`);
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  }
});

/**
 * Start price feed polling
 * Fetches real-time crypto price from Pyth Network every second
 * @param updatePrice - Function to update price in store
 * @param asset - Asset to track (BTC, SUI, SOL)
 * @returns Function to stop polling
 */
export const startPriceFeed = (
  updatePrice: (price: number) => void,
  asset: AssetType = 'BTC'
): (() => void) => {
  // Clean up any existing feed first
  if ((window as any).__currentPriceFeed) {
    console.log(`Stopping existing price feed before starting ${asset}`);
    (window as any).__currentPriceFeed.stop();
  }

  let stopFeedFn: (() => void) | null = null;
  let isActive = true; // Flag to prevent updates after cleanup

  // Store reference for cleanup
  (window as any).__currentPriceFeed = {
    asset,
    stop: () => {
      isActive = false;
      if (stopFeedFn) {
        stopFeedFn();
        stopFeedFn = null;
      }
    }
  };

  // Import Pyth price feed dynamically to avoid SSR issues
  import('@/lib/utils/priceFeed').then(({ startPythPriceFeed }) => {
    // Don't start if already cleaned up
    if (!isActive) return;

    const stopFeed = startPythPriceFeed((price, data) => {
      // Only update if still active
      if (isActive) {
        updatePrice(price);
        // Log price updates with confidence interval
        console.log(`${asset} Price: ${price.toFixed(asset === 'SUI' ? 4 : 2)} ±${data.confidence.toFixed(asset === 'SUI' ? 4 : 2)}`);
      }
    }, asset);

    stopFeedFn = stopFeed;
  }).catch(error => {
    console.error('Failed to start Pyth price feed:', error);

    // Fallback to mock price feed for development
    import('@/lib/utils/priceFeed').then(({ startMockPriceFeed }) => {
      // Don't start if already cleaned up
      if (!isActive) return;

      const stopFeed = startMockPriceFeed((price) => {
        // Only update if still active
        if (isActive) {
          updatePrice(price);
        }
      }, { asset });

      stopFeedFn = stopFeed;
    });
  });

  // Return cleanup function
  return () => {
    console.log(`Cleanup called for ${asset}`);
    isActive = false; // Prevent any future updates
    if (stopFeedFn) {
      stopFeedFn();
      stopFeedFn = null;
    }
    // Clear global reference if it's ours
    if ((window as any).__currentPriceFeed?.asset === asset) {
      delete (window as any).__currentPriceFeed;
    }
  };
};

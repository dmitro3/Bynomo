/**
 * Pyth Network Price Feed Service
 * Fetches real-time crypto price data from Pyth Network
 * Supports: BTC, SUI, SOL
 */

import { HermesClient } from '@pythnetwork/hermes-client';

// Pyth Network Price Feed IDs
export const PRICE_FEED_IDS = {
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  SUI: '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744',
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'
} as const;

export type AssetType = keyof typeof PRICE_FEED_IDS;

// Pyth Hermes API endpoint (public, free to use)
const HERMES_ENDPOINT = 'https://hermes.pyth.network';

export interface PriceData {
  price: number;
  confidence: number;
  timestamp: number;
  expo: number;
}

export class PythPriceFeed {
  private client: HermesClient;
  private intervalId: NodeJS.Timeout | null = null;
  private lastPrice: number | null = null;
  private isRunning: boolean = false;
  private asset: AssetType;
  
  constructor(asset: AssetType = 'BTC') {
    this.client = new HermesClient(HERMES_ENDPOINT);
    this.asset = asset;
  }
  
  /**
   * Fetch current price from Pyth Network
   */
  async fetchPrice(): Promise<PriceData> {
    try {
      const priceFeeds = await this.client.getLatestPriceUpdates([PRICE_FEED_IDS[this.asset]]);
      
      if (!priceFeeds || !priceFeeds.parsed || priceFeeds.parsed.length === 0) {
        throw new Error('No price data received from Pyth Network');
      }
      
      const priceFeed = priceFeeds.parsed[0];
      const priceData = priceFeed.price;
      
      // Pyth prices come with an exponent (e.g., price * 10^expo)
      const price = Number(priceData.price) * Math.pow(10, priceData.expo);
      const confidence = Number(priceData.conf) * Math.pow(10, priceData.expo);
      
      this.lastPrice = price;
      
      return {
        price,
        confidence,
        timestamp: Number(priceData.publish_time),
        expo: priceData.expo
      };
    } catch (error) {
      console.error(`Error fetching ${this.asset} price from Pyth Network:`, error);
      
      // If we have a last known price, return it with a warning
      if (this.lastPrice !== null) {
        console.warn('Using last known price due to fetch error');
        return {
          price: this.lastPrice,
          confidence: 0,
          timestamp: Date.now() / 1000,
          expo: -8
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Change the asset being tracked
   */
  setAsset(asset: AssetType): void {
    this.asset = asset;
    this.lastPrice = null; // Reset last price when changing asset
  }
  
  /**
   * Get current asset
   */
  getAsset(): AssetType {
    return this.asset;
  }
  
  /**
   * Start the price feed
   * Fetches new prices every second and calls the callback
   */
  async start(callback: (price: number, data: PriceData) => void): Promise<void> {
    if (this.isRunning) {
      console.warn('Price feed already running');
      return;
    }
    
    this.isRunning = true;
    
    // Fetch initial price
    try {
      const priceData = await this.fetchPrice();
      callback(priceData.price, priceData);
    } catch (error) {
      console.error('Failed to fetch initial price:', error);
    }
    
    // Update every second
    this.intervalId = setInterval(async () => {
      try {
        const priceData = await this.fetchPrice();
        callback(priceData.price, priceData);
      } catch (error) {
        console.error('Failed to fetch price update:', error);
      }
    }, 1000);
  }
  
  /**
   * Stop the price feed
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }
  
  /**
   * Get the last fetched price (useful for synchronous access)
   */
  getLastPrice(): number | null {
    return this.lastPrice;
  }
}

/**
 * Create and start a Pyth price feed
 * Returns a function to stop the feed
 */
export const startPythPriceFeed = (
  callback: (price: number, data: PriceData) => void,
  asset: AssetType = 'BTC'
): (() => void) => {
  const feed = new PythPriceFeed(asset);
  
  feed.start(callback);
  
  return () => feed.stop();
};

/**
 * Fetch a single price snapshot from Pyth Network
 * Useful for one-time price checks
 */
export const fetchPrice = async (asset: AssetType = 'BTC'): Promise<PriceData> => {
  const feed = new PythPriceFeed(asset);
  return await feed.fetchPrice();
};

// Backward compatibility
export const fetchBTCPrice = async (): Promise<PriceData> => {
  return fetchPrice('BTC');
};

// Export for backward compatibility (mock mode for testing)
export class MockPriceFeed {
  private basePrice: number;
  private volatility: number;
  private trend: number;
  private intervalId: NodeJS.Timeout | null = null;
  private asset: AssetType;
  
  constructor(
    asset: AssetType = 'BTC',
    basePrice?: number,
    volatility: number = 0.001,
    trend: number = 0
  ) {
    this.asset = asset;
    // Default base prices for different assets
    const defaultPrices = {
      BTC: 50000,
      SUI: 2.5,
      SOL: 100
    };
    this.basePrice = basePrice || defaultPrices[asset];
    this.volatility = volatility;
    this.trend = trend;
  }
  
  setAsset(asset: AssetType): void {
    this.asset = asset;
    const defaultPrices = {
      BTC: 50000,
      SUI: 2.5,
      SOL: 100
    };
    this.basePrice = defaultPrices[asset];
  }
  
  getAsset(): AssetType {
    return this.asset;
  }
  
  private generateNextPrice(currentPrice: number): number {
    const randomChange = (Math.random() - 0.5) * 2;
    const change = currentPrice * this.volatility * randomChange + this.trend;
    
    if (Math.random() < 0.05) {
      const spike = currentPrice * (Math.random() - 0.5) * 0.01;
      return currentPrice + change + spike;
    }
    
    return currentPrice + change;
  }
  
  start(callback: (price: number) => void): void {
    if (this.intervalId) {
      console.warn('Price feed already running');
      return;
    }
    
    let currentPrice = this.basePrice;
    callback(currentPrice);
    
    this.intervalId = setInterval(() => {
      currentPrice = this.generateNextPrice(currentPrice);
      currentPrice = Math.max(10000, Math.min(100000, currentPrice));
      callback(currentPrice);
    }, 1000);
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const startMockPriceFeed = (
  callback: (price: number) => void,
  options?: {
    asset?: AssetType;
    basePrice?: number;
    volatility?: number;
    trend?: number;
  }
): (() => void) => {
  const feed = new MockPriceFeed(
    options?.asset || 'BTC',
    options?.basePrice,
    options?.volatility,
    options?.trend
  );
  
  feed.start(callback);
  
  return () => feed.stop();
};

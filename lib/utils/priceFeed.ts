/**
 * Pyth Network Price Feed Service
 * Fetches real-time crypto price data from Pyth Network
 * Supports: BTC, SUI, SOL
 */

import { HermesClient } from '@pythnetwork/hermes-client';

// Pyth Network Price Feed IDs (Stable/Mainnet)
export const PRICE_FEED_IDS = {
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  TRX: '0x67aed5a24fdad045475e7195c98a98aea119c763f272d4523f5bac93a4f33c2b',
  XRP: '0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8',
  DOGE: '0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c',
  ADA: '0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d',
  BCH: '0x3dd2b63686a450ec7290df3a1e0b583c0481f651351edfa7636f39aed55cf8a3',
  BNB: '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
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
      // Ensure ID has 0x prefix and use ids[] format
      const id = PRICE_FEED_IDS[this.asset].startsWith('0x')
        ? PRICE_FEED_IDS[this.asset]
        : `0x${PRICE_FEED_IDS[this.asset]}`;

      const response = await fetch(`${HERMES_ENDPOINT}/v2/updates/price/latest?ids%5B%5D=${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const priceFeeds = await response.json();

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
   * Fetch multiple prices at once
   */
  static async fetchAllPrices(): Promise<Record<AssetType, number>> {
    const ids = Object.values(PRICE_FEED_IDS).map(id => id.startsWith('0x') ? id : `0x${id}`);
    const symbols = Object.keys(PRICE_FEED_IDS) as AssetType[];

    try {
      // Construct URL with "ids[]" and ensure "0x" prefix is included
      const queryString = ids.map(id => `ids%5B%5D=${id}`).join('&');
      const response = await fetch(`${HERMES_ENDPOINT}/v2/updates/price/latest?${queryString}`);

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${bodyText}`);
      }

      const priceFeeds = await response.json();

      if (!priceFeeds || !priceFeeds.parsed || priceFeeds.parsed.length === 0) {
        throw new Error('No price data received');
      }

      const results: any = {};
      priceFeeds.parsed.forEach((feed: any) => {
        // Result ID from Hermes v2 usually doesn't have 0x, but our constant does
        const symbol = symbols.find(s => PRICE_FEED_IDS[s].replace('0x', '') === feed.id);
        if (symbol) {
          const price = Number(feed.price.price) * Math.pow(10, feed.price.expo);
          results[symbol] = price;
        }
      });

      return results;
    } catch (error) {
      console.error('Error fetching multiple prices:', error);
      throw error;
    }
  }

  /**
   * Get the last fetched price (useful for synchronous access)
   */
  getLastPrice(): number | null {
    return this.lastPrice;
  }
}

/**
 * Start a multi-asset price feed
 */
export const startMultiPythPriceFeed = (
  callback: (prices: Record<AssetType, number>) => void
): (() => void) => {
  let intervalId: NodeJS.Timeout | null = null;

  const update = async () => {
    try {
      const prices = await PythPriceFeed.fetchAllPrices();
      callback(prices);
    } catch (err) {
      console.error('Multi-price feed update failed:', err);
    }
  };

  update();
  intervalId = setInterval(update, 1000);

  return () => {
    if (intervalId) clearInterval(intervalId);
  };
};


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
      BNB: 600
    };
    this.basePrice = basePrice || defaultPrices[asset as keyof typeof defaultPrices] || 1;
    this.volatility = volatility;
    this.trend = trend;
  }

  setAsset(asset: AssetType): void {
    this.asset = asset;
    const defaultPrices = {
      BTC: 50000,
      BNB: 600
    };
    this.basePrice = defaultPrices[asset as keyof typeof defaultPrices] || 1;
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

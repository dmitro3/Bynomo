/**
 * Read-only on-chain balances for admin dashboard (treasury + platform fee wallets).
 * Uses only public env addresses and RPC URLs — no private keys.
 */

import { createPublicClient, formatEther, http, type Chain } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import { getBNBConfig } from '@/lib/bnb/config';
import { getPushConfig } from '@/lib/push/config';
import { getSomniaConfig } from '@/lib/somnia/config';
import { getZGConfig } from '@/lib/zg/config';
import { getOneChainConfig } from '@/lib/onechain/config';
import { getStarknetConfig } from '@/lib/starknet/config';
import { getInitiaConfig } from '@/lib/initia/config';

export type TreasuryBalanceRow = {
  group: 'treasury' | 'fee';
  chain: string;
  label: string;
  address: string;
  asset: string;
  balance: number | null;
  formatted: string;
  explorerUrl: string | null;
  error: string | null;
  /** Heuristic: balance below a chain-specific floor (ops should top up). */
  isLow: boolean;
};

const FETCH_MS = 14_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function fmt(n: number | null, maxFrac = 6): string {
  if (n === null || !Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  if (n >= 1e9) return n.toExponential(4);
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

function evmChain(chainId: number, name: string, rpc: string, symbol: string): Chain {
  return {
    id: chainId,
    name,
    nativeCurrency: { name: symbol, symbol, decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  };
}

async function evmNativeBalance(rpcUrl: string, chainId: number, name: string, symbol: string, address: string): Promise<number> {
  const trimmed = address.trim();
  if (!trimmed.startsWith('0x') || trimmed.length < 10) throw new Error('invalid EVM address');
  const chain = evmChain(chainId, name, rpcUrl, symbol);
  const client = createPublicClient({ chain, transport: http(rpcUrl) });
  const wei = await client.getBalance({ address: trimmed as `0x${string}` });
  return Number(formatEther(wei));
}

async function solNativeLamports(rpc: string, address: string): Promise<number> {
  const { Connection, PublicKey } = await import('@solana/web3.js');
  const conn = new Connection(rpc, 'confirmed');
  const lamports = await conn.getBalance(new PublicKey(address.trim()));
  return lamports / 1e9;
}

async function suiUsdcBalance(rpc: string, owner: string, coinType: string): Promise<number> {
  const { SuiClient } = await import('@mysten/sui/client');
  const client = new SuiClient({ url: rpc });
  const bal = await client.getBalance({ owner: owner.trim(), coinType });
  return Number(bal.totalBalance) / 1_000_000;
}

async function onechainOctBalance(rpc: string, owner: string, coinType: string, decimals: number): Promise<number> {
  const { SuiClient } = await import('@mysten/sui/client');
  const client = new SuiClient({ url: rpc });
  const coins = await client.getCoins({ owner: owner.trim(), coinType });
  const raw = coins.data.reduce((s, c) => s + BigInt(c.balance), BigInt(0));
  return Number(raw) / 10 ** decimals;
}

async function stellarNativeXlm(horizonUrl: string, address: string): Promise<number> {
  const { Horizon } = await import('@stellar/stellar-sdk');
  const server = new Horizon.Server(horizonUrl);
  const account = await server.loadAccount(address.trim());
  const native = account.balances.find((b: { asset_type?: string }) => b.asset_type === 'native');
  if (!native || !('balance' in native)) throw new Error('no native balance');
  return parseFloat((native as { balance: string }).balance);
}

async function tezosNativeXtz(rpcUrl: string, address: string): Promise<number> {
  const { TezosToolkit } = await import('@taquito/taquito');
  const tezos = new TezosToolkit(rpcUrl);
  const bal = await tezos.tz.getBalance(address.trim());
  return bal.toNumber() / 1_000_000;
}

async function nearNativeNear(nodeUrl: string, accountId: string): Promise<number> {
  const { JsonRpcProvider } = await import('near-api-js');
  const provider = new JsonRpcProvider({ url: nodeUrl });
  const view = await provider.viewAccount({ accountId: accountId.trim() });
  return Number(view.amount) / 1e24;
}

async function initiaUinit(restUrl: string, address: string, denom: string): Promise<number> {
  const url = `${restUrl.replace(/\/$/, '')}/cosmos/bank/v1beta1/balances/${encodeURIComponent(address.trim())}`;
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`initia rest ${r.status}`);
  const j = (await r.json()) as { balances?: { denom: string; amount: string }[] };
  const row = j.balances?.find((b) => b.denom === denom);
  if (!row) return 0;
  return Number(row.amount) / 1e6;
}

/** Rough floors for “top up soon” highlighting (native units per chain, not USD). */
const LOW_BALANCE_MIN: Record<string, number> = {
  BNB: 0.05,
  PUSH: 0.02,
  STT: 1,
  '0G': 0.05,
  OCT: 5,
  SOL: 0.08,
  SUI: 100, // USDC on Sui
  XLM: 10,
  XTZ: 2,
  NEAR: 2,
  STRK: 15,
  INIT: 3,
};

function isLowBalance(chain: string, asset: string, balance: number | null): boolean {
  if (balance === null || !Number.isFinite(balance)) return false;
  const min = LOW_BALANCE_MIN[chain] ?? (asset === 'USDC' ? 100 : 0.02);
  return balance < min;
}

type RowInput = Pick<TreasuryBalanceRow, 'group' | 'chain' | 'label' | 'address' | 'asset' | 'explorerUrl'> & {
  fetch: () => Promise<number>;
};

async function row(partial: RowInput): Promise<TreasuryBalanceRow> {
  try {
    const balance = await withTimeout(partial.fetch(), FETCH_MS);
    return {
      ...partial,
      balance,
      formatted: fmt(balance),
      error: null,
      isLow: isLowBalance(partial.chain, partial.asset, balance),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed';
    return {
      ...partial,
      balance: null,
      formatted: '—',
      error: msg,
      isLow: false,
    };
  }
}

function explorerEvm(kind: 'bsc' | 'push' | 'somnia' | 'zg', addr: string): string | null {
  const a = encodeURIComponent(addr);
  switch (kind) {
    case 'bsc':
      return `https://bscscan.com/address/${a}`;
    case 'push':
      return null;
    case 'somnia': {
      const base = process.env.NEXT_PUBLIC_SOMNIA_TESTNET_EXPLORER || 'https://shannon-explorer.somnia.network';
      return `${base}/address/${a}`;
    }
    case 'zg': {
      const base = process.env.NEXT_PUBLIC_ZG_MAINNET_EXPLORER || 'https://chainscan.0g.ai';
      return `${base}/address/${a}`;
    }
    default:
      return null;
  }
}

/**
 * Collect balances for all configured treasury + fee addresses (best effort per chain).
 */
export async function buildTreasuryBalanceSnapshot(): Promise<{
  generatedAt: string;
  rows: TreasuryBalanceRow[];
}> {
  const tasks: Promise<TreasuryBalanceRow>[] = [];

  const evmFee = process.env.NEXT_PUBLIC_PLATFORM_FEE_WALLET_EVM?.trim() || null;

  // BNB
  try {
    const cfg = getBNBConfig();
    const chain = cfg.network === 'mainnet' ? bsc : bscTestnet;
    if (cfg.treasuryAddress) {
      tasks.push(
        row({
          group: 'treasury',
          chain: 'BNB',
          label: 'BNB Smart Chain — treasury',
          address: cfg.treasuryAddress,
          asset: 'BNB',
          explorerUrl: explorerEvm('bsc', cfg.treasuryAddress),
          fetch: () =>
            evmNativeBalance(cfg.rpcEndpoint, chain.id, chain.name, chain.nativeCurrency.symbol, cfg.treasuryAddress),
        }),
      );
    }
    if (evmFee) {
      tasks.push(
        row({
          group: 'fee',
          chain: 'BNB',
          label: 'BNB — platform fee wallet (EVM)',
          address: evmFee,
          asset: 'BNB',
          explorerUrl: explorerEvm('bsc', evmFee),
          fetch: () =>
            evmNativeBalance(cfg.rpcEndpoint, chain.id, chain.name, chain.nativeCurrency.symbol, evmFee),
        }),
      );
    }
  } catch {
    /* skip */
  }

  // Push
  try {
    const cfg = getPushConfig();
    if (cfg.treasuryAddress) {
      tasks.push(
        row({
          group: 'treasury',
          chain: 'PUSH',
          label: 'Push — treasury',
          address: cfg.treasuryAddress,
          asset: 'native',
          explorerUrl: explorerEvm('push', cfg.treasuryAddress),
          fetch: () => evmNativeBalance(cfg.rpcEndpoint, cfg.chainId, 'Push', 'ETH', cfg.treasuryAddress),
        }),
      );
    }
    if (evmFee) {
      tasks.push(
        row({
          group: 'fee',
          chain: 'PUSH',
          label: 'Push — platform fee wallet (EVM)',
          address: evmFee,
          asset: 'native',
          explorerUrl: explorerEvm('push', evmFee),
          fetch: () => evmNativeBalance(cfg.rpcEndpoint, cfg.chainId, 'Push', 'ETH', evmFee),
        }),
      );
    }
  } catch {
    /* skip */
  }

  // Somnia
  try {
    const cfg = getSomniaConfig();
    const rpc = cfg.rpcUrls[0];
    if (cfg.treasuryAddress) {
      const addr = String(cfg.treasuryAddress);
      tasks.push(
        row({
          group: 'treasury',
          chain: 'STT',
          label: 'Somnia — treasury',
          address: addr,
          asset: cfg.nativeCurrency.symbol,
          explorerUrl: explorerEvm('somnia', addr),
          fetch: () =>
            evmNativeBalance(rpc, cfg.chainId, cfg.chainName, cfg.nativeCurrency.symbol, addr),
        }),
      );
    }
    if (evmFee) {
      tasks.push(
        row({
          group: 'fee',
          chain: 'STT',
          label: 'Somnia — platform fee wallet (EVM)',
          address: evmFee,
          asset: cfg.nativeCurrency.symbol,
          explorerUrl: explorerEvm('somnia', evmFee),
          fetch: () => evmNativeBalance(rpc, cfg.chainId, cfg.chainName, cfg.nativeCurrency.symbol, evmFee),
        }),
      );
    }
  } catch {
    /* skip */
  }

  // 0G
  try {
    const cfg = getZGConfig();
    const rpc = cfg.rpcUrls[0];
    if (cfg.treasuryAddress) {
      const addr = String(cfg.treasuryAddress);
      tasks.push(
        row({
          group: 'treasury',
          chain: '0G',
          label: '0G — treasury',
          address: addr,
          asset: cfg.nativeCurrency.symbol,
          explorerUrl: explorerEvm('zg', addr),
          fetch: () =>
            evmNativeBalance(rpc, cfg.chainId, cfg.chainName, cfg.nativeCurrency.symbol, addr),
        }),
      );
    }
    if (evmFee) {
      tasks.push(
        row({
          group: 'fee',
          chain: '0G',
          label: '0G — platform fee wallet (EVM)',
          address: evmFee,
          asset: cfg.nativeCurrency.symbol,
          explorerUrl: explorerEvm('zg', evmFee),
          fetch: () => evmNativeBalance(rpc, cfg.chainId, cfg.chainName, cfg.nativeCurrency.symbol, evmFee),
        }),
      );
    }
  } catch {
    /* skip */
  }

  // Solana
  const solTreasury = process.env.NEXT_PUBLIC_SOL_TREASURY_ADDRESS?.trim();
  const solFee = process.env.NEXT_PUBLIC_PLATFORM_FEE_WALLET_SOL?.trim();
  const solRpc =
    process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta'
      ? 'https://api.mainnet-beta.solana.com'
      : process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  if (solTreasury) {
    tasks.push(
      row({
        group: 'treasury',
        chain: 'SOL',
        label: 'Solana — treasury',
        address: solTreasury,
        asset: 'SOL',
        explorerUrl: `https://solscan.io/account/${encodeURIComponent(solTreasury)}`,
        fetch: () => solNativeLamports(solRpc, solTreasury),
      }),
    );
  }
  if (solFee) {
    tasks.push(
      row({
        group: 'fee',
        chain: 'SOL',
        label: 'Solana — platform fee wallet',
        address: solFee,
        asset: 'SOL',
        explorerUrl: `https://solscan.io/account/${encodeURIComponent(solFee)}`,
        fetch: () => solNativeLamports(solRpc, solFee),
      }),
    );
  }

  // Sui USDC
  const suiRpc = process.env.NEXT_PUBLIC_SUI_RPC_ENDPOINT?.trim();
  const suiTreasury = process.env.NEXT_PUBLIC_SUI_TREASURY_ADDRESS?.trim();
  const suiUsdcType = process.env.NEXT_PUBLIC_USDC_TYPE?.trim();
  const suiFee = process.env.NEXT_PUBLIC_PLATFORM_FEE_WALLET_SUI?.trim();
  if (suiRpc && suiTreasury && suiUsdcType) {
    tasks.push(
      row({
        group: 'treasury',
        chain: 'SUI',
        label: 'Sui — treasury (USDC)',
        address: suiTreasury,
        asset: 'USDC',
        explorerUrl: `https://suiscan.xyz/mainnet/account/${encodeURIComponent(suiTreasury)}`,
        fetch: () => suiUsdcBalance(suiRpc, suiTreasury, suiUsdcType),
      }),
    );
  }
  if (suiRpc && suiFee && suiUsdcType) {
    tasks.push(
      row({
        group: 'fee',
        chain: 'SUI',
        label: 'Sui — platform fee wallet (USDC)',
        address: suiFee,
        asset: 'USDC',
        explorerUrl: `https://suiscan.xyz/mainnet/account/${encodeURIComponent(suiFee)}`,
        fetch: () => suiUsdcBalance(suiRpc, suiFee, suiUsdcType),
      }),
    );
  }

  // OneChain OCT
  try {
    const oc = getOneChainConfig();
    if (oc.treasuryAddress && oc.rpcEndpoint) {
      tasks.push(
        row({
          group: 'treasury',
          chain: 'OCT',
          label: 'OneChain — treasury (OCT)',
          address: oc.treasuryAddress,
          asset: 'OCT',
          explorerUrl: `https://explorer-testnet.onechain.one/address/${encodeURIComponent(oc.treasuryAddress)}`,
          fetch: () => onechainOctBalance(oc.rpcEndpoint, oc.treasuryAddress, oc.octCoinType, oc.decimals),
        }),
      );
    }
    // Fee wallet for OCT is the shared EVM address in env — not a Sui/OneChain address; skip to avoid bogus RPC errors.
  } catch {
    /* skip */
  }

  // Stellar
  const xlmTreasury = process.env.NEXT_PUBLIC_STELLAR_TREASURY_ADDRESS?.trim();
  const xlmFee = process.env.NEXT_PUBLIC_PLATFORM_FEE_WALLET_XLM?.trim();
  const horizon = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL?.trim() || 'https://horizon.stellar.org';
  if (xlmTreasury) {
    tasks.push(
      row({
        group: 'treasury',
        chain: 'XLM',
        label: 'Stellar — treasury',
        address: xlmTreasury,
        asset: 'XLM',
        explorerUrl: `https://stellar.expert/explorer/public/account/${encodeURIComponent(xlmTreasury)}`,
        fetch: () => stellarNativeXlm(horizon, xlmTreasury),
      }),
    );
  }
  if (xlmFee) {
    tasks.push(
      row({
        group: 'fee',
        chain: 'XLM',
        label: 'Stellar — platform fee wallet',
        address: xlmFee,
        asset: 'XLM',
        explorerUrl: `https://stellar.expert/explorer/public/account/${encodeURIComponent(xlmFee)}`,
        fetch: () => stellarNativeXlm(horizon, xlmFee),
      }),
    );
  }

  // Tezos
  const xtzTreasury = process.env.NEXT_PUBLIC_TEZOS_TREASURY_ADDRESS?.trim();
  const xtzFee = process.env.NEXT_PUBLIC_PLATFORM_FEE_WALLET_XTZ?.trim();
  const xtzRpc = process.env.NEXT_PUBLIC_TEZOS_RPC_URL?.trim() || 'https://rpc.tzkt.io/mainnet';
  if (xtzTreasury) {
    tasks.push(
      row({
        group: 'treasury',
        chain: 'XTZ',
        label: 'Tezos — treasury',
        address: xtzTreasury,
        asset: 'XTZ',
        explorerUrl: `https://tzkt.io/${encodeURIComponent(xtzTreasury)}`,
        fetch: () => tezosNativeXtz(xtzRpc, xtzTreasury),
      }),
    );
  }
  if (xtzFee) {
    tasks.push(
      row({
        group: 'fee',
        chain: 'XTZ',
        label: 'Tezos — platform fee wallet',
        address: xtzFee,
        asset: 'XTZ',
        explorerUrl: `https://tzkt.io/${encodeURIComponent(xtzFee)}`,
        fetch: () => tezosNativeXtz(xtzRpc, xtzFee),
      }),
    );
  }

  // NEAR
  const nearTreasury = process.env.NEXT_PUBLIC_NEAR_TREASURY_ADDRESS?.trim();
  const nearFee = process.env.NEXT_PUBLIC_PLATFORM_FEE_WALLET_NEAR?.trim();
  const nearNode = 'https://rpc.mainnet.near.org';
  if (nearTreasury) {
    tasks.push(
      row({
        group: 'treasury',
        chain: 'NEAR',
        label: 'NEAR — treasury',
        address: nearTreasury,
        asset: 'NEAR',
        explorerUrl: `https://nearblocks.io/address/${encodeURIComponent(nearTreasury)}`,
        fetch: () => nearNativeNear(nearNode, nearTreasury),
      }),
    );
  }
  if (nearFee) {
    tasks.push(
      row({
        group: 'fee',
        chain: 'NEAR',
        label: 'NEAR — platform fee wallet',
        address: nearFee,
        asset: 'NEAR',
        explorerUrl: `https://nearblocks.io/address/${encodeURIComponent(nearFee)}`,
        fetch: () => nearNativeNear(nearNode, nearFee),
      }),
    );
  }

  // Starknet STRK (ERC-20)
  const snCfg = getStarknetConfig();
  if (snCfg.treasuryAddress) {
    tasks.push(
      row({
        group: 'treasury',
        chain: 'STRK',
        label: 'Starknet — treasury (STRK token)',
        address: snCfg.treasuryAddress,
        asset: 'STRK',
        explorerUrl: `https://starkscan.co/contract/${encodeURIComponent(snCfg.treasuryAddress)}`,
        fetch: async () => {
          const { getSTRKBalance } = await import('@/lib/starknet/client');
          return getSTRKBalance(snCfg.treasuryAddress);
        },
      }),
    );
  }
  const strkFee = process.env.NEXT_PUBLIC_PLATFORM_FEE_WALLET_STRK?.trim();
  if (strkFee) {
    tasks.push(
      row({
        group: 'fee',
        chain: 'STRK',
        label: 'Starknet — platform fee wallet (STRK token)',
        address: strkFee,
        asset: 'STRK',
        explorerUrl: `https://starkscan.co/contract/${encodeURIComponent(strkFee)}`,
        fetch: async () => {
          const { getSTRKBalance } = await import('@/lib/starknet/client');
          return getSTRKBalance(strkFee);
        },
      }),
    );
  }

  // Initia
  try {
    const ic = getInitiaConfig();
    if (ic.treasuryAddress && ic.restUrl) {
      tasks.push(
        row({
          group: 'treasury',
          chain: 'INIT',
          label: 'Initia — treasury',
          address: ic.treasuryAddress,
          asset: 'INIT',
          explorerUrl: `https://scan.initia.xyz/${encodeURIComponent(ic.chainId)}/accounts/${encodeURIComponent(ic.treasuryAddress)}`,
          fetch: () => initiaUinit(ic.restUrl, ic.treasuryAddress, ic.denom),
        }),
      );
    }
  } catch {
    /* skip */
  }

  const rows = await Promise.all(tasks);

  // De-dupe identical chain+group+address+asset (e.g. same EVM fee key on multiple rows)
  const seen = new Set<string>();
  const unique: TreasuryBalanceRow[] = [];
  for (const r of rows) {
    const k = `${r.group}|${r.chain}|${r.address}|${r.asset}|${r.label}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(r);
  }

  unique.sort((a, b) => {
    const g = a.group.localeCompare(b.group);
    if (g !== 0) return g;
    return a.chain.localeCompare(b.chain) || a.label.localeCompare(b.label);
  });

  return { generatedAt: new Date().toISOString(), rows: unique };
}

/**
 * Global wallet ban list — blocks deposits, bets, payouts, and withdrawals
 * across all currencies for a given chain address.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Normalize for storage/lookup: EVM hex lowercased, other chains unchanged (e.g. Solana base58). */
export function normalizeWalletForBanKey(address: string): string {
  const t = address.trim();
  if (t.startsWith('0x')) return t.toLowerCase();
  return t;
}

/** Emergency list without DB migration — comma-separated in BANNED_WALLET_ADDRESSES */
export function isBannedViaEnv(address: string): boolean {
  const raw = process.env.BANNED_WALLET_ADDRESSES || '';
  if (!raw.trim()) return false;
  const key = normalizeWalletForBanKey(address);
  return raw
    .split(',')
    .map(s => normalizeWalletForBanKey(s.trim()))
    .filter(Boolean)
    .includes(key);
}

/**
 * True if the wallet is on the global ban list (env and/or `banned_wallets` table).
 * On lookup errors, falls back to env-only so a missing table does not brick the app.
 */
export async function isWalletGloballyBanned(
  client: SupabaseClient,
  address: string
): Promise<boolean> {
  if (isBannedViaEnv(address)) return true;
  const key = normalizeWalletForBanKey(address);
  const { data, error } = await client
    .from('banned_wallets')
    .select('wallet_address')
    .eq('wallet_address', key)
    .maybeSingle();

  if (error) {
    console.warn('[walletBan] banned_wallets lookup failed:', error.message);
    return isBannedViaEnv(address);
  }
  return !!data;
}

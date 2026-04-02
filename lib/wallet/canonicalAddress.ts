/**
 * Canonical `user_address` / `wallet_address` for house ledger tables
 * (`user_balances`, `balance_audit_log`, `bet_history`, `user_sessions`, etc.).
 *
 * - EVM `0x…` hex: lowercase (matches on-chain equality; avoids checksum splits).
 * - Other chains (Solana base58, etc.): trimmed only — preserves case.
 */

export function canonicalHouseUserAddress(address: string): string {
  const t = address.trim();
  if (t.startsWith('0x')) return t.toLowerCase();
  return t;
}

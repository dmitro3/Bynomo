/**
 * Build possible DB variants for a wallet string (EVM case, legacy lowercased non-EVM).
 */

export function walletAddressSearchVariants(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  const s = new Set<string>([t]);
  if (t.startsWith('0x')) {
    s.add(t.toLowerCase());
    return [...s];
  }
  // Non-EVM: keep original; some code paths may have lowercased incorrectly
  if (t.length >= 32) s.add(t.toLowerCase());
  return [...s];
}

export function isDemoWalletAddress(addr: string | null | undefined): boolean {
  return !!addr && addr.toLowerCase().startsWith('0xdemo');
}

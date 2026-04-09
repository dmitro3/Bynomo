/**
 * Headers for browser → same-origin balance API calls when BALANCE_INTERNAL_SECRET is configured.
 */
export function balanceMutationHeaders(): Record<string, string> {
  const key =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_BALANCE_API_KEY?.trim()
      : undefined;
  if (!key) return {};
  return { 'x-bynomo-balance-key': key };
}

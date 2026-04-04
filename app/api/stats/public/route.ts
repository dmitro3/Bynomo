/**
 * GET /api/stats/public
 * Public (unauthenticated) platform stats for the landing page trust section.
 * Returns only aggregate numbers — no wallet addresses or user-identifiable data.
 * Cached for 5 minutes via Next.js revalidate.
 */

import { NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';
import { isDemoBetHistoryRow } from '@/lib/admin/walletAddressVariants';

export const revalidate = 300; // 5 min cache

export async function GET() {
  try {
    const [betsRes, balancesRes, depositsRes] = await Promise.all([
      supabase
        .from('bet_history')
        .select('id, wallet_address, amount, won')
        .order('id', { ascending: true }),
      supabase
        .from('user_balances')
        .select('user_address, currency'),
      supabase
        .from('balance_audit_log')
        .select('user_address, currency, operation_type, amount')
        .eq('operation_type', 'deposit'),
    ]);

    const allBets = (betsRes.data ?? []).filter(b => !isDemoBetHistoryRow(b));
    const totalBets = allBets.length;
    const totalWins = allBets.filter(b => b.won).length;

    // Unique real wallets that ever placed a bet
    const uniqueWallets = new Set(
      allBets.map(b => (b.wallet_address ?? '').toLowerCase()).filter(Boolean)
    ).size;

    // Unique chains/currencies that have real deposits
    const depositCurrencies = new Set(
      (depositsRes.data ?? []).map(d => d.currency?.toUpperCase()).filter(Boolean)
    );
    const chainsSupported = depositCurrencies.size || 12; // fallback to known count

    // Total deposited volume (across all real deposits)
    // We keep this chain-agnostic (sum of native units) and show count instead of USD
    const totalDeposits = (depositsRes.data ?? []).length;

    return NextResponse.json({
      totalBets,
      totalWins,
      uniqueWallets,
      chainsSupported,
      totalDeposits,
      winRate: totalBets > 0 ? Math.round((totalWins / totalBets) * 100) : 0,
    });
  } catch (e: any) {
    console.error('[stats/public]', e);
    // Return safe fallback so the landing page never errors
    return NextResponse.json({
      totalBets: 0,
      totalWins: 0,
      uniqueWallets: 0,
      chainsSupported: 12,
      totalDeposits: 0,
      winRate: 0,
    });
  }
}

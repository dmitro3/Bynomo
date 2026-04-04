import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/requireAdminAuth';
import { buildTreasuryBalanceSnapshot } from '@/lib/admin/treasuryBalanceSnapshot';

/**
 * On-chain treasury + platform fee wallet balances (read-only RPC).
 * Requires admin session cookie.
 */
export async function GET(request: NextRequest) {
  const deny = requireAdminAuth(request);
  if (deny) return deny;

  try {
    const snapshot = await buildTreasuryBalanceSnapshot();
    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Snapshot failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

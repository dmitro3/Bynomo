/**
 * Server-side referral API — replaces all direct Supabase client calls from
 * referralSlice.ts. The browser never touches Supabase directly.
 *
 * GET  /api/referral?address=<wallet>   — fetch or create referral record
 * POST /api/referral                    — register a new user with a ref code
 * GET  /api/referral?leaderboard=1      — top 20 referrers (addresses truncated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';

function truncate(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Leaderboard
  if (searchParams.get('leaderboard') === '1') {
    const { data, error } = await supabase
      .from('user_referrals')
      .select('user_address, referral_count, referral_code')
      .order('referral_count', { ascending: false })
      .limit(20);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      leaderboard: (data ?? []).map(r => ({
        user_address: truncate(r.user_address),
        referral_count: r.referral_count,
        referral_code: r.referral_code,
      })),
    });
  }

  // Single wallet info
  const address = searchParams.get('address')?.trim();
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

  const { data, error } = await supabase
    .from('user_referrals')
    .select('referral_code, referral_count, referred_by')
    .eq('user_address', address)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ referral: data ?? null });
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, referredByCode } = body as { address: string; referredByCode?: string };
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

    // Idempotent — return existing record if already registered
    const { data: existing } = await supabase
      .from('user_referrals')
      .select('referral_code, referral_count')
      .eq('user_address', address)
      .single();

    if (existing) {
      return NextResponse.json({ referral_code: existing.referral_code, referral_count: existing.referral_count });
    }

    // Generate a unique referral code
    const shortAddr = address.slice(-4).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `bynomo-${shortAddr}${randomStr}`;

    // Resolve referrer address from code (server validates — no client trust)
    let referredByAddress: string | null = null;
    if (referredByCode) {
      const { data: refUser } = await supabase
        .from('user_referrals')
        .select('user_address')
        .eq('referral_code', referredByCode)
        .single();
      if (refUser && refUser.user_address !== address) {
        referredByAddress = refUser.user_address;
      }
    }

    const { data, error } = await supabase
      .from('user_referrals')
      .insert({ user_address: address, referral_code: code, referred_by: referredByAddress, referral_count: 0 })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Increment referrer's count server-side (no client can fake this)
    if (referredByAddress) {
      await supabase.rpc('increment_referral_count', { referrer_address: referredByAddress });
    }

    return NextResponse.json({ referral_code: data.referral_code, referral_count: data.referral_count });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 });
  }
}

/**
 * API Route: Leaderboard
 * GET /api/bets/leaderboard?limit=10
 * 
 * Returns top winners ranked by total profit
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

type LeaderboardRow = {
  wallet_address: string;
  total_bets: number;
  wins: number;
  losses: number;
  total_wagered: number;
  total_payout: number;
  net_profit: number;
  win_rate: number;
  primary_network: string;
  username?: string | null;
};

// Simple in-memory cache to shield Supabase from repeated leaderboard hits.
// This lives per lambda/edge instance but dramatically reduces load in practice.
let cachedLeaderboard: { data: LeaderboardRow[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

async function fetchLeaderboardFromSupabase(limit: number): Promise<LeaderboardRow[]> {
  // Fetch raw bet history
  const { data, error } = await supabase
    .from('bet_history')
    .select('wallet_address, amount, payout, won, network');

  if (error) {
    console.error('Supabase leaderboard error:', error);
    throw new Error('Failed to fetch leaderboard from Supabase');
  }

  // Aggregate per wallet
  const walletStats: Record<string, {
    wallet_address: string;
    total_bets: number;
    wins: number;
    losses: number;
    total_wagered: number;
    total_payout: number;
    net_profit: number;
    networks: Record<string, number>;
  }> = {};

  (data || []).forEach((row: any) => {
    const addr = row.wallet_address;
    const net = row.network || 'BNB';
    if (!walletStats[addr]) {
      walletStats[addr] = {
        wallet_address: addr,
        total_bets: 0,
        wins: 0,
        losses: 0,
        total_wagered: 0,
        total_payout: 0,
        net_profit: 0,
        networks: {},
      };
    }
    walletStats[addr].total_bets += 1;
    walletStats[addr].total_wagered += parseFloat(row.amount) || 0;
    walletStats[addr].networks[net] = (walletStats[addr].networks[net] || 0) + 1;

    if (row.won) {
      walletStats[addr].wins += 1;
      walletStats[addr].total_payout += parseFloat(row.payout) || 0;
    } else {
      walletStats[addr].losses += 1;
    }
  });

  const leaderboard = Object.values(walletStats)
    .map((s) => {
      const [primary_network] =
        Object.entries(s.networks).sort((a, b) => b[1] - a[1])[0] || ['BNB', 0];
      return {
        wallet_address: s.wallet_address,
        total_bets: s.total_bets,
        wins: s.wins,
        losses: s.losses,
        total_wagered: s.total_wagered,
        total_payout: s.total_payout,
        net_profit: s.total_payout - s.total_wagered,
        win_rate: s.total_bets > 0 ? (s.wins / s.total_bets) * 100 : 0,
        primary_network,
      };
    })
    .sort((a, b) => b.net_profit - a.net_profit)
    .slice(0, limit);

  if (leaderboard.length === 0) {
    return leaderboard;
  }

  // Fetch usernames for the leaderboard entries
  const walletAddresses = leaderboard.map((l) => l.wallet_address);
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_address, username')
    .in('user_address', walletAddresses);

  if (profileError) {
    console.warn('Supabase leaderboard profile error:', profileError);
  }

  const usernameMap: Record<string, string> = {};
  profileData?.forEach((p) => {
    usernameMap[p.user_address] = p.username;
  });

  return leaderboard.map((l) => ({
    ...l,
    username: usernameMap[l.wallet_address] || null,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const now = Date.now();

    // Serve from cache when fresh
    if (cachedLeaderboard && now - cachedLeaderboard.fetchedAt < CACHE_TTL_MS) {
      return NextResponse.json({ leaderboard: cachedLeaderboard.data, cached: true });
    }

    // Add a hard timeout so we don't hang for minutes on upstream 522s.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s

    let data: LeaderboardRow[];
    try {
      // Note: supabase-js doesn't take AbortController directly here, so we just
      // bound our own Promise timeout around the fetch function.
      const result = await Promise.race([
        fetchLeaderboardFromSupabase(limit),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Leaderboard fetch timeout')), 10_000);
        }),
      ]);
      data = result as LeaderboardRow[];
    } finally {
      clearTimeout(timeout);
    }

    cachedLeaderboard = { data, fetchedAt: now };
    return NextResponse.json({ leaderboard: data, cached: false });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);

    // If we have a recent cached snapshot, serve it instead of outright failing
    if (cachedLeaderboard) {
      return NextResponse.json(
        {
          leaderboard: cachedLeaderboard.data,
          cached: true,
          stale: true,
          error: 'Upstream leaderboard provider unavailable, serving cached data',
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { error: 'Leaderboard temporarily unavailable, please try again soon.' },
      { status: 503 },
    );
  }
}

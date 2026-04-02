import { NextRequest, NextResponse } from 'next/server';
import { normalizeWalletForBanKey } from '@/lib/bans/walletBan';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';
import { requireAdminAuth } from '@/lib/admin/requireAdminAuth';

/** PostgREST default max rows per request is often 1000 — page until exhausted. */
const BET_HISTORY_PAGE = 1000;
const SESSION_PAGE = 1000;
/** Match `app/api/session/ping/route.ts` — session end inferred from last ping + tail if still open. */
const SESSION_IDLE_TAIL_MS = 90_000;

function sessionDurationSeconds(
    row: { started_at: string; last_ping_at: string; ended_at: string | null },
    nowMs: number,
): number {
    const end = row.ended_at
        ? new Date(row.ended_at).getTime()
        : Math.min(new Date(row.last_ping_at).getTime() + SESSION_IDLE_TAIL_MS, nowMs);
    const start = new Date(row.started_at).getTime();
    return Math.max(0, Math.floor((end - start) / 1000));
}

async function fetchAllUserSessionsForStats() {
    const columns = 'wallet_address, started_at, last_ping_at, ended_at';
    const rows: {
        wallet_address: string;
        started_at: string;
        last_ping_at: string;
        ended_at: string | null;
    }[] = [];
    let from = 0;
    for (;;) {
        const { data, error } = await supabase
            .from('user_sessions')
            .select(columns)
            .order('started_at', { ascending: true })
            .range(from, from + SESSION_PAGE - 1);
        if (error) throw new Error(error.message);
        const chunk = data ?? [];
        rows.push(...(chunk as typeof rows));
        if (chunk.length < SESSION_PAGE) break;
        from += SESSION_PAGE;
    }
    return rows;
}

async function fetchAllBetHistoryRowsForStats() {
    const columns = 'id, wallet_address, amount, payout, won, network';
    const rows: any[] = [];
    let from = 0;
    for (;;) {
        const { data, error } = await supabase
            .from('bet_history')
            .select(columns)
            .order('id', { ascending: true })
            .range(from, from + BET_HISTORY_PAGE - 1);
        if (error) throw new Error(error.message);
        const chunk = data ?? [];
        rows.push(...chunk);
        if (chunk.length < BET_HISTORY_PAGE) break;
        from += BET_HISTORY_PAGE;
    }
    return rows;
}

export async function GET(request: NextRequest) {
    const deny = requireAdminAuth(request);
    if (deny) return deny;
    try {
        // 1. Aggregate bet history by demo vs real.
        // Demo bets are stored with demo wallets (wallet_address starts with 0xdemo / 0xDEMO).
        const bets = await fetchAllBetHistoryRowsForStats();
        const isDemoWallet = (walletAddress: string | null | undefined) =>
            !!walletAddress && walletAddress.toLowerCase().startsWith('0xdemo');
        /** Demo play uses bet ids like "demo-<timestamp>" while still using the user's real wallet. */
        const isDemoBetId = (id: string | null | undefined) =>
            !!id && String(id).toLowerCase().startsWith('demo-');

        const demoBets = bets.filter(
            b => isDemoWallet((b as any).wallet_address) || isDemoBetId((b as any).id)
        );
        const realBets = bets.filter(
            b => !isDemoWallet((b as any).wallet_address) && !isDemoBetId((b as any).id)
        );

        const sum = (rows: any[], field: string) => rows.reduce((acc, r) => acc + Number(r[field] ?? 0), 0);

        /** Per-network stake, payout, and house PnL in that network's native units (not USD). */
        const aggregateByNetwork = (rows: any[]) => {
            const m: Record<string, { volume: number; payout: number; platformPnL: number }> = {};
            for (const r of rows) {
                const net = String((r as any).network ?? 'UNKNOWN').trim() || 'UNKNOWN';
                if (!m[net]) m[net] = { volume: 0, payout: 0, platformPnL: 0 };
                m[net].volume += Number((r as any).amount ?? 0);
                m[net].payout += Number((r as any).payout ?? 0);
            }
            for (const k of Object.keys(m)) {
                m[k].platformPnL = m[k].volume - m[k].payout;
            }
            return m;
        };

        const demoTotalVolume = sum(demoBets, 'amount');
        const demoTotalPayout = sum(demoBets, 'payout');
        const demoTotalBets = demoBets.length;
        const demoPlatformPnL = demoTotalVolume - demoTotalPayout;
        const demoPlatformPnLByNetwork = aggregateByNetwork(demoBets);

        const realTotalVolume = sum(realBets, 'amount');
        const realTotalPayout = sum(realBets, 'payout');
        const realTotalBets = realBets.length;
        const realPlatformPnL = realTotalVolume - realTotalPayout;
        const realPlatformPnLByNetwork = aggregateByNetwork(realBets);

        const norm = (addr: string) => normalizeWalletForBanKey(String(addr));

        const demoUserKeys = new Set(
            demoBets.map(b => (b as any).wallet_address).filter(Boolean).map((w: string) => norm(w)),
        );
        const realUserKeys = new Set(
            realBets.map(b => (b as any).wallet_address).filter(Boolean).map((w: string) => norm(w)),
        );

        const { data: bannedRows, error: bannedError } = await supabase
            .from('banned_wallets')
            .select('wallet_address');
        if (bannedError) {
            console.warn('[admin/stats] banned_wallets:', bannedError.message);
        }
        for (const row of bannedRows ?? []) {
            const w = (row as { wallet_address?: string }).wallet_address;
            if (!w) continue;
            const key = norm(w);
            if (isDemoWallet(w)) demoUserKeys.add(key);
            else realUserKeys.add(key);
        }

        // 2. Referrals (split by demo vs real wallet)
        const { data: referralRows } = await supabase
            .from('user_referrals')
            .select('user_address, referral_count');

        const referrals = referralRows ?? [];
        const demoTotalReferrals = referrals
            .filter(r => isDemoWallet((r as any).user_address))
            .reduce((acc, r) => acc + Number((r as any).referral_count ?? 0), 0);
        const realTotalReferrals = referrals
            .filter(r => !isDemoWallet((r as any).user_address))
            .reduce((acc, r) => acc + Number((r as any).referral_count ?? 0), 0);

        // 3. Balances per currency
        const { data: balanceData } = await supabase
            .from('user_balances')
            .select('currency, balance');

        const currencyStats: Record<string, { totalBalance: number, userCount: number }> = {};

        balanceData?.forEach(b => {
            if (!currencyStats[b.currency]) {
                currencyStats[b.currency] = { totalBalance: 0, userCount: 0 };
            }
            currencyStats[b.currency].totalBalance += Number(b.balance);
            currencyStats[b.currency].userCount += 1;
        });

        // 4. Average session dwell (user_sessions / session ping tracker)
        let averageSessionSecondsReal = 0;
        let averageSessionSecondsDemo = 0;
        let sessionCountReal = 0;
        let sessionCountDemo = 0;
        try {
            const nowMs = Date.now();
            const sessionRows = await fetchAllUserSessionsForStats();
            let sumReal = 0;
            let sumDemo = 0;
            for (const s of sessionRows) {
                const sec = sessionDurationSeconds(s, nowMs);
                if (isDemoWallet(s.wallet_address)) {
                    sumDemo += sec;
                    sessionCountDemo++;
                } else {
                    sumReal += sec;
                    sessionCountReal++;
                }
            }
            averageSessionSecondsReal = sessionCountReal > 0 ? sumReal / sessionCountReal : 0;
            averageSessionSecondsDemo = sessionCountDemo > 0 ? sumDemo / sessionCountDemo : 0;
        } catch (e: any) {
            console.warn('[admin/stats] user_sessions:', e?.message ?? e);
        }

        const demo = {
            totalVolume: demoTotalVolume,
            totalBets: demoTotalBets,
            platformPnL: demoPlatformPnL,
            /** Native units per `network` — meaningful; top-level platformPnL mixes chains (informational only). */
            platformPnLByNetwork: demoPlatformPnLByNetwork,
            totalUsers: demoUserKeys.size,
            totalReferrals: demoTotalReferrals,
            averageSessionSeconds: averageSessionSecondsDemo,
            sessionSampleCount: sessionCountDemo,
        };

        const real = {
            totalVolume: realTotalVolume,
            totalBets: realTotalBets,
            platformPnL: realPlatformPnL,
            platformPnLByNetwork: realPlatformPnLByNetwork,
            totalUsers: realUserKeys.size,
            totalReferrals: realTotalReferrals,
            averageSessionSeconds: averageSessionSecondsReal,
            sessionSampleCount: sessionCountReal,
        };

        return NextResponse.json({
            // Backward compatible top-level fields (overall)
            totalVolume: demoTotalVolume + realTotalVolume,
            totalBets: demoTotalBets + realTotalBets,
            totalUsers: demoUserKeys.size + realUserKeys.size,
            platformPnL: demoPlatformPnL + realPlatformPnL,
            currencyStats,
            revenue: demoPlatformPnL + realPlatformPnL,
            // New split metrics
            demo,
            real,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

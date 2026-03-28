import { NextRequest, NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';

export async function GET(request: NextRequest) {
    try {
        // 1. Aggregate bet history by demo vs real.
        // Demo bets are stored with demo wallets (wallet_address starts with 0xdemo / 0xDEMO).
        const { data: betRows } = await supabase
            .from('bet_history')
            .select('id, wallet_address, amount, payout, won, network');

        const bets = betRows ?? [];
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

        const demoUniqueWallets = new Set(demoBets.map(b => (b as any).wallet_address).filter(Boolean));
        const realUniqueWallets = new Set(realBets.map(b => (b as any).wallet_address).filter(Boolean));

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

        const demo = {
            totalVolume: demoTotalVolume,
            totalBets: demoTotalBets,
            platformPnL: demoPlatformPnL,
            /** Native units per `network` — meaningful; top-level platformPnL mixes chains (informational only). */
            platformPnLByNetwork: demoPlatformPnLByNetwork,
            totalUsers: demoUniqueWallets.size,
            totalReferrals: demoTotalReferrals,
        };

        const real = {
            totalVolume: realTotalVolume,
            totalBets: realTotalBets,
            platformPnL: realPlatformPnL,
            platformPnLByNetwork: realPlatformPnLByNetwork,
            totalUsers: realUniqueWallets.size,
            totalReferrals: realTotalReferrals,
        };

        return NextResponse.json({
            // Backward compatible top-level fields (overall)
            totalVolume: demoTotalVolume + realTotalVolume,
            totalBets: demoTotalBets + realTotalBets,
            totalUsers: demoUniqueWallets.size + realUniqueWallets.size,
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

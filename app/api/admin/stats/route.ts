import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
    try {
        // 1. Aggregate bet history by demo vs real.
        // Demo bets are stored with demo wallets (wallet_address starts with 0xdemo / 0xDEMO).
        const { data: betRows } = await supabase
            .from('bet_history')
            .select('wallet_address, amount, payout, won');

        const bets = betRows ?? [];
        const isDemoWallet = (walletAddress: string | null | undefined) =>
            !!walletAddress && walletAddress.toLowerCase().startsWith('0xdemo');

        const demoBets = bets.filter(b => isDemoWallet((b as any).wallet_address));
        const realBets = bets.filter(b => !isDemoWallet((b as any).wallet_address));

        const sum = (rows: any[], field: string) => rows.reduce((acc, r) => acc + Number(r[field] ?? 0), 0);
        const demoTotalVolume = sum(demoBets, 'amount');
        const demoTotalPayout = sum(demoBets, 'payout');
        const demoTotalBets = demoBets.length;
        const demoPlatformPnL = demoTotalVolume - demoTotalPayout;

        const realTotalVolume = sum(realBets, 'amount');
        const realTotalPayout = sum(realBets, 'payout');
        const realTotalBets = realBets.length;
        const realPlatformPnL = realTotalVolume - realTotalPayout;

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
            totalUsers: demoUniqueWallets.size,
            totalReferrals: demoTotalReferrals,
        };

        const real = {
            totalVolume: realTotalVolume,
            totalBets: realTotalBets,
            platformPnL: realPlatformPnL,
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

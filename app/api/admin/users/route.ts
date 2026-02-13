import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
    try {
        // Fetch all user balances
        const { data: balances, error: balanceError } = await supabase
            .from('user_balances')
            .select('*')
            .order('updated_at', { ascending: false });

        if (balanceError) throw balanceError;

        // Fetch bet counts per user
        const { data: betCounts, error: betError } = await supabase
            .from('bet_history')
            .select('wallet_address, amount, payout, won');

        if (betError) throw betError;

        // Aggregate bet data by wallet address
        const userActivity: Record<string, { totalBets: number, totalVolume: number, wins: number }> = {};
        betCounts?.forEach(b => {
            if (!userActivity[b.wallet_address]) {
                userActivity[b.wallet_address] = { totalBets: 0, totalVolume: 0, wins: 0 };
            }
            userActivity[b.wallet_address].totalBets += 1;
            userActivity[b.wallet_address].totalVolume += Number(b.amount);
            if (b.won) userActivity[b.wallet_address].wins += 1;
        });

        // Merge balance data with aggregated activity
        const users = balances.map(b => ({
            ...b,
            activity: userActivity[b.user_address] || { totalBets: 0, totalVolume: 0, wins: 0 }
        }));

        return NextResponse.json({ users });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

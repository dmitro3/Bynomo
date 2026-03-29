import { NextRequest, NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';
import { isDemoBetHistoryRow } from '@/lib/admin/walletAddressVariants';

export async function GET(_request: NextRequest) {
    try {
        // All deposit / withdrawal events grouped by (user_address, currency)
        const { data: auditRows, error: auditErr } = await supabase
            .from('balance_audit_log')
            .select('user_address, currency, operation_type, amount')
            .in('operation_type', ['deposit', 'withdrawal']);

        if (auditErr) throw auditErr;

        // Current spendable balances per (user_address, currency)
        const { data: balanceRows, error: balErr } = await supabase
            .from('user_balances')
            .select('user_address, currency, balance');

        if (balErr) throw balErr;

        // Real bet counts/volume per wallet
        const { data: betRows, error: betErr } = await supabase
            .from('bet_history')
            .select('id, wallet_address, amount, payout, won');

        if (betErr) throw betErr;

        // User display names
        const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_address, username');

        const profileMap: Record<string, string> = {};
        (profiles ?? []).forEach((p: any) => { profileMap[p.user_address] = p.username; });

        // Aggregate audit events → deposited / withdrawn per (address, currency)
        type Row = {
            user_address: string;
            currency: string;
            total_deposited: number;
            total_withdrawn: number;
            current_balance: number;
            total_bets: number;
            total_wins: number;
            total_wagered: number;
            total_payout: number;
            username: string | null;
        };

        const key = (addr: string, cur: string) => `${addr}::${cur}`;
        const map: Record<string, Row> = {};

        (auditRows ?? []).forEach((r: any) => {
            const k = key(r.user_address, r.currency);
            if (!map[k]) map[k] = {
                user_address: r.user_address,
                currency: r.currency,
                total_deposited: 0,
                total_withdrawn: 0,
                current_balance: 0,
                total_bets: 0,
                total_wins: 0,
                total_wagered: 0,
                total_payout: 0,
                username: profileMap[r.user_address] ?? null,
            };
            if (r.operation_type === 'deposit')    map[k].total_deposited  += Number(r.amount);
            if (r.operation_type === 'withdrawal') map[k].total_withdrawn  += Number(r.amount);
        });

        // Fold in current balances (may include wallets with no audit rows yet)
        (balanceRows ?? []).forEach((b: any) => {
            const k = key(b.user_address, b.currency);
            if (!map[k]) map[k] = {
                user_address: b.user_address,
                currency: b.currency,
                total_deposited: 0,
                total_withdrawn: 0,
                current_balance: 0,
                total_bets: 0,
                total_wins: 0,
                total_wagered: 0,
                total_payout: 0,
                username: profileMap[b.user_address] ?? null,
            };
            map[k].current_balance = Number(b.balance);
        });

        // Fold in real bet stats
        (betRows ?? [])
            .filter((b: any) => !isDemoBetHistoryRow(b))
            .forEach((b: any) => {
                // Bet history only stores wallet_address (no explicit currency column
                // matching user_balances). Look for any row belonging to this address.
                const entries = Object.values(map).filter(r => r.user_address.toLowerCase() === (b.wallet_address ?? '').toLowerCase());
                entries.forEach(row => {
                    row.total_bets += 1;
                    row.total_wagered += Number(b.amount ?? 0);
                    row.total_payout  += Number(b.payout ?? 0);
                    if (b.won) row.total_wins += 1;
                });
            });

        // Build final array with derived fields
        const players = Object.values(map).map(r => ({
            ...r,
            // From user's perspective: money they got back vs money they put in.
            // Includes what's still sitting in their balance.
            net_pnl: (r.total_withdrawn + r.current_balance) - r.total_deposited,
            // From the house: positive = house profited
            house_pnl: r.total_deposited - (r.total_withdrawn + r.current_balance),
        }));

        // Sort by total_deposited desc
        players.sort((a, b) => b.total_deposited - a.total_deposited);

        return NextResponse.json({ players });
    } catch (e: any) {
        console.error('[player-ledger]', e);
        return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
    }
}

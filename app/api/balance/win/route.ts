/**
 * POST /api/balance/win endpoint
 * 
 * Credits winning amount to user's house balance.
 * Called when a bet is won in the instant-resolution system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';
import { canonicalHouseUserAddress } from '@/lib/wallet/canonicalAddress';

interface WinRequest {
    userAddress: string;
    winAmount: number;
    currency: string;
    betId: string;
}

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body: WinRequest = await request.json();
        const userAddress = body.userAddress;
        const winAmount = body.winAmount;
        const currency = (body.currency || 'BNB') as string;
        const betId = body.betId;

        // Validate required fields
        if (!userAddress || winAmount === undefined || winAmount === null) {
            return NextResponse.json(
                { error: 'Missing required fields: userAddress, winAmount' },
                { status: 400 }
            );
        }

        // Validate address using utility
        const { isValidAddress } = await import('@/lib/utils/address');
        if (!(await isValidAddress(userAddress))) {
            return NextResponse.json(
                { error: 'Invalid wallet address format' },
                { status: 400 }
            );
        }

        // Validate win amount is positive
        if (winAmount <= 0) {
            return NextResponse.json(
                { error: 'Win amount must be greater than zero' },
                { status: 400 }
            );
        }

        const userKey = canonicalHouseUserAddress(userAddress);

        // ── Deduplication guard ───────────────────────────────────────────────
        // Prevent double-payout: if this bet_id already has a 'bet_won' entry in
        // the audit log, return success immediately without crediting again.
        if (betId) {
            const { data: existing } = await supabase
                .from('balance_audit_log')
                .select('id')
                .eq('operation_type', 'bet_won')
                .eq('transaction_hash', betId)
                .limit(1);
            if (existing && existing.length > 0) {
                console.warn(`[balance/win] duplicate payout blocked for betId=${betId}`);
                return NextResponse.json({ success: true, duplicate: true, winAmount });
            }
        }

        // ── NEW: Direct Payout for SOL and BNB ───────────────────────────────
        if (currency === 'SOL' || currency === 'BNB') {
            console.log(`[balance/win] Direct payout requested for ${currency}: ${winAmount} to ${userAddress}`);
            
            try {
                if ((currency as string) === 'SOL') {
                    const { sendSOLFromTreasury } = await import('@/lib/solana/treasury');
                    const signature = await sendSOLFromTreasury(userAddress, winAmount);
                    console.log(`[balance/win] SOL Payout Success: ${signature}`);
                } else if ((currency as string) === 'BNB') {
                    const { sendBNBFromTreasury } = await import('@/lib/bnb/treasury');
                    const hash = await sendBNBFromTreasury(userAddress, winAmount);
                    console.log(`[balance/win] BNB Payout Success: ${hash}`);
                }

                return NextResponse.json({
                    success: true,
                    payoutStatus: 'sent_on_chain',
                    winAmount: winAmount
                });
            } catch (payoutErr: any) {
                console.error(`[balance/win] Failed to send ${currency} payout:`, payoutErr);
                // We still want to log the win even if automated payout fails (for manual retry)
                // Fallback to recording the win in the audit log at least
            }
        }

        // Call credit_balance_for_payout stored procedure
        const { data, error } = await supabase.rpc('credit_balance_for_payout', {
            p_user_address: userKey,
            p_payout_amount: winAmount,
            p_currency: currency,
            p_bet_id: betId,
        });

        // Handle database errors
        if (error) {
            console.error('Database error in win credit:', error);
            return NextResponse.json(
                { error: 'Service temporarily unavailable. Please try again.' },
                { status: 503 }
            );
        }

        // Parse the JSON result from the stored procedure
        const result = data as { success: boolean; error: string | null; new_balance: number };

        // Check if the procedure reported an error
        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to credit winnings' },
                { status: 400 }
            );
        }

        // Return success with new balance
        return NextResponse.json({
            success: true,
            newBalance: parseFloat(result.new_balance.toString()),
            winAmount: winAmount
        });

    } catch (error) {
        console.error('Unexpected error in POST /api/balance/win:', error);
        return NextResponse.json(
            { error: 'An error occurred processing your request' },
            { status: 500 }
        );
    }
}

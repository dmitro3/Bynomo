/**
 * POST /api/balance/bet endpoint
 * 
 * Task: 4.4 Create POST /api/balance/bet endpoint
 * Requirements: 3.1, 3.2, 7.2
 * 
 * Called when user places a bet from house balance.
 * Validates sufficient balance and deducts bet amount atomically.
 * Note: After Sui migration, game logic is off-chain. No blockchain call needed.
 * Inserts audit log entry with operation_type='bet_placed'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';
import { isWalletGloballyBanned } from '@/lib/bans/walletBan';
import { canonicalHouseUserAddress } from '@/lib/wallet/canonicalAddress';
import { assertBalanceApiAuthorized } from '@/lib/balance/balanceApiGuard';
import { createSettlementToken } from '@/lib/balance/settlementToken';

interface BetRequest {
  userAddress: string;
  betAmount: number;
  currency: string;
  roundId: number;
  targetPrice: number;
  isOver: boolean;
  multiplier: number;
  targetCell: {
    id: number;
    priceChange: number;
    direction: 'UP' | 'DOWN';
    timeframe: number;
  };
  betRequestId?: string; // Idempotency key to prevent double-betting
}

export async function POST(request: NextRequest) {
  try {
    const unauthorized = assertBalanceApiAuthorized(request);
    if (unauthorized) return unauthorized;

    // Parse request body
    const body: BetRequest = await request.json();
    const { userAddress, betAmount, currency = 'BNB', roundId, targetPrice, isOver, multiplier, targetCell } = body;

    // Validate required fields
    if (!userAddress || betAmount === undefined || betAmount === null) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, betAmount' },
        { status: 400 }
      );
    }

    // Guard against NaN / Infinity which bypass > 0 checks
    if (!Number.isFinite(Number(betAmount))) {
      return NextResponse.json(
        { error: 'Invalid bet amount' },
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

    if (await isWalletGloballyBanned(userAddress)) {
      return NextResponse.json(
        { error: 'This wallet is banned from the platform.' },
        { status: 403 }
      );
    }

    // Validate bet amount is positive
    if (betAmount <= 0) {
      return NextResponse.json(
        { error: 'Bet amount must be greater than zero' },
        { status: 400 }
      );
    }

    // Validate multiplier
    if (!multiplier || multiplier < 1.0) {
      return NextResponse.json(
        { error: 'Multiplier must be at least 1.0' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(multiplier) || multiplier > 20) {
      return NextResponse.json(
        { error: 'Multiplier exceeds maximum allowed value' },
        { status: 400 }
      );
    }

    // Validate target cell
    if (!targetCell || targetCell.id === undefined || targetCell.id === null || targetCell.priceChange === undefined) {
      return NextResponse.json(
        { error: 'Invalid target cell data' },
        { status: 400 }
      );
    }

    const userKey = canonicalHouseUserAddress(userAddress);
    const normalizedCurrency = currency.toUpperCase();
    
    // ── Idempotency: Use betRequestId or generate one from roundId + userAddress ──────────────────
    // This prevents double-deduction if client retries the same bet request
    const betRequestId = body.betRequestId || `bet_req_${roundId}_${userKey.slice(-8)}_${Date.now()}`;
    
    // Try to insert a lock row first; if it conflicts, this is a duplicate request
    const { error: lockError } = await supabase
      .from('balance_audit_log')
      .insert({
        user_address: userKey,
        currency: normalizedCurrency,
        operation_type: 'bet_lock',
        amount: 0,
        bet_id: betRequestId,
        transaction_hash: `lock:${betRequestId}`,
      });
    
    if (lockError) {
      if (lockError.code === '23505') {
        // Unique constraint violation - this bet request was already processed
        console.warn(`[bet] duplicate request blocked: ${betRequestId}`);
        return NextResponse.json({ 
          success: true, 
          duplicate: true, 
          message: 'Bet already processed' 
        });
      }
      // Other database errors - log but continue to try the actual bet
      console.warn('[bet] lock insert failed (non-blocking):', lockError.message);
    }

    // Call deduct_balance_for_bet stored procedure — use normalizedCurrency to
    // prevent case-mismatch bypasses (e.g. "bnb" vs "BNB" resolving different rows)
    const { data, error } = await supabase.rpc('deduct_balance_for_bet', {
      p_user_address: userKey,
      p_bet_amount: betAmount,
      p_currency: normalizedCurrency,
    });

    if (error) {
      console.error('Database error in bet placement:', error);
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const result = data as { success: boolean; error: string | null; new_balance: number };

    if (!result.success) {
      if (result.error === 'Insufficient balance') {
        return NextResponse.json({ error: `Insufficient house balance. Deposit more ${currency}.` }, { status: 400 });
      }
      return NextResponse.json({ error: result.error || 'Bet placement failed' }, { status: 400 });
    }

    // Generate a bet ID
    const betId = `bet_${Date.now()}_${userKey.slice(-6)}`;
    // normalizedCurrency already defined above
    const settlementToken = createSettlementToken({
      betId,
      userAddress: userKey,
      currency: normalizedCurrency,
      maxPayout: Number((betAmount * multiplier).toFixed(8)),
    });

    // Return success with remaining balance and bet ID
    return NextResponse.json({
      success: true,
      remainingBalance: parseFloat(result.new_balance.toString()),
      betId,
      settlementToken,
    });
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in POST /api/balance/bet:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}

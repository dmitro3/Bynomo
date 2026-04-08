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
import { ethers } from 'ethers';
import { isWalletGloballyBanned } from '@/lib/bans/walletBan';
import { canonicalHouseUserAddress } from '@/lib/wallet/canonicalAddress';

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
}

export async function POST(request: NextRequest) {
  try {
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

    // Validate target cell
    if (!targetCell || targetCell.id === undefined || targetCell.id === null || targetCell.priceChange === undefined) {
      return NextResponse.json(
        { error: 'Invalid target cell data' },
        { status: 400 }
      );
    }

    const userKey = canonicalHouseUserAddress(userAddress);

    // Call deduct_balance_for_bet stored procedure
    const { data, error } = await supabase.rpc('deduct_balance_for_bet', {
      p_user_address: userKey,
      p_bet_amount: betAmount,
      p_currency: currency,
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

    // Return success with remaining balance and bet ID
    return NextResponse.json({
      success: true,
      remainingBalance: parseFloat(result.new_balance.toString()),
      betId,
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

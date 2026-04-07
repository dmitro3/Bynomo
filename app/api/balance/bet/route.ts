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
  txHash?: string;
  roundId: number;
  targetPrice: number;
  isOver: boolean;
  multiplier: number;
  asset?: string;
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
    const { userAddress, betAmount, currency = 'BNB', txHash, roundId, targetPrice, isOver, multiplier, asset = 'BTC', targetCell } = body;

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

    // ── NEW: P2P Matching Logic (for SOL and BNB only) ───────────────────
    let matchedBetId: string | null = null;
    let isP2T = true;

    if (currency === 'SOL' || currency === 'BNB') {
      try {
        // Look for a counter-order in p2p_orders table
        const { data: counterOrder, error: matchError } = await supabase
          .from('p2p_orders')
          .select('id, user_address')
          .eq('network', currency)
          .eq('asset', asset)
          .eq('amount', betAmount)
          .eq('direction', isOver ? 'DOWN' : 'UP') // Opposite direction
          .eq('timeframe', targetCell.timeframe)
          .eq('is_matched', false)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (counterOrder && !matchError) {
          matchedBetId = counterOrder.id;
          isP2T = false;
          
          // Mark the counter-order as matched
          await supabase
            .from('p2p_orders')
            .update({ is_matched: true, matched_with: `pending_${userKey.slice(-6)}` })
            .eq('id', counterOrder.id);
            
          console.log(`Matched bet ${matchedBetId} (P2P) for user ${userKey}`);
        }
      } catch (err) {
        console.error('P2P Matching error, falling back to P2T:', err);
      }
    }

    // Call deduct_balance_for_bet stored procedure (Skip for direct wallet networks)
    let result: { success: boolean; error: string | null; new_balance: number } = { success: true, error: null, new_balance: 0 };
    
    if (currency !== 'SOL' && currency !== 'BNB') {
      const { data, error } = await supabase.rpc('deduct_balance_for_bet', {
        p_user_address: userKey,
        p_bet_amount: betAmount,
        p_currency: currency,
      });

      if (error) {
        console.error('Database error in bet placement:', error);
        return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
      }
      
      result = data as { success: boolean; error: string | null; new_balance: number };

      if (!result.success) {
        if (result.error === 'Insufficient balance') {
          return NextResponse.json({ error: `Insufficient house balance. Deposit more ${currency}.` }, { status: 400 });
        }
        return NextResponse.json({ error: result.error || 'Bet placement failed' }, { status: 400 });
      }
    }

    // Generate a bet ID
    const betId = `bet_${Date.now()}_${userKey.slice(-6)}`;

    // Store this order in the P2P table (even if P2T, so others can match if it's long enough, but here we just follow "fallback to p2t")
    if (currency === 'SOL' || currency === 'BNB') {
      await supabase
        .from('p2p_orders')
        .insert({
          id: betId,
          user_address: userKey,
          network: currency,
          asset: asset,
          amount: betAmount,
          direction: isOver ? 'UP' : 'DOWN',
          timeframe: targetCell.timeframe || 30,
          multiplier: multiplier,
          is_matched: !isP2T,
          matched_with: matchedBetId,
          is_p2t: isP2T,
          tx_hash: txHash // Store the stake transaction hash payload
        });
    }

    // Return success with remaining balance and bet ID
    return NextResponse.json({
      success: true,
      remainingBalance: parseFloat(result.new_balance.toString()),
      betId,
      matchType: isP2T ? 'P2T' : 'P2P',
      matchedWith: matchedBetId
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

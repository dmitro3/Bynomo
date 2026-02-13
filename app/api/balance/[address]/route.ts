/**
 * GET /api/balance/[address] endpoint
 * 
 * Task: 4.1 Create GET /api/balance/[address] endpoint
 * Requirements: 2.3
 * 
 * Returns the current house balance for a user address.
 * Handles user not found by returning 0 balance.
 * Includes error handling for database errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { ethers } from 'ethers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { address } = await params;

    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || 'BNB';

    // Validate address (support BNB, Solana, Sui, Stellar and Tezos)
    let isValid = false;

    // Check if it's a valid EVM address (BNB)
    if (ethers.isAddress(address)) {
      isValid = true;
    } else if (/^0x[0-9a-fA-F]{64}$/.test(address)) {
      // Check if it's a valid Sui address
      isValid = true;
    } else if (/^(tz1|tz2|tz3|KT1)[a-zA-Z0-9]{33}$/.test(address)) {
      // Check if it's a valid Tezos address
      isValid = true;
    } else {
      // Check if it's a valid Solana address
      try {
        const { PublicKey } = await import('@solana/web3.js');
        const pk = new PublicKey(address);
        isValid = pk.toBuffer().length === 32;
      } catch (e) {
        // Check if it's a valid Stellar address (starts with G, 56 characters)
        if (/^G[A-Z2-7]{55}$/.test(address)) {
          isValid = true;
        } else {
          isValid = false;
        }
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid wallet address format (BNB, Solana, Sui, Stellar or Tezos required)' },
        { status: 400 }
      );
    }

    // Query user_balances table by user_address and currency
    const { data, error } = await supabase
      .from('user_balances')
      .select('balance, updated_at, user_tier')
      .eq('user_address', address)
      .eq('currency', currency)
      .single();

    // Handle database errors
    if (error) {
      // If user not found (PGRST116), return 0 balance
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          balance: 0,
          updatedAt: null,
          tier: 'free'
        });
      }

      // Log other database errors
      console.error('Database error fetching balance:', error);
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }

    // Return balance and updated_at timestamp
    return NextResponse.json({
      balance: parseFloat(data.balance),
      updatedAt: data.updated_at,
      tier: data.user_tier || 'free'
    });
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in GET /api/balance/[address]:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}

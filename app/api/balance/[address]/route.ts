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

    // Validate address (support both BNB and Solana)
    let isValid = false;

    // Check if it's a valid EVM address
    if (ethers.isAddress(address)) {
      isValid = true;
    } else {
      // Check if it's a valid Solana address
      try {
        const { PublicKey } = await import('@solana/web3.js');
        const pk = new PublicKey(address);
        isValid = true;
      } catch (e) {
        isValid = false;
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid wallet address format (BNB or Solana required)' },
        { status: 400 }
      );
    }

    // Query user_balances table by user_address
    const { data, error } = await supabase
      .from('user_balances')
      .select('balance, updated_at')
      .eq('user_address', address)
      .single();

    // Handle database errors
    if (error) {
      // If user not found (PGRST116), return 0 balance
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          balance: 0,
          updatedAt: null,
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

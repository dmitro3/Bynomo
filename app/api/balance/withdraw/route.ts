import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { ethers } from 'ethers';
import { transferBNBFromTreasury } from '@/lib/bnb/backend-client';

interface WithdrawRequest {
  userAddress: string;
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: WithdrawRequest = await request.json();
    const { userAddress, amount } = body;

    // Validate required fields
    if (!userAddress || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, amount' },
        { status: 400 }
      );
    }

    // Validate BNB address
    if (!ethers.isAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid BNB address format' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Withdrawal amount must be greater than zero' },
        { status: 400 }
      );
    }

    // 1. Get house balance from Supabase and validate
    const { data: userData, error: userError } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_address', userAddress)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User balance record not found' }, { status: 404 });
    }

    if (userData.balance < amount) {
      return NextResponse.json({ error: 'Insufficient house balance' }, { status: 400 });
    }

    // 2. Perform BNB transfer from treasury
    let signature: string;
    try {
      signature = await transferBNBFromTreasury(userAddress, amount);
    } catch (e: any) {
      console.error('BNB transfer failed:', e);
      return NextResponse.json({ error: `Withdrawal failed: ${e.message}` }, { status: 500 });
    }

    // 3. Update Supabase balance using RPC
    const { data, error } = await supabase.rpc('update_balance_for_withdrawal', {
      p_user_address: userAddress,
      p_withdrawal_amount: amount,
      p_transaction_hash: signature,
    });

    if (error) {
      console.error('Database error in withdrawal update:', error);
      // Note: At this point the BNB has been sent!
      return NextResponse.json(
        {
          success: true,
          txHash: signature,
          warning: 'BNB sent but balance update failed. Please contact support.',
          error: error.message
        },
        { status: 200 }
      );
    }

    const result = data as { success: boolean; error: string | null; new_balance: number };

    return NextResponse.json({
      success: true,
      txHash: signature,
      newBalance: result.new_balance,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/balance/withdraw:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

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

    // Validate Solana address
    try {
      new PublicKey(userAddress);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid Solana address format' },
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

    // 2. Perform Solana transfer from treasury
    const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.testnet.solana.com';
    const connection = new Connection(rpcEndpoint, 'confirmed');

    const secretKeyStr = process.env.SOLANA_TREASURY_SECRET_KEY;
    if (!secretKeyStr) {
      console.error('SOLANA_TREASURY_SECRET_KEY is not configured');
      return NextResponse.json({ error: 'Server configuration error: Treasury key missing' }, { status: 500 });
    }

    let treasuryKeypair: Keypair;
    try {
      if (secretKeyStr.trim().startsWith('[')) {
        // Handle JSON array format
        const secretKey = Uint8Array.from(JSON.parse(secretKeyStr));
        treasuryKeypair = Keypair.fromSecretKey(secretKey);
      } else {
        // Handle Base58 format
        treasuryKeypair = Keypair.fromSecretKey(bs58.decode(secretKeyStr));
      }
    } catch (e) {
      console.error('Failed to parse SOLANA_TREASURY_SECRET_KEY:', e);
      return NextResponse.json({ error: 'Server configuration error: Invalid treasury key' }, { status: 500 });
    }

    const recipientPubKey = new PublicKey(userAddress);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: recipientPubKey,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      })
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = treasuryKeypair.publicKey;

    const signature = await connection.sendTransaction(transaction, [treasuryKeypair]);

    // Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, 'confirmed');

    // 3. Update Supabase balance using RPC
    const { data, error } = await supabase.rpc('update_balance_for_withdrawal', {
      p_user_address: userAddress,
      p_withdrawal_amount: amount,
      p_transaction_hash: signature,
    });

    if (error) {
      console.error('Database error in withdrawal update:', error);
      // Note: At this point the SOL has been sent!
      return NextResponse.json(
        {
          success: true,
          txHash: signature,
          warning: 'SOL sent but balance update failed. Please contact support.',
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

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { normalizeWalletForBanKey } from '@/lib/bans/walletBan';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('banned_wallets')
      .select('wallet_address, reason, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ bans: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress.trim() : '';
    const reason =
      typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'Banned by administrator';

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
    }

    const key = normalizeWalletForBanKey(walletAddress);

    const { data, error } = await supabase
      .from('banned_wallets')
      .upsert({ wallet_address: key, reason }, { onConflict: 'wallet_address' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, ban: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('walletAddress') || '';
    const walletAddress = raw.trim();
    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress query param is required' }, { status: 400 });
    }

    const key = normalizeWalletForBanKey(walletAddress);

    const { error } = await supabase.from('banned_wallets').delete().eq('wallet_address', key);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

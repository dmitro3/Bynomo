import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/serviceClient';
import { normalizeWalletForBanKey } from '@/lib/bans/walletBan';

export async function GET() {
  try {
    const { data, error } = await supabaseService
      .from('banned_wallets')
      .select('wallet_address, reason, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      const hint = isMissingTableMessage(error.message)
        ? ' Run supabase/migrations/002_banned_wallets.sql (or full 001_complete_schema.sql) on your Supabase project.'
        : '';
      return NextResponse.json(
        { error: error.message + hint },
        { status: isMissingTableMessage(error.message) ? 503 : 500 }
      );
    }

    return NextResponse.json({ bans: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function isMissingTableMessage(msg: string) {
  return /schema cache|does not exist|banned_wallets/i.test(msg);
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

    const { data, error } = await supabaseService
      .from('banned_wallets')
      .upsert({ wallet_address: key, reason }, { onConflict: 'wallet_address' })
      .select()
      .single();

    if (error) {
      const hint = isMissingTableMessage(error.message)
        ? ' Run supabase/migrations/002_banned_wallets.sql (or full 001_complete_schema.sql) on your Supabase project.'
        : '';
      return NextResponse.json(
        { error: error.message + hint },
        { status: isMissingTableMessage(error.message) ? 503 : 500 }
      );
    }

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

    const { error } = await supabaseService.from('banned_wallets').delete().eq('wallet_address', key);

    if (error) {
      const hint = isMissingTableMessage(error.message)
        ? ' Run supabase/migrations/002_banned_wallets.sql (or full 001_complete_schema.sql) on your Supabase project.'
        : '';
      return NextResponse.json(
        { error: error.message + hint },
        { status: isMissingTableMessage(error.message) ? 503 : 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

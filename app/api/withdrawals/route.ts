import { NextRequest, NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    if (!address) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_address', address)
      .order('requested_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ withdrawals: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch withdrawals' }, { status: 500 });
  }
}


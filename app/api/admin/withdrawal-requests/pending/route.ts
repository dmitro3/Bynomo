import { NextRequest, NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';
import { requireAdminAuth } from '@/lib/admin/requireAdminAuth';

export async function GET(_request: NextRequest) {
  const deny = requireAdminAuth(_request);
  if (deny) return deny;
  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ requests: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load pending withdrawals' }, { status: 500 });
  }
}


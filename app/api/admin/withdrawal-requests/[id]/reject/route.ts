import { NextRequest, NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';
import { requireAdminAuth } from '@/lib/admin/requireAdminAuth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = requireAdminAuth(request);
  if (deny) return deny;
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid request id' }, { status: 400 });
    }

    const { data: req, error: reqError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (reqError) throw reqError;
    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (req.status !== 'pending') {
      return NextResponse.json({ error: `Cannot reject request in status: ${req.status}` }, { status: 400 });
    }

    const { error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'rejected',
        decided_at: new Date().toISOString(),
        decided_by: 'admin',
      })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to reject withdrawal request' }, { status: 500 });
  }
}

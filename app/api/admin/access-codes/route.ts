import { NextRequest, NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';
import { requireAdminAuth } from '@/lib/admin/requireAdminAuth';

// GET all access codes
export async function GET(request: NextRequest) {
    const deny = requireAdminAuth(request);
    if (deny) return deny;
    try {
        // Explicit column selection to avoid exposing sensitive future columns
        const { data, error } = await supabase
            .from('access_codes')
            .select('id, code, is_used, used_by, used_at, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ codes: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST generate new access codes
export async function POST(request: NextRequest) {
    const deny = requireAdminAuth(request);
    if (deny) return deny;
    try {
        const { count = 1 } = await request.json();

        const newCodes = [];
        for (let i = 0; i < count; i++) {
            // Generate a readable but secure code natively
            const code = Math.random().toString(36).substring(2, 8).toUpperCase() +
                Math.random().toString(36).substring(2, 8).toUpperCase();
            newCodes.push({ code });
        }

        const { data, error } = await supabase
            .from('access_codes')
            .insert(newCodes)
            .select();

        if (error) throw error;

        return NextResponse.json({ codes: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

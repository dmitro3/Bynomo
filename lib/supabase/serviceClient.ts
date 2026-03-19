/**
 * Supabase Service (Server-only) Client
 *
 * This client uses the Supabase service role key so server-side routes can read
 * protected/admin tables even when RLS blocks the public anon key.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceKey) {
  throw new Error('Missing environment variable: SUPABASE_SERVICE_KEY');
}

export const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});


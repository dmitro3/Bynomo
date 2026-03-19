/**
 * Supabase Service (Server-only) Client
 *
 * This client uses the Supabase service role key so server-side routes can read
 * protected/admin tables even when RLS blocks the public anon key.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceKey) {
  // During local/CI builds, the service role key may not be configured yet.
  // Fallback to anon key so the Next.js build does not fail.
  // NOTE: Admin/server reads may still be blocked by RLS until SUPABASE_SERVICE_KEY is set.
  if (!supabaseAnonKey) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_KEY (and NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }
  console.warn('[supabaseService] SUPABASE_SERVICE_KEY not set; falling back to anon key for build-time safety.');
}

export const supabaseService = createClient(supabaseUrl, supabaseServiceKey || (supabaseAnonKey as string), {
  auth: {
    persistSession: false,
  },
});


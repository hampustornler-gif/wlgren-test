// Server-side Supabase admin client — hardcoded to ygphuwgzuhhggqwrpcuy
// Use this for admin operations in server functions only (bypasses RLS).
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ygphuwgzuhhggqwrpcuy.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncGh1d2d6dWhoZ2dxd3JwY3V5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDgwMTE3MCwiZXhwIjoyMDk2Mzc3MTcwfQ.0gFWjyn2OrwzAnNXjIb7pxe1a78lsgFrDCIMl0AeV9o";

export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

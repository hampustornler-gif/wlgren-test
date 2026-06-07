// Supabase client — hardcoded to project ygphuwgzuhhggqwrpcuy
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ygphuwgzuhhggqwrpcuy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncGh1d2d6dWhoZ2dxd3JwY3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDExNzAsImV4cCI6MjA5NjM3NzE3MH0.6CNJk5pZBGAlJVRV5O8XYTwc2QHKG7TR9AYDAL1b5Js";

let _supabase: ReturnType<typeof createClient<Database>> | undefined;

function getClient() {
  if (!_supabase) {
    _supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: typeof window !== "undefined" ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return _supabase;
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

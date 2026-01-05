/**
 * Supabase Client Configuration
 * Replaces Firebase configuration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create Supabase client for browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Database types (will be auto-generated later)
export type Database = {
  public: {
    Tables: {
      profiles: any;
      employees: any;
      sessions: any;
      bookings: any;
      punch_cards: any;
      // ... etc
    };
  };
};


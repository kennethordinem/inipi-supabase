/**
 * Supabase Client Configuration
 * Replaces Firebase configuration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uumaizqduratxmciylff.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bWFpenFkdXJhdHhtY2l5bGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwOTgyNjMsImV4cCI6MjA4MjY3NDI2M30.zjo7UlbO9v-l3Z5HDKv3Ddl6iEzmhrf_io0MHHp-G6c';

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


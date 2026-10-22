import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TableName } from '../types/database';

let client: SupabaseClient | null = null;
let currentUrl: string | null = null;
let currentKey: string | null = null;

export function getSupabaseCredentials(): { url: string; key: string } {
  // Check localStorage first (user-configured in Settings)
  const savedUrl = localStorage.getItem('dwh_supabase_url');
  const savedKey = localStorage.getItem('dwh_supabase_anon_key');

  // Then check env vars
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  return {
    url: (savedUrl || envUrl || '').trim(),
    key: (savedKey || envKey || '').trim(),
  };
}

export function initSupabase(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();

  if (!url || !key) {
    client = null;
    return null;
  }

  if (client && currentUrl === url && currentKey === key) {
    return client;
  }

  try {
    currentUrl = url;
    currentKey = key;
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return client;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    client = null;
    return null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!client) {
    return initSupabase();
  }
  return client;
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    const testClient = createClient(url, key);
    const { error } = await testClient.from('user_settings').select('id').limit(1);
    if (error && error.code !== 'PGRST116' && !error.message.includes('row')) {
      // If table doesn't exist yet, it's connected to Supabase but migrations haven't run
      if (error.message.includes('relation') || error.code === '42P01') {
        return {
          success: true,
          message: 'Connected to Supabase! (Tables not found yet — run the SQL schema migration in SQL Editor).',
        };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Successfully connected and verified database access!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Connection failed' };
  }
}

export const SYNC_TABLES: TableName[] = [
  'goals',
  'milestones',
  'tasks',
  'habits',
  'habit_checkins',
  'time_entries',
  'running_timer',
  'courses',
  'job_applications',
  'notes',
  'weekly_reviews',
  'reminders',
  'user_settings',
];

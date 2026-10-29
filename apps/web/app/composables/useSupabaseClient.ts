import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * The anonymous Supabase client. Reads public content and inserts new
 * submissions; Row Level Security does the rest. No session is kept.
 */
export function useSupabaseClient(): SupabaseClient {
  if (import.meta.client && client) return client
  const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig().public
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY.')
  }
  const created = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  if (import.meta.client) client = created
  return created
}

import { createClient } from '@supabase/supabase-js'
import { readEnv } from './env'

const env = readEnv()

/**
 * The one browser client. It only ever holds the anon key; access is decided by
 * Row Level Security and the signed-in user's session.
 *
 * The implicit flow is kept on purpose: invite links and magic links both land
 * with tokens in the URL hash, and supabase-js turns them into a session on load.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
})

export const publicSiteUrl = env.publicSiteUrl

export const SPEAKER_PHOTO_BUCKET = 'speaker-photos'

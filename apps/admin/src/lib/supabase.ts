import { createClient } from '@supabase/supabase-js'
import { readEnv } from './env'

const env = readEnv()

/**
 * The one browser client. It only ever holds the publishable key; access is
 * decided by Row Level Security and the signed-in user's session.
 *
 * Email links (magic link and invite) carry a token hash that
 * AuthCallbackView exchanges with verifyOtp, so no session is read from the
 * URL. PKCE is the flow for anything else.
 */
export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  },
})

export const publicSiteUrl = env.publicSiteUrl

export const SPEAKER_PHOTO_BUCKET = 'speaker-photos'

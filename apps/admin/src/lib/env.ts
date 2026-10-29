export interface AdminEnv {
  supabaseUrl: string
  supabaseAnonKey: string
  /** Origin of the public site, for the "View site" link. Null hides the link. */
  publicSiteUrl: string | null
}

type RawEnv = Partial<Record<'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY' | 'VITE_PUBLIC_SITE_URL', string>>

/** Reads the admin's build-time env, failing loudly when Supabase is not configured. */
export function readEnv(env: RawEnv = import.meta.env): AdminEnv {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() ?? ''
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean)
  if (missing.length) {
    throw new Error(
      `Recitte Admin is not configured: missing ${missing.join(' and ')}. ` +
        'Copy apps/admin/.env.example to apps/admin/.env.local and fill in the Supabase URL and anon key.',
    )
  }
  const publicSiteUrl = env.VITE_PUBLIC_SITE_URL?.trim() || null
  return { supabaseUrl, supabaseAnonKey, publicSiteUrl }
}

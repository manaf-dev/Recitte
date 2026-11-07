// Deno-only: builds the admin client and the caller lookups used by the staff
// functions. Handlers receive these as plain dependencies so they can be
// tested without Deno or a running stack.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { CallerDeps, StaffRole } from './staff-auth.ts'

/**
 * The project's default secret key. Hosted projects inject the JSON map
 * SUPABASE_SECRET_KEYS; local/self-hosted runs may set SUPABASE_SECRET_KEY.
 * The legacy service_role key is only a last resort while it still exists.
 */
function secretKey(): string | undefined {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch {
      // fall through to the single-key variables
    }
  }
  return Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * The project's default publishable key, for acting as an ordinary client
 * (e.g. checking a password with signInWithPassword). Hosted projects inject
 * the JSON map SUPABASE_PUBLISHABLE_KEYS; the single-key variables and the
 * legacy anon key are fallbacks.
 */
function publishableKey(): string | undefined {
  const keys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch {
      // fall through to the single-key variables
    }
  }
  return Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')
}

/**
 * A fresh, non-persisting client with the publishable key. Each call returns
 * its own client, so a session it signs in never touches the admin client or
 * another request.
 */
export function publicClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = publishableKey()
  if (!url || !key) throw new Error('SUPABASE_URL and a publishable key (SUPABASE_PUBLISHABLE_KEYS) must be set')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = secretKey()
  if (!url || !key) throw new Error('SUPABASE_URL and a secret key (SUPABASE_SECRET_KEYS) must be set')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function callerDeps(admin: SupabaseClient): CallerDeps {
  return {
    async getCaller(token) {
      // Verifies the JWT signature (locally against the project's JWKS when
      // asymmetric signing keys are on) instead of a round trip per request.
      // Removed staff are still caught: getRole reads the live staff table.
      const { data, error } = await admin.auth.getClaims(token)
      const claims = data?.claims
      if (error || !claims?.sub || claims.role !== 'authenticated') return null
      return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : undefined }
    },
    async getRole(userId) {
      const { data } = await admin.from('staff').select('role').eq('user_id', userId).maybeSingle()
      return (data?.role as StaffRole | undefined) ?? null
    },
  }
}

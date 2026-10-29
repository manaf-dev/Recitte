// Deno-only: builds the service-role client and the caller lookups used by
// the staff functions. Handlers receive these as plain dependencies so they
// can be tested without Deno or a running stack.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { CallerDeps, StaffRole } from './staff-auth.ts'

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function callerDeps(admin: SupabaseClient): CallerDeps {
  return {
    async getCaller(token) {
      const { data, error } = await admin.auth.getUser(token)
      if (error || !data.user) return null
      return { id: data.user.id, email: data.user.email ?? undefined }
    },
    async getRole(userId) {
      const { data } = await admin.from('staff').select('role').eq('user_id', userId).maybeSingle()
      return (data?.role as StaffRole | undefined) ?? null
    },
  }
}

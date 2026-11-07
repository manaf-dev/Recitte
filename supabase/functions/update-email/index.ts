import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { escapeLike, isAlreadyRegistered } from '../_shared/staff-auth.ts'
import { callerDeps, publicClient, serviceClient } from '../_shared/supabase.ts'
import { createUpdateEmailHandler } from './handler.ts'

const admin = serviceClient()

/** Signs out the throwaway password-check session, retrying once. Logs codes only. */
async function endTempSession(temp: SupabaseClient): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      // Local scope revokes only this throwaway session, not the caller's real one.
      const { error } = await temp.auth.signOut({ scope: 'local' })
      if (!error) return
      console.error('update-email: could not sign out the password-check session', {
        attempt,
        code: error.code,
        status: error.status,
      })
    } catch (err) {
      console.error('update-email: signing out the password-check session threw', {
        attempt,
        name: (err as Error)?.name,
      })
    }
  }
}

Deno.serve(
  createUpdateEmailHandler({
    ...callerDeps(admin),
    now: () => new Date(),
    async getAuthEmail(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId)
      if (error) return null
      return data.user?.email ?? null
    },
    async countPasswordFailures(userId, since) {
      const { count, error } = await admin
        .from('password_check_failures')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', since.toISOString())
      if (error || count === null) throw new Error(`could not count password failures: ${error?.code}`)
      return count
    },
    async recordPasswordFailure(userId) {
      const { error } = await admin.from('password_check_failures').insert({ user_id: userId })
      if (error) throw new Error(`could not record a password failure: ${error.code}`)
    },
    async clearPasswordFailures(userId) {
      const { error } = await admin.from('password_check_failures').delete().eq('user_id', userId)
      // Not worth failing a correct password over; the rows age out of the window anyway.
      if (error) console.error('update-email: could not clear password failures', { userId, code: error.code })
    },
    async verifyPassword(email, password) {
      // A fresh client per request, never the admin one: its session lives only here.
      const temp = publicClient()
      const { data, error } = await temp.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.code === 'invalid_credentials') return 'wrong'
        // Log only the code and status: no email or message text.
        console.error('update-email: password check failed', { code: error.code, status: error.status })
        return 'error'
      }
      if (data.session) await endTempSession(temp)
      return 'ok'
    },
    async isEmailTaken(email, exceptUserId) {
      // Checks auth.users as well as staff: the admin update below would otherwise
      // fail on Auth's unique index with a generic 500 instead of email_exists.
      const { data, error } = await admin.rpc('email_in_use', { check_email: email, except_user_id: exceptUserId })
      if (error || typeof data !== 'boolean') throw new Error(`could not check emails in use: ${error?.code}`)
      return data
    },
    async setAuthEmail(userId, email) {
      const { error } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true })
      if (!error) return {}
      return {
        error: error.message,
        code: error.code,
        status: error.status,
        alreadyRegistered: isAlreadyRegistered(error),
      }
    },
    async setStaffEmail(userId, email, oldEmail) {
      // Only while the row still holds the old email (case-insensitive for legacy rows),
      // so a concurrent change is not silently overwritten.
      const { data, error } = await admin
        .from('staff')
        .update({ email })
        .eq('user_id', userId)
        .ilike('email', escapeLike(oldEmail))
        .select('user_id')
      if (error) return { error: error.message }
      if (!data?.length) return { error: 'No staff row matched the old email.' }
      return {}
    },
    async signOutOtherSessions(token) {
      const { error } = await admin.auth.admin.signOut(token, 'others')
      return error ? { error: error.message, code: error.code } : {}
    },
  }),
)

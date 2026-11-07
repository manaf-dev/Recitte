import { callerDeps, serviceClient } from '../_shared/supabase.ts'
import { createInviteHandler, escapeLike, isAlreadyRegistered, resolveAdminUrl } from './handler.ts'

const admin = serviceClient()

Deno.serve(
  createInviteHandler({
    ...callerDeps(admin),
    adminUrl: resolveAdminUrl(Deno.env.get('ADMIN_URL'), Deno.env.get('SUPABASE_URL')),
    async isStaffEmail(email) {
      const { data } = await admin.from('staff').select('user_id').ilike('email', escapeLike(email)).maybeSingle()
      return !!data
    },
    async createInvite(email, redirectTo) {
      // generateLink creates the user and token without sending an email.
      const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo } })
      if (error || !data.user || !data.properties?.hashed_token) {
        return { error: error?.message ?? 'The invite could not be created.', alreadyRegistered: isAlreadyRegistered(error) }
      }
      return { id: data.user.id, hashedToken: data.properties.hashed_token }
    },
    async insertStaff(row) {
      const { error } = await admin.from('staff').insert(row)
      return { error: error?.message }
    },
    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId)
      // Log only the id and the error's code and status: no email or message text.
      if (error) {
        console.error('invite-staff: could not remove auth user after a failed staff insert', {
          userId,
          code: error.code,
          status: error.status,
        })
      }
    },
  }),
)

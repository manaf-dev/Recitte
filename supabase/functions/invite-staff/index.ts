import { callerDeps, serviceClient } from '../_shared/supabase.ts'
import { createInviteHandler } from './handler.ts'

const admin = serviceClient()

Deno.serve(
  createInviteHandler({
    ...callerDeps(admin),
    adminUrl: Deno.env.get('ADMIN_URL') ?? 'http://127.0.0.1:5174',
    async isStaffEmail(email) {
      const { data } = await admin.from('staff').select('user_id').ilike('email', email).maybeSingle()
      return !!data
    },
    async inviteUser(email, redirectTo) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })
      if (error || !data.user) return { error: error?.message ?? 'The invite could not be sent.' }
      return { id: data.user.id }
    },
    async insertStaff(row) {
      const { error } = await admin.from('staff').insert(row)
      return { error: error?.message }
    },
    async deleteUser(userId) {
      await admin.auth.admin.deleteUser(userId)
    },
  }),
)

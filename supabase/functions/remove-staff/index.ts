import { callerDeps, serviceClient } from '../_shared/supabase.ts'
import { createRemoveHandler } from './handler.ts'

const admin = serviceClient()

Deno.serve(
  createRemoveHandler({
    ...callerDeps(admin),
    async getStaff(userId) {
      const { data } = await admin.from('staff').select('user_id, role').eq('user_id', userId).maybeSingle()
      return data ?? null
    },
    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId)
      return { error: error?.message }
    },
  }),
)

import { callerDeps, serviceClient } from '../_shared/supabase.ts'
import { createChangeRoleHandler } from './handler.ts'

const admin = serviceClient()

Deno.serve(
  createChangeRoleHandler({
    ...callerDeps(admin),
    async getStaff(userId) {
      const { data } = await admin.from('staff').select('user_id, role').eq('user_id', userId).maybeSingle()
      return data ?? null
    },
    async setRole(userId, role) {
      const { data, error } = await admin.from('staff').update({ role }).eq('user_id', userId).select('user_id')
      if (error) return { updated: 0, error: { code: error.code, message: error.message } }
      return { updated: data?.length ?? 0 }
    },
  }),
)

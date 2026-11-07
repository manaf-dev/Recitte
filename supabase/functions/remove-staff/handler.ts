import { corsHeaders, json } from '../_shared/cors.ts'
import {
  type CallerDeps,
  isLastSuperAdminError,
  LAST_SUPER_ADMIN,
  readJson,
  requireSuperAdmin,
  type StaffRole,
} from '../_shared/staff-auth.ts'

export interface RemoveDeps extends CallerDeps {
  getStaff(userId: string): Promise<{ user_id: string; role: StaffRole } | null>
  /**
   * Deletes the auth user; the staff row goes with it (on delete cascade).
   * `code` is the error code Supabase Auth passes through (P0001 from the
   * keep_a_super_admin trigger).
   */
  deleteUser(userId: string): Promise<{ error?: string; code?: string }>
}

export function createRemoveHandler(deps: RemoveDeps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

    const caller = await requireSuperAdmin(req, deps)
    if (caller instanceof Response) return caller

    const body = await readJson(req)
    const userId = typeof body?.user_id === 'string' ? body.user_id : ''
    if (!userId) return json({ error: 'Missing user_id.' }, 400)
    if (userId === caller.id) return json({ error: 'You cannot remove your own account.' }, 400)

    const target = await deps.getStaff(userId)
    // Another super admin may be removed: the caller cannot remove themselves,
    // so at least one super admin always remains.
    if (!target) return json({ error: 'That person is not on the staff list.' }, 404)

    // Deleting the auth user also revokes an invite that was never accepted.
    const deleted = await deps.deleteUser(userId)
    if (deleted.error) {
      // Two super admins removing each other at once: the database keeps the last one.
      if (isLastSuperAdminError({ code: deleted.code, message: deleted.error })) {
        return json({ error: LAST_SUPER_ADMIN }, 409)
      }
      return json({ error: deleted.error }, 500)
    }

    return json({ removed: userId })
  }
}

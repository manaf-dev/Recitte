import { corsHeaders, json } from '../_shared/cors.ts'
import {
  type CallerDeps,
  isLastSuperAdminError,
  LAST_SUPER_ADMIN,
  readJson,
  requireSuperAdmin,
  type StaffRole,
} from '../_shared/staff-auth.ts'

export const USER_ID_MISSING = 'Missing user_id.'
export const ROLE_INVALID = 'Choose a valid role.'
export const OWN_ROLE = 'You cannot change your own role.'
export const NOT_STAFF = 'That person is not on the staff list.'
export const CHANGE_FAILED = 'The role could not be changed. Try again.'
export { LAST_SUPER_ADMIN }

const ROLES: readonly StaffRole[] = ['staff', 'super_admin']

export interface ChangeRoleDeps extends CallerDeps {
  getStaff(userId: string): Promise<{ user_id: string; role: StaffRole } | null>
  /**
   * Sets public.staff.role for the user. `updated` is the number of rows changed;
   * `error` is set on a database failure (P0001 from the keep_a_super_admin trigger).
   */
  setRole(userId: string, role: StaffRole): Promise<{ updated: number; error?: { code?: string; message?: string } }>
}

export function createChangeRoleHandler(deps: ChangeRoleDeps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

    const caller = await requireSuperAdmin(req, deps)
    if (caller instanceof Response) return caller

    const body = await readJson(req)
    const userId = typeof body?.user_id === 'string' ? body.user_id : ''
    if (!userId) return json({ error: USER_ID_MISSING }, 400)
    const role = body?.role
    if (typeof role !== 'string' || !ROLES.includes(role as StaffRole)) {
      return json({ error: ROLE_INVALID }, 400)
    }
    // The caller cannot demote themselves, so at least one super admin always remains.
    if (userId === caller.id) return json({ error: OWN_ROLE }, 400)

    const target = await deps.getStaff(userId)
    if (!target) return json({ error: NOT_STAFF }, 404)
    if (target.role === role) return json({ user_id: userId, role })

    const result = await deps.setRole(userId, role as StaffRole)
    if (result.error) {
      // Two super admins demoting each other at once: the database keeps the last one.
      if (isLastSuperAdminError(result.error)) return json({ error: LAST_SUPER_ADMIN }, 409)
      console.error('change-role: could not update the staff role', { code: result.error.code })
      return json({ error: CHANGE_FAILED }, 500)
    }
    // The row vanished between the lookup and the update (removed concurrently).
    if (result.updated === 0) return json({ error: NOT_STAFF }, 404)

    return json({ user_id: userId, role })
  }
}

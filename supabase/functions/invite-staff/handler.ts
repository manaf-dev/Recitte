import { corsHeaders, json } from '../_shared/cors.ts'
import { type CallerDeps, readJson, requireSuperAdmin } from '../_shared/staff-auth.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface InviteDeps extends CallerDeps {
  /** The admin app's origin; invite links land on its /auth/callback. */
  adminUrl: string
  isStaffEmail(email: string): Promise<boolean>
  /** Sends the Supabase Auth invite and returns the new auth user id. */
  inviteUser(email: string, redirectTo: string): Promise<{ id: string } | { error: string }>
  insertStaff(row: { user_id: string; email: string; role: 'staff' }): Promise<{ error?: string }>
  deleteUser(userId: string): Promise<void>
}

export function createInviteHandler(deps: InviteDeps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

    const caller = await requireSuperAdmin(req, deps)
    if (caller instanceof Response) return caller

    const body = await readJson(req)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email)) return json({ error: 'Enter a valid email address.' }, 400)

    if (await deps.isStaffEmail(email)) return json({ error: 'That person is already on the staff list.' }, 409)

    const invited = await deps.inviteUser(email, `${deps.adminUrl.replace(/\/$/, '')}/auth/callback`)
    if ('error' in invited) return json({ error: invited.error }, 400)

    // Invited people are always plain staff. Super admins are set in the dashboard.
    const inserted = await deps.insertStaff({ user_id: invited.id, email, role: 'staff' })
    if (inserted.error) {
      await deps.deleteUser(invited.id)
      return json({ error: 'The invite could not be saved. Try again.' }, 500)
    }

    return json({ user_id: invited.id, email, role: 'staff' })
  }
}

import { corsHeaders, json } from '../_shared/cors.ts'
import { type CallerDeps, readJson, requireSuperAdmin, type StaffRole } from '../_shared/staff-auth.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROLES: readonly StaffRole[] = ['staff', 'super_admin']
/** Matches the staff_first_name_check / staff_last_name_check constraints. */
export const NAME_MAX = 80

export const FIRST_NAME_INVALID = 'Enter a first name.'
export const LAST_NAME_INVALID = 'Enter a last name.'

/** A trimmed name of 1 to NAME_MAX characters, or undefined when the value is not one. */
export function cleanName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const name = value.trim()
  return name.length >= 1 && name.length <= NAME_MAX ? name : undefined
}

export const ALREADY_REGISTERED = 'That email already has an account. Remove them on the Staff screen first.'
export const ADMIN_URL_MISSING = 'ADMIN_URL is not set for this project.'

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', 'kong'])
const LOCAL_ADMIN_URL = 'http://127.0.0.1:5174'

/**
 * The admin origin invite links point at. Only a local stack falls back to the
 * Vite dev server; a hosted project without ADMIN_URL gets undefined, so the
 * handler refuses instead of minting localhost links.
 */
export function resolveAdminUrl(adminUrl: string | undefined, supabaseUrl: string | undefined): string | undefined {
  if (adminUrl?.trim()) return adminUrl.trim()
  let host = ''
  try {
    host = new URL(supabaseUrl ?? '').hostname
  } catch {
    return undefined
  }
  return LOCAL_HOSTS.has(host) ? LOCAL_ADMIN_URL : undefined
}

/** Supabase Auth's codes for an email that already has an account. */
export function isAlreadyRegistered(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.code === 'email_exists' || error.code === 'user_already_exists') return true
  // Older GoTrue releases send no code, only this message.
  return !error.code && /already been registered/i.test(error.message ?? '')
}

/** Escapes LIKE wildcards so `ilike` is an exact, case-insensitive match. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}

export type CreateInviteResult =
  | { id: string; hashedToken: string }
  /** `alreadyRegistered` marks Supabase Auth refusing because the email has an account. */
  | { error: string; alreadyRegistered?: boolean }

export interface InviteDeps extends CallerDeps {
  /**
   * The admin app's origin; invite links land on its /auth/set-password.
   * Undefined on a hosted project without ADMIN_URL: invites then fail with 500.
   */
  adminUrl: string | undefined
  isStaffEmail(email: string): Promise<boolean>
  /**
   * Creates the Supabase Auth user and an invite token without sending any email.
   * Returns the new auth user id and the hashed token our set-password page verifies.
   */
  createInvite(
    email: string,
    redirectTo: string,
    names: { first_name: string; last_name: string },
  ): Promise<CreateInviteResult>
  insertStaff(row: {
    user_id: string
    email: string
    role: StaffRole
    first_name: string
    last_name: string
  }): Promise<{ error?: string }>
  deleteUser(userId: string): Promise<void>
}

export function createInviteHandler(deps: InviteDeps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

    const caller = await requireSuperAdmin(req, deps)
    if (caller instanceof Response) return caller

    if (!deps.adminUrl) {
      console.error('invite-staff: ADMIN_URL is not set and SUPABASE_URL is not local.')
      return json({ error: ADMIN_URL_MISSING }, 500)
    }

    const body = await readJson(req)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email)) return json({ error: 'Enter a valid email address.' }, 400)

    // Only a missing role defaults to staff; anything else must name a real role.
    const rawRole = body?.role === undefined ? 'staff' : body.role
    if (!ROLES.includes(rawRole as StaffRole)) return json({ error: 'Choose a valid role.' }, 400)
    const role = rawRole as StaffRole

    const first_name = cleanName(body?.first_name)
    if (!first_name) return json({ error: FIRST_NAME_INVALID }, 400)
    const last_name = cleanName(body?.last_name)
    if (!last_name) return json({ error: LAST_NAME_INVALID }, 400)

    if (await deps.isStaffEmail(email)) return json({ error: 'That person is already on the staff list.' }, 409)

    const adminUrl = deps.adminUrl.replace(/\/$/, '')
    const invited = await deps.createInvite(email, `${adminUrl}/auth/set-password`, { first_name, last_name })
    if ('error' in invited) {
      if (invited.alreadyRegistered) return json({ error: ALREADY_REGISTERED }, 409)
      return json({ error: invited.error }, 400)
    }

    // The super admin picks the role at invite time (staff unless they choose otherwise).
    const inserted = await deps.insertStaff({ user_id: invited.id, email, role, first_name, last_name })
    if (inserted.error) {
      await deps.deleteUser(invited.id)
      return json({ error: 'The invite could not be saved. Try again.' }, 500)
    }

    // No email is sent: the super admin shares this link themselves. It points at our own page,
    // not Supabase's action_link, so chat-app link previews cannot consume the one-time token;
    // the page verifies the token only when the person clicks through. The token rides in the
    // fragment, which browsers never send, so it stays out of server and proxy logs.
    const invite_url =
      `${adminUrl}/auth/set-password#token_hash=${encodeURIComponent(invited.hashedToken)}&type=invite`

    return json({ user_id: invited.id, email, role, first_name, last_name, invite_url })
  }
}

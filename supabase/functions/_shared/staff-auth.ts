import { json } from './cors.ts'

export type StaffRole = 'super_admin' | 'staff'

export interface Caller {
  id: string
  email?: string
}

export interface CallerDeps {
  /** Resolves the user behind a bearer token, or null if it is missing or invalid. */
  getCaller(token: string): Promise<Caller | null>
  /** The caller's role from public.staff, or null if they are not staff. */
  getRole(userId: string): Promise<StaffRole | null>
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

/**
 * Returns the caller, their live staff role and the bearer token they sent,
 * or a Response to send back:
 * 401 without a valid session, 403 for a signed-in user who is not staff.
 */
export async function requireStaff(
  req: Request,
  deps: CallerDeps,
): Promise<(Caller & { role: StaffRole; token: string }) | Response> {
  const header = req.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  if (!token) return json({ error: 'Sign in first.' }, 401)

  const caller = await deps.getCaller(token)
  if (!caller) return json({ error: 'Sign in first.' }, 401)

  const role = await deps.getRole(caller.id)
  if (!role) return json({ error: 'Only staff can do this.' }, 403)

  return { ...caller, role, token }
}

/**
 * Returns the calling super admin, or a Response to send back:
 * 401 without a valid session, 403 for anyone who is not a super admin.
 */
export async function requireSuperAdmin(req: Request, deps: CallerDeps): Promise<Caller | Response> {
  const staff = await requireStaff(req, deps)
  if (staff instanceof Response) {
    return staff.status === 403 ? json({ error: 'Only the super admin can manage staff.' }, 403) : staff
  }
  if (staff.role !== 'super_admin') return json({ error: 'Only the super admin can manage staff.' }, 403)

  const { role: _role, token: _token, ...caller } = staff
  return caller
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

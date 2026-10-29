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

/**
 * Returns the calling super admin, or a Response to send back:
 * 401 without a valid session, 403 for anyone who is not a super admin.
 */
export async function requireSuperAdmin(req: Request, deps: CallerDeps): Promise<Caller | Response> {
  const header = req.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  if (!token) return json({ error: 'Sign in first.' }, 401)

  const caller = await deps.getCaller(token)
  if (!caller) return json({ error: 'Sign in first.' }, 401)

  const role = await deps.getRole(caller.id)
  if (role !== 'super_admin') return json({ error: 'Only the super admin can manage staff.' }, 403)

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

import { corsHeaders, json } from '../_shared/cors.ts'
import { type CallerDeps, EMAIL_RE, readJson, requireStaff } from '../_shared/staff-auth.ts'

export const EMAIL_INVALID = 'Enter a valid email address.'
export const EMAIL_UNCHANGED = 'That is already your email.'
export const EMAIL_NOT_AUTHORIZED = 'That email address cannot be used.'
export const PASSWORD_MISSING = 'Enter your current password.'
export const PASSWORD_WRONG = 'Your current password is incorrect.'
export const EMAIL_TAKEN = 'That email is already used by another account.'
export const CHANGE_FAILED = 'Your email could not be changed. Try again.'
export const TOO_MANY_PASSWORD_ATTEMPTS = 'Too many attempts. Wait 15 minutes and try again.'
export const AUTH_RATE_LIMITED = 'Too many attempts. Wait a minute and try again.'

/** Shown when the auth email changed but could not be put back after the staff update failed. */
export function emailMayHaveChanged(email: string): string {
  return (
    `Your sign-in email may have changed to ${email}. ` +
    'Sign out and try signing in with it, or contact the super admin.'
  )
}

/** Failed password checks allowed per user inside the window before update-email answers 429. */
export const MAX_PASSWORD_FAILURES = 5
export const FAILURE_WINDOW_MS = 15 * 60 * 1000

/** `wrong` marks Supabase Auth refusing the credentials; any other failure is `error`. */
export type PasswordCheck = 'ok' | 'wrong' | 'error'

export interface AuthWriteResult {
  error?: string
  code?: string
  status?: number
  /** Supabase Auth refused because another account holds the email. */
  alreadyRegistered?: boolean
}

export interface UpdateEmailDeps extends CallerDeps {
  /** The caller's current sign-in email from Supabase Auth, or null if it cannot be read. */
  getAuthEmail(userId: string): Promise<string | null>
  /** Failed password checks recorded for the user since `since`. May throw. */
  countPasswordFailures(userId: string, since: Date): Promise<number>
  recordPasswordFailure(userId: string): Promise<void>
  clearPasswordFailures(userId: string): Promise<void>
  /**
   * Signs in with a throwaway, non-persisting client to check the password,
   * then signs that session out again. May throw.
   */
  verifyPassword(email: string, password: string): Promise<PasswordCheck>
  /**
   * True when an auth user or staff row other than `exceptUserId` already has this
   * email (case-insensitive). May throw.
   */
  isEmailTaken(email: string, exceptUserId: string): Promise<boolean>
  /** Sets the auth user's email, already confirmed. */
  setAuthEmail(userId: string, email: string): Promise<AuthWriteResult>
  /**
   * Sets the staff row's email only while it still holds `oldEmail` (case-insensitive).
   * Updating no row counts as an error.
   */
  setStaffEmail(userId: string, email: string, oldEmail: string): Promise<{ error?: string }>
  /** Ends every session of the caller except the one behind `token`. */
  signOutOtherSessions(token: string): Promise<{ error?: string; code?: string }>
  now(): Date
}

/** Maps a refusal from Supabase Auth's admin user update to the response for the caller. */
function authWriteRefusal(result: AuthWriteResult): Response | null {
  if (result.alreadyRegistered) return json({ error: EMAIL_TAKEN }, 409)
  if (result.code === 'email_address_invalid') return json({ error: EMAIL_INVALID }, 400)
  if (result.code === 'email_address_not_authorized') return json({ error: EMAIL_NOT_AUTHORIZED }, 400)
  if (result.status === 429 || result.code?.startsWith('over_')) return json({ error: AUTH_RATE_LIMITED }, 429)
  return null
}

export function createUpdateEmailHandler(deps: UpdateEmailDeps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

    // Any staff member may change their own email, not only the super admin.
    const caller = await requireStaff(req, deps)
    if (caller instanceof Response) return caller
    const userId = caller.id

    const body = await readJson(req)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email)) return json({ error: EMAIL_INVALID }, 400)

    // Read the live email: the token's claim goes stale after a change.
    const currentEmail = await deps.getAuthEmail(userId)
    if (!currentEmail) {
      console.error('update-email: could not read the auth user', { userId })
      return json({ error: CHANGE_FAILED }, 500)
    }
    if (email === currentEmail.trim().toLowerCase()) return json({ error: EMAIL_UNCHANGED }, 400)

    const password = typeof body?.current_password === 'string' ? body.current_password : ''
    if (!password) return json({ error: PASSWORD_MISSING }, 400)

    // Checked before the uniqueness lookups so they cannot be used to probe for accounts.
    try {
      const since = new Date(deps.now().getTime() - FAILURE_WINDOW_MS)
      if ((await deps.countPasswordFailures(userId, since)) >= MAX_PASSWORD_FAILURES) {
        return json({ error: TOO_MANY_PASSWORD_ATTEMPTS }, 429)
      }
      const check = await deps.verifyPassword(currentEmail, password)
      if (check === 'wrong') {
        await deps.recordPasswordFailure(userId)
        return json({ error: PASSWORD_WRONG }, 400)
      }
      if (check !== 'ok') return json({ error: CHANGE_FAILED }, 500)
      await deps.clearPasswordFailures(userId)
    } catch (err) {
      console.error('update-email: password check threw', { userId, name: (err as Error)?.name })
      return json({ error: CHANGE_FAILED }, 500)
    }

    let taken: boolean
    try {
      taken = await deps.isEmailTaken(email, userId)
    } catch (err) {
      console.error('update-email: email lookup threw', { userId, name: (err as Error)?.name })
      return json({ error: CHANGE_FAILED }, 500)
    }
    if (taken) return json({ error: EMAIL_TAKEN }, 409)

    const authUpdate = await deps.setAuthEmail(userId, email)
    if (authUpdate.error || authUpdate.alreadyRegistered) {
      const refusal = authWriteRefusal(authUpdate)
      if (refusal) return refusal
      console.error('update-email: could not change the auth email', {
        userId,
        code: authUpdate.code,
        status: authUpdate.status,
      })
      return json({ error: CHANGE_FAILED }, 500)
    }

    const staffUpdate = await deps.setStaffEmail(userId, email, currentEmail)
    if (staffUpdate.error) {
      // Put the auth email back so sign-in and the staff list keep agreeing.
      const reverted = await deps.setAuthEmail(userId, currentEmail)
      if (reverted.error) {
        console.error('update-email: could not restore the auth email after a failed staff update', {
          userId,
          code: reverted.code,
          status: reverted.status,
        })
        return json({ error: emailMayHaveChanged(email) }, 500)
      }
      return json({ error: CHANGE_FAILED }, 500)
    }

    // Anyone else signed in as this person (a stolen session, an old device) is signed out.
    // A failure here is logged only: the email has already changed.
    try {
      const signedOut = await deps.signOutOtherSessions(caller.token)
      if (signedOut.error) {
        console.error('update-email: could not sign out other sessions', { userId, code: signedOut.code })
      }
    } catch (err) {
      console.error('update-email: signing out other sessions threw', { userId, name: (err as Error)?.name })
    }

    return json({ email })
  }
}

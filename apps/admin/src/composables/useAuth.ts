import { computed, readonly, shallowRef } from 'vue'
import type { EmailOtpType, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clearStaffProfile } from './useStaffProfile'

const session = shallowRef<Session | null>(null)
let ready: Promise<void> | null = null

/**
 * Resolves with the current session once supabase-js has restored a stored
 * one. Tokens in invite links are read by the set-password page, not here.
 * Safe to call many times; later calls see sign-ins and sign-outs since the
 * first.
 */
export async function initAuth(): Promise<Session | null> {
  if (!ready) {
    supabase.auth.onAuthStateChange((_event, next) => {
      // No awaiting Supabase calls in here: the auth lock is held.
      session.value = next
      if (!next) clearStaffProfile()
    })
    ready = supabase.auth.getSession().then(({ data }) => {
      session.value = data.session
    })
  }
  await ready
  return session.value
}

/** Only same-app paths, so a crafted link cannot bounce staff to another site. */
export function safeRedirect(path: unknown): string | null {
  if (typeof path !== 'string') return null
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null
  if (path.startsWith('/login') || path.startsWith('/auth/')) return null
  return path
}

const NETWORK_MESSAGE = 'Could not reach the server. Check your connection and try again.'

export type SignInResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_credentials' | 'rate_limited' | 'error'; message: string }

export async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (!error) {
      session.value = data.session
      return { ok: true }
    }
    if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
      return { ok: false, reason: 'invalid_credentials', message: 'Email or password is incorrect.' }
    }
    if (error.status === 429 || error.code?.startsWith('over_')) {
      return {
        ok: false,
        reason: 'rate_limited',
        message: 'Too many sign-in attempts. Wait a minute and try again.',
      }
    }
    if (/failed to fetch|network|load failed/i.test(error.message)) {
      return { ok: false, reason: 'error', message: NETWORK_MESSAGE }
    }
    return { ok: false, reason: 'error', message: error.message || 'Could not sign you in. Try again.' }
  } catch {
    return { ok: false, reason: 'error', message: NETWORK_MESSAGE }
  }
}

export const EXPIRED_INVITE_MESSAGE =
  'This invite link has expired or was already used. Ask the super admin to remove you on the Staff screen and invite you again.'

const LINK_RETRY_MESSAGE = 'Something went wrong. Try the link again in a moment.'
const RATE_LIMIT_MESSAGE = 'Too many attempts. Wait a minute and try again.'

/** `retryable` means the link may still be good: offer the same step again. */
export type LinkResult = { ok: true } | { ok: false; message: string; retryable?: boolean }

type AuthErrorLike = { code?: string; status?: number; message?: string } | null | undefined

function linkFailure(error: AuthErrorLike): LinkResult {
  if (error?.status === 429 || error?.code?.startsWith('over_')) {
    return { ok: false, message: RATE_LIMIT_MESSAGE, retryable: true }
  }
  if ((error?.status ?? 0) >= 500 || /failed to fetch|network|load failed/i.test(error?.message ?? '')) {
    return { ok: false, message: LINK_RETRY_MESSAGE, retryable: true }
  }
  // otp_expired, an invalid token, or any other 4xx: the link itself is spent.
  return { ok: false, message: EXPIRED_INVITE_MESSAGE }
}

/**
 * Set only once this tab has used a valid invite link, so a reload can still
 * show the password form but an ordinary signed-in session cannot.
 */
const SET_PASSWORD_KEY = 'recitte-admin:set-password'

export function markInviteAccepted() {
  try {
    sessionStorage.setItem(SET_PASSWORD_KEY, '1')
  } catch {
    // Storage unavailable: a reload asks for the link again.
  }
}

export function inviteAccepted(): boolean {
  try {
    return sessionStorage.getItem(SET_PASSWORD_KEY) === '1'
  } catch {
    return false
  }
}

export function clearInviteAccepted() {
  try {
    sessionStorage.removeItem(SET_PASSWORD_KEY)
  } catch {
    // Nothing stored to clear.
  }
}

/** Forgets any session in this browser so a link's identity never mixes with an earlier one. */
async function dropExistingSession() {
  if (!(await initAuth())) return
  clearStaffProfile()
  await supabase.auth.signOut({ scope: 'local' })
  session.value = null
}

/** Exchanges the token hash from a custom invite email for a session. */
export async function verifyInviteLink(tokenHash: string, type: EmailOtpType): Promise<LinkResult> {
  try {
    await dropExistingSession()
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error || !data.session) return linkFailure(error)
    session.value = data.session
    markInviteAccepted()
    return { ok: true }
  } catch {
    return { ok: false, message: LINK_RETRY_MESSAGE, retryable: true }
  }
}

/** Starts a session from the tokens the default invite email puts in the URL hash. */
export async function startSessionFromTokens(accessToken: string, refreshToken: string): Promise<LinkResult> {
  try {
    await dropExistingSession()
    const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    if (error || !data.session) return linkFailure(error)
    session.value = data.session
    markInviteAccepted()
    return { ok: true }
  } catch {
    return { ok: false, message: LINK_RETRY_MESSAGE, retryable: true }
  }
}

/** Sets a password for the signed-in user (an invited staff member). */
export async function updatePassword(password: string): Promise<LinkResult> {
  try {
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) return { ok: true }
    if (error.code === 'weak_password') {
      return { ok: false, message: 'That password is too easy to guess. Choose a longer or less common one.' }
    }
    if (error.code === 'same_password') {
      return { ok: false, message: 'Choose a password that is different from your current one.' }
    }
    if (
      error.code === 'session_not_found' ||
      error.code === 'session_expired' ||
      error.name === 'AuthSessionMissingError' ||
      error.status === 401 ||
      /session missing|session.*expired|jwt expired/i.test(error.message)
    ) {
      return {
        ok: false,
        message:
          'Your invite session has expired. Ask the super admin to remove you on the Staff screen and invite you again.',
      }
    }
    if (error.status === 429 || error.code?.startsWith('over_')) {
      return { ok: false, message: RATE_LIMIT_MESSAGE }
    }
    if (/failed to fetch|network|load failed/i.test(error.message)) return { ok: false, message: NETWORK_MESSAGE }
    return { ok: false, message: error.message || 'Could not set your password. Try again.' }
  } catch {
    return { ok: false, message: NETWORK_MESSAGE }
  }
}

export async function signOut() {
  clearStaffProfile()
  clearInviteAccepted()
  const { error } = await supabase.auth.signOut()
  // If the server could not be reached, still forget the session in this browser.
  if (error) await supabase.auth.signOut({ scope: 'local' })
  session.value = null
}

export function useAuth() {
  return {
    session: readonly(session),
    user: computed(() => session.value?.user ?? null),
    signOut,
  }
}

/** Test helper: forget the cached init promise and session. */
export function resetAuthState() {
  ready = null
  session.value = null
}

import { computed, readonly, shallowRef } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clearStaffProfile } from './useStaffProfile'

const session = shallowRef<Session | null>(null)
let ready: Promise<Session | null> | null = null

const REDIRECT_KEY = 'recitte-admin:redirect'

/**
 * Resolves once supabase-js has restored a stored session or read tokens from
 * the URL hash (magic link or invite). Safe to call many times.
 */
export function initAuth(): Promise<Session | null> {
  if (!ready) {
    supabase.auth.onAuthStateChange((_event, next) => {
      // No awaiting Supabase calls in here: the auth lock is held.
      session.value = next
      if (!next) clearStaffProfile()
    })
    ready = supabase.auth.getSession().then(({ data }) => {
      session.value = data.session
      return data.session
    })
  }
  return ready
}

/** Only same-app paths, so a crafted link cannot bounce staff to another site. */
export function safeRedirect(path: unknown): string | null {
  if (typeof path !== 'string') return null
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null
  if (path.startsWith('/login') || path.startsWith('/auth/')) return null
  return path
}

/** Remembers where to go after the magic link, which may open in a new tab. */
export function rememberRedirect(path: unknown) {
  const safe = safeRedirect(path)
  try {
    if (safe) localStorage.setItem(REDIRECT_KEY, safe)
    else localStorage.removeItem(REDIRECT_KEY)
  } catch {
    // Storage unavailable (private mode): the user lands on Overview instead.
  }
}

export function consumeRedirect(): string | null {
  try {
    const value = localStorage.getItem(REDIRECT_KEY)
    localStorage.removeItem(REDIRECT_KEY)
    return safeRedirect(value)
  } catch {
    return null
  }
}

export type MagicLinkResult =
  | { ok: true }
  | { ok: false; reason: 'not_invited' | 'rate_limited' | 'error'; message: string }

export async function requestMagicLink(email: string, redirect?: unknown): Promise<MagicLinkResult> {
  rememberRedirect(redirect)
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Never create an account here: staff are invited by the super admin.
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (!error) return { ok: true }
    if (error.code === 'otp_disabled' || error.code === 'signup_disabled' || /signups? not allowed/i.test(error.message)) {
      return {
        ok: false,
        reason: 'not_invited',
        message: 'That email does not have access yet. Ask the super admin to invite you.',
      }
    }
    if (error.status === 429 || error.code?.startsWith('over_')) {
      return {
        ok: false,
        reason: 'rate_limited',
        message: 'Too many sign-in emails were requested. Wait a minute and try again.',
      }
    }
    return { ok: false, reason: 'error', message: error.message || 'Could not send the sign-in link. Try again.' }
  } catch {
    return { ok: false, reason: 'error', message: 'Could not reach the server. Check your connection and try again.' }
  }
}

export async function signOut() {
  clearStaffProfile()
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

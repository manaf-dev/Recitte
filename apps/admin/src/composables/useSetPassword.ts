import { reactive, ref } from 'vue'
import type { Router } from 'vue-router'
import type { EmailOtpType } from '@supabase/supabase-js'
import {
  clearInviteAccepted,
  EXPIRED_INVITE_MESSAGE,
  initAuth,
  inviteAccepted,
  signOut,
  startSessionFromTokens,
  updatePassword,
  verifyInviteLink,
} from './useAuth'

export const MIN_PASSWORD_LENGTH = 8

const LINK_TYPES: readonly EmailOtpType[] = ['invite', 'recovery', 'magiclink', 'email']

export const INVALID_LINK_MESSAGE =
  'This invite link is not valid. Open the link from your invite email, or ask the super admin to remove you on the Staff screen and invite you again.'

/** What an invite link carried, read from the query and hash of the URL. */
export type InviteLink =
  | { kind: 'token_hash'; tokenHash: string; type: EmailOtpType }
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'error'; message: string }
  | { kind: 'none' }

/**
 * Invite links arrive in three shapes: the staff invite link the super admin
 * shares carries `#token_hash=&type=` in the fragment (so the token never
 * reaches a server log), our email template sends `?token_hash=&type=`, and
 * Supabase's implicit flow lands with `#access_token=&refresh_token=`.
 * GoTrue puts link errors (expired, already used) in the hash or the query.
 * Precedence: an error, then a token hash, then hash tokens.
 */
export function readInviteLink(location: Pick<Location, 'search' | 'hash'>): InviteLink {
  const query = new URLSearchParams(location.search)
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''))

  // Fixed messages only: never show text that came in on the URL.
  const code = hash.get('error_code') ?? query.get('error_code')
  if (code || hash.get('error') || query.get('error') || hash.get('error_description') || query.get('error_description')) {
    return { kind: 'error', message: code === 'otp_expired' ? EXPIRED_INVITE_MESSAGE : INVALID_LINK_MESSAGE }
  }

  // Read the type from the same part of the URL that carried the token hash.
  const source = hash.get('token_hash') ? hash : query
  const tokenHash = source.get('token_hash')
  if (tokenHash) {
    const type = (source.get('type') ?? 'invite') as EmailOtpType
    return LINK_TYPES.includes(type) ? { kind: 'token_hash', tokenHash, type } : { kind: 'none' }
  }

  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken }

  return { kind: 'none' }
}

export interface PasswordErrors {
  password?: string
  confirm?: string
}

export function validatePassword(password: string, confirm: string): PasswordErrors {
  const errors: PasswordErrors = {}
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (!confirm) errors.confirm = 'Enter the password again.'
  else if (confirm !== password) errors.confirm = 'The passwords do not match.'
  return errors
}

/**
 * The set-password page: read the link, wait for a click before using a
 * one-time token hash (email scanners pre-open links), then set the password
 * and send the person to sign in with it. The form only appears after this
 * tab has used a valid link, never for a session that was already here.
 */
export function useSetPassword(router: Router) {
  const phase = ref<'loading' | 'accept' | 'form' | 'invalid'>('loading')
  const problem = ref('')
  /** A retryable failure while using the link: the accept step stays. */
  const linkError = ref('')
  const linkType = ref<EmailOtpType | null>(null)
  const busy = ref(false)
  const form = reactive({ password: '', confirm: '' })
  const errors = ref<PasswordErrors>({})
  const submitError = ref('')

  let pendingLink: InviteLink = { kind: 'none' }

  function fail(message: string) {
    problem.value = message
    phase.value = 'invalid'
  }

  async function start(location: Pick<Location, 'search' | 'hash' | 'pathname'> = window.location) {
    pendingLink = readInviteLink(location)
    // Tokens should not linger in the address bar or browser history.
    if (location.search || location.hash) window.history.replaceState(window.history.state, '', location.pathname)

    if (pendingLink.kind === 'error') return fail(pendingLink.message)
    if (pendingLink.kind === 'token_hash') {
      linkType.value = pendingLink.type
      phase.value = 'accept'
      return
    }
    if (pendingLink.kind === 'tokens') {
      // Supabase already verified this link before redirecting, so use it now.
      linkType.value = 'invite'
      return accept()
    }
    // No link: only a reload after this tab used one may show the form.
    const session = await initAuth()
    if (session && inviteAccepted()) phase.value = 'form'
    else fail(INVALID_LINK_MESSAGE)
  }

  /** Uses the link. On a retryable failure the accept step stays with the error. */
  async function accept() {
    if (busy.value) return
    const link = pendingLink
    if (link.kind !== 'token_hash' && link.kind !== 'tokens') return
    busy.value = true
    linkError.value = ''
    const result =
      link.kind === 'token_hash'
        ? await verifyInviteLink(link.tokenHash, link.type)
        : await startSessionFromTokens(link.accessToken, link.refreshToken)
    busy.value = false
    if (result.ok) {
      phase.value = 'form'
      return
    }
    if (!result.retryable) return fail(result.message)
    linkError.value = result.message
    phase.value = 'accept'
  }

  async function submit() {
    submitError.value = ''
    errors.value = validatePassword(form.password, form.confirm)
    if (errors.value.password || errors.value.confirm) return
    busy.value = true
    const result = await updatePassword(form.password)
    if (!result.ok) {
      busy.value = false
      submitError.value = result.message
      return
    }
    // Sign in fresh with the new password, so the guard checks for a staff row.
    clearInviteAccepted()
    await signOut()
    busy.value = false
    await router.replace({ name: 'login', query: { reason: 'password-set' } })
  }

  return { phase, problem, linkError, linkType, busy, form, errors, submitError, start, accept, submit }
}

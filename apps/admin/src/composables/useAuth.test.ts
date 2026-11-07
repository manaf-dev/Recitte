import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sb } from '@/test/supabaseMock'
import {
  inviteAccepted,
  markInviteAccepted,
  resetAuthState,
  signOut,
  safeRedirect,
  signInWithPassword,
  startSessionFromTokens,
  updatePassword,
  useAuth,
  verifyInviteLink,
} from './useAuth'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

beforeEach(() => {
  sb.reset()
  resetAuthState()
  sessionStorage.clear()
})

describe('signInWithPassword', () => {
  it('signs in with the trimmed email and keeps the session', async () => {
    sb.auth.signInWithPassword.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
    expect(await signInWithPassword('  staff@example.com ', 'hunter22')).toEqual({ ok: true })
    expect(sb.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'staff@example.com', password: 'hunter22' })
    expect(useAuth().user.value).toMatchObject({ id: 'u1' })
  })

  it('says the email or password is wrong without saying which', async () => {
    sb.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' },
    })
    expect(await signInWithPassword('staff@example.com', 'nope')).toEqual({
      ok: false,
      reason: 'invalid_credentials',
      message: 'Email or password is incorrect.',
    })
  })

  it('asks the person to wait when rate limited', async () => {
    sb.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { code: 'over_request_rate_limit', status: 429, message: 'Request rate limit reached' },
    })
    const result = await signInWithPassword('staff@example.com', 'hunter22')
    expect(result).toMatchObject({ ok: false, reason: 'rate_limited' })
    if (!result.ok) expect(result.message).toMatch(/wait a minute/i)
  })

  it('explains a network failure', async () => {
    sb.auth.signInWithPassword.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await signInWithPassword('staff@example.com', 'hunter22')).toEqual({
      ok: false,
      reason: 'error',
      message: 'Could not reach the server. Check your connection and try again.',
    })
  })
})

describe('safeRedirect', () => {
  it('only accepts paths inside the app', () => {
    expect(safeRedirect('/messages')).toBe('/messages')
    expect(safeRedirect('//evil.example')).toBeNull()
    expect(safeRedirect('https://evil.example')).toBeNull()
    expect(safeRedirect('/login')).toBeNull()
    expect(safeRedirect('/auth/set-password')).toBeNull()
    expect(safeRedirect(undefined)).toBeNull()
  })
})

describe('verifyInviteLink', () => {
  it('exchanges the token hash for a session', async () => {
    sb.auth.verifyOtp.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
    expect(await verifyInviteLink('hash-1', 'invite')).toEqual({ ok: true })
    expect(sb.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash-1', type: 'invite' })
  })

  it('explains an expired or reused link', async () => {
    sb.auth.verifyOtp.mockResolvedValueOnce({
      data: { session: null },
      error: { code: 'otp_expired', message: 'Email link is invalid or has expired' },
    })
    expect(await verifyInviteLink('old', 'invite')).toEqual({
      ok: false,
      message:
        'This invite link has expired or was already used. Ask the super admin to remove you on the Staff screen and invite you again.',
    })
    expect(inviteAccepted()).toBe(false)
  })

  it('marks the tab once the link was used', async () => {
    sb.auth.verifyOtp.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
    await verifyInviteLink('hash-1', 'invite')
    expect(inviteAccepted()).toBe(true)
  })

  it('forgets an earlier session in this browser before using the link', async () => {
    sb.signIn('someone-else')
    sb.auth.verifyOtp.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
    await verifyInviteLink('hash-1', 'invite')
    expect(sb.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(sb.auth.signOut.mock.invocationCallOrder[0]).toBeLessThan(sb.auth.verifyOtp.mock.invocationCallOrder[0]!)
    expect(useAuth().user.value).toMatchObject({ id: 'u1' })
  })

  it('leaves no earlier session alone when there is none', async () => {
    sb.auth.verifyOtp.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
    await verifyInviteLink('hash-1', 'invite')
    expect(sb.auth.signOut).not.toHaveBeenCalled()
  })

  it.each([
    [{ code: 'over_request_rate_limit', status: 429, message: 'Rate limit' }, 'Too many attempts. Wait a minute and try again.'],
    [{ status: 500, message: 'Internal error' }, 'Something went wrong. Try the link again in a moment.'],
    [{ message: 'Failed to fetch' }, 'Something went wrong. Try the link again in a moment.'],
  ])('keeps a link usable after %o', async (error, message) => {
    sb.auth.verifyOtp.mockResolvedValueOnce({ data: { session: null }, error })
    expect(await verifyInviteLink('hash-1', 'invite')).toEqual({ ok: false, message, retryable: true })
  })

  it('keeps a link usable after a network throw', async () => {
    sb.auth.verifyOtp.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await verifyInviteLink('hash-1', 'invite')).toMatchObject({ ok: false, retryable: true })
  })
})

describe('signOut', () => {
  it('forgets that this tab used an invite link', async () => {
    markInviteAccepted()
    await signOut()
    expect(inviteAccepted()).toBe(false)
  })
})

describe('startSessionFromTokens', () => {
  it('starts a session from the hash tokens', async () => {
    sb.auth.setSession.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
    expect(await startSessionFromTokens('at', 'rt')).toEqual({ ok: true })
    expect(sb.auth.setSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' })
  })

  it('treats rejected tokens as an expired invite', async () => {
    sb.auth.setSession.mockResolvedValueOnce({ data: { session: null }, error: { message: 'Invalid Refresh Token' } })
    const result = await startSessionFromTokens('at', 'rt')
    expect(result).toMatchObject({ ok: false })
    if (!result.ok) expect(result.message).toMatch(/expired or was already used/)
  })
})

describe('updatePassword', () => {
  it('sets the password', async () => {
    expect(await updatePassword('a-long-password')).toEqual({ ok: true })
    expect(sb.auth.updateUser).toHaveBeenCalledWith({ password: 'a-long-password' })
  })

  it.each([
    [{ code: 'weak_password', status: 422, message: 'Password is known to be weak' }, /too easy to guess/],
    [{ code: 'same_password', status: 422, message: 'New password should be different' }, /different from your current/],
    [{ code: 'session_not_found', status: 403, message: 'Session not found' }, /invite session has expired/],
    [{ name: 'AuthSessionMissingError', status: 400, message: 'Auth session missing!' }, /invite session has expired/],
  ])('maps %o to a clear message', async (error, expected) => {
    sb.auth.updateUser.mockResolvedValueOnce({ data: { user: null }, error })
    const result = await updatePassword('a-long-password')
    expect(result).toMatchObject({ ok: false })
    if (!result.ok) expect(result.message).toMatch(expected)
  })
})

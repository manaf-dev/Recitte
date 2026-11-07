import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { sb } from '@/test/supabaseMock'
import { createAdminRouter } from '@/router'
import { inviteAccepted, markInviteAccepted, resetAuthState } from './useAuth'
import { INVALID_LINK_MESSAGE, readInviteLink, useSetPassword, validatePassword } from './useSetPassword'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

const EXPIRED =
  'This invite link has expired or was already used. Ask the super admin to remove you on the Staff screen and invite you again.'

function at(url: string) {
  const u = new URL(url, 'http://admin.test')
  return { pathname: u.pathname, search: u.search, hash: u.hash }
}

async function setup() {
  const router = createAdminRouter(createMemoryHistory())
  await router.push('/auth/set-password')
  const replace = vi.spyOn(router, 'replace').mockResolvedValue(undefined)
  return { flow: useSetPassword(router), replace }
}

beforeEach(() => {
  sb.reset()
  resetAuthState()
  sessionStorage.clear()
})

describe('readInviteLink', () => {
  it('reads a token hash from our invite template', () => {
    expect(readInviteLink(at('/auth/set-password?token_hash=abc&type=invite'))).toEqual({
      kind: 'token_hash',
      tokenHash: 'abc',
      type: 'invite',
    })
  })

  it('reads the tokens Supabase puts in the hash', () => {
    expect(
      readInviteLink(at('/auth/set-password#access_token=at&expires_in=3600&refresh_token=rt&token_type=bearer&type=invite')),
    ).toEqual({ kind: 'tokens', accessToken: 'at', refreshToken: 'rt' })
  })

  it('explains an expired link from the hash or the query', () => {
    expect(readInviteLink(at('/auth/set-password#error=access_denied&error_code=otp_expired'))).toEqual({
      kind: 'error',
      message: EXPIRED,
    })
    expect(readInviteLink(at('/auth/set-password?error_code=otp_expired'))).toEqual({ kind: 'error', message: EXPIRED })
  })

  it('never shows the error text that came in on the URL', () => {
    expect(
      readInviteLink(at('/auth/set-password#error=x&error_code=bad&error_description=Call+0800+to+claim+a+prize')),
    ).toEqual({ kind: 'error', message: INVALID_LINK_MESSAGE })
    expect(readInviteLink(at('/auth/set-password?error_description=Visit+evil.example'))).toEqual({
      kind: 'error',
      message: INVALID_LINK_MESSAGE,
    })
  })

  it('finds nothing in a bare URL or an unknown link type', () => {
    expect(readInviteLink(at('/auth/set-password'))).toEqual({ kind: 'none' })
    expect(readInviteLink(at('/auth/set-password?token_hash=abc&type=nonsense'))).toEqual({ kind: 'none' })
  })
})

describe('validatePassword', () => {
  it('needs at least 8 characters and a matching confirmation', () => {
    expect(validatePassword('short', 'short')).toEqual({ password: 'Use at least 8 characters.' })
    expect(validatePassword('long-enough', '')).toEqual({ confirm: 'Enter the password again.' })
    expect(validatePassword('long-enough', 'long-enougH')).toEqual({ confirm: 'The passwords do not match.' })
    expect(validatePassword('long-enough', 'long-enough')).toEqual({})
  })
})

describe('useSetPassword', () => {
  it('waits for a click before using the token hash, then strips it from the URL', async () => {
    window.history.replaceState(null, '', '/auth/set-password?token_hash=abc&type=invite')
    const { flow } = await setup()
    await flow.start(at('/auth/set-password?token_hash=abc&type=invite'))
    expect(flow.phase.value).toBe('accept')
    expect(sb.auth.verifyOtp).not.toHaveBeenCalled()
    expect(window.location.search).toBe('')

    sb.auth.verifyOtp.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
    await flow.accept()
    expect(sb.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'invite' })
    expect(flow.phase.value).toBe('form')
  })

  it('shows the expired message when the token hash was already used', async () => {
    const { flow } = await setup()
    await flow.start(at('/auth/set-password?token_hash=abc&type=invite'))
    sb.auth.verifyOtp.mockResolvedValueOnce({
      data: { session: null },
      error: { code: 'otp_expired', message: 'Email link is invalid or has expired' },
    })
    await flow.accept()
    expect(flow.phase.value).toBe('invalid')
    expect(flow.problem.value).toBe(EXPIRED)
  })

  it('starts a session from hash tokens straight away', async () => {
    sb.auth.setSession.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
    const { flow } = await setup()
    await flow.start(at('/auth/set-password#access_token=at&refresh_token=rt&type=invite'))
    expect(sb.auth.setSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' })
    expect(flow.phase.value).toBe('form')
  })

  it('shows a link error from the hash', async () => {
    const { flow } = await setup()
    await flow.start(at('/auth/set-password#error=access_denied&error_code=otp_expired'))
    expect(flow.phase.value).toBe('invalid')
    expect(flow.problem.value).toBe(EXPIRED)
  })

  it('calls a visit with no link and no session invalid', async () => {
    const { flow } = await setup()
    await flow.start(at('/auth/set-password'))
    expect(flow.phase.value).toBe('invalid')
    expect(flow.problem.value).toBe(INVALID_LINK_MESSAGE)
  })

  it('keeps the form from a session that did not come through an invite link', async () => {
    sb.signIn()
    const { flow } = await setup()
    await flow.start(at('/auth/set-password'))
    expect(flow.phase.value).toBe('invalid')
    expect(flow.problem.value).toBe(INVALID_LINK_MESSAGE)
  })

  it('shows the form again on a reload after this tab used the link', async () => {
    sb.signIn()
    markInviteAccepted()
    const { flow } = await setup()
    await flow.start(at('/auth/set-password'))
    expect(flow.phase.value).toBe('form')
  })

  it('keeps the accept step with the error when the server hiccups', async () => {
    const { flow } = await setup()
    await flow.start(at('/auth/set-password?token_hash=abc&type=invite'))
    sb.auth.verifyOtp.mockResolvedValueOnce({ data: { session: null }, error: { status: 503, message: 'Unavailable' } })
    await flow.accept()
    expect(flow.phase.value).toBe('accept')
    expect(flow.linkError.value).toBe('Something went wrong. Try the link again in a moment.')

    sb.auth.verifyOtp.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
    await flow.accept()
    expect(flow.phase.value).toBe('form')
  })

  it('offers a retry when hash tokens hit a rate limit', async () => {
    sb.auth.setSession.mockResolvedValueOnce({
      data: { session: null },
      error: { code: 'over_request_rate_limit', status: 429, message: 'Rate limit' },
    })
    const { flow } = await setup()
    await flow.start(at('/auth/set-password#access_token=at&refresh_token=rt&type=invite'))
    expect(flow.phase.value).toBe('accept')
    expect(flow.linkError.value).toBe('Too many attempts. Wait a minute and try again.')
  })

  it('checks the form before calling Supabase', async () => {
    sb.signIn()
    markInviteAccepted()
    const { flow } = await setup()
    await flow.start(at('/auth/set-password'))
    flow.form.password = 'short'
    flow.form.confirm = 'other'
    await flow.submit()
    expect(flow.errors.value).toEqual({
      password: 'Use at least 8 characters.',
      confirm: 'The passwords do not match.',
    })
    expect(sb.auth.updateUser).not.toHaveBeenCalled()
  })

  it('sets the password, signs out and sends the person to sign in', async () => {
    sb.signIn()
    markInviteAccepted()
    const { flow, replace } = await setup()
    await flow.start(at('/auth/set-password'))
    flow.form.password = 'a-long-password'
    flow.form.confirm = 'a-long-password'
    await flow.submit()
    expect(sb.auth.updateUser).toHaveBeenCalledWith({ password: 'a-long-password' })
    expect(sb.auth.signOut).toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith({ name: 'login', query: { reason: 'password-set' } })
    expect(inviteAccepted()).toBe(false)
  })

  it('shows why Supabase refused the password and stays on the form', async () => {
    sb.signIn()
    markInviteAccepted()
    sb.auth.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'weak_password', status: 422, message: 'Password is known to be weak' },
    })
    const { flow, replace } = await setup()
    await flow.start(at('/auth/set-password'))
    flow.form.password = 'password1'
    flow.form.confirm = 'password1'
    await flow.submit()
    expect(flow.submitError.value).toMatch(/too easy to guess/)
    expect(sb.auth.signOut).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sb } from '@/test/supabaseMock'
import { useProfile } from './useProfile'
import { clearStaffProfile, loadStaffProfile, useStaffProfile } from './useStaffProfile'
import { initAuth, resetAuthState, useAuth } from './useAuth'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

/** Shaped like supabase-js's FunctionsHttpError: the Response sits in `context`. */
function httpError(status: number, body: unknown) {
  const err = new Error('Edge Function returned a non-2xx status code') as Error & { context: Response }
  err.context = new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  return err
}

const ROW = {
  user_id: 'user-1',
  email: 'staff@example.com',
  first_name: 'Amina',
  last_name: 'Mensah',
  role: 'staff',
  created_at: '2026-10-01T00:00:00Z',
}

beforeEach(async () => {
  sb.reset()
  resetAuthState()
  clearStaffProfile()
  sb.respond('staff', 'select', { data: ROW })
  await loadStaffProfile('user-1')
  sb.calls.length = 0
})

describe('useProfile name', () => {
  it('starts from the cached profile and is unchanged until edited', () => {
    const p = useProfile()
    expect(p.firstName.value).toBe('Amina')
    expect(p.lastName.value).toBe('Mensah')
    expect(p.nameChanged.value).toBe(false)
    p.firstName.value = '  Amina '
    expect(p.nameChanged.value).toBe(false)
    p.firstName.value = 'Ama'
    expect(p.nameChanged.value).toBe(true)
  })

  it.each([
    ['', 'Mensah', 'Enter a first name.', 'first_name'],
    ['   ', 'Mensah', 'Enter a first name.', 'first_name'],
    ['Amina', '', 'Enter a last name.', 'last_name'],
    ['a'.repeat(81), 'Mensah', 'Keep the first name to 80 characters or fewer.', 'first_name'],
    ['Amina', 'b'.repeat(81), 'Keep the last name to 80 characters or fewer.', 'last_name'],
  ])('sends nothing for first name %j and last name %j', async (first, last, error, field) => {
    const p = useProfile()
    p.firstName.value = first
    p.lastName.value = last
    expect(await p.saveName()).toEqual({ ok: false, error, field })
    expect(sb.calls).toHaveLength(0)
  })

  it('updates only the caller own row with trimmed names and refreshes the cached profile', async () => {
    sb.respond('staff', 'update', { data: [{ user_id: 'user-1' }] })
    const p = useProfile()
    p.firstName.value = '  Ama '
    p.lastName.value = ' Owusu  '
    expect(await p.saveName()).toEqual({ ok: true })
    const [call] = sb.callsFor('staff', 'update')
    expect(call?.payload).toEqual({ first_name: 'Ama', last_name: 'Owusu' })
    expect(call?.filters).toContainEqual(['eq', 'user_id', 'user-1'])
    const { profile } = useStaffProfile()
    expect(profile.value?.first_name).toBe('Ama')
    expect(profile.value?.last_name).toBe('Owusu')
    expect(p.nameChanged.value).toBe(false)
  })

  it('reports a database error and keeps the cached name', async () => {
    sb.respond('staff', 'update', { error: { code: '42501', message: 'denied' } })
    const p = useProfile()
    p.firstName.value = 'Ama'
    expect(await p.saveName()).toEqual({ ok: false, error: "You don't have permission to do that." })
    expect(useStaffProfile().profile.value?.first_name).toBe('Amina')
  })

  it('treats an update that matched no row as not saved', async () => {
    sb.respond('staff', 'update', { data: [] })
    const p = useProfile()
    p.firstName.value = 'Ama'
    const result = await p.saveName()
    expect(result.ok).toBe(false)
    expect(useStaffProfile().profile.value?.first_name).toBe('Amina')
  })
})

describe('useProfile email', () => {
  it.each([
    ['not-an-email', 'secret', 'Enter a valid email address.', 'email'],
    ['STAFF@example.com', 'secret', 'That is already your email.', 'email'],
    ['new@example.com', '', 'Enter your current password.', 'current_password'],
  ])('does not call the function for %j / %j', async (email, password, error, field) => {
    const p = useProfile()
    p.newEmail.value = email
    p.currentPassword.value = password
    expect(await p.changeEmail()).toEqual({ ok: false, error, field })
    expect(sb.client.functions.invoke).not.toHaveBeenCalled()
  })

  it('invokes update-email, clears the password, refreshes the session and the cached profile', async () => {
    sb.signIn()
    await initAuth()
    sb.client.functions.invoke.mockResolvedValueOnce({ data: { email: 'new@example.com' }, error: null })
    sb.auth.refreshSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'user-1', email: 'new@example.com' } } },
      error: null,
    })
    const p = useProfile()
    p.newEmail.value = '  New@Example.com '
    p.currentPassword.value = 'secret'
    expect(await p.changeEmail()).toEqual({ ok: true, email: 'new@example.com' })
    expect(sb.client.functions.invoke).toHaveBeenCalledWith('update-email', {
      body: { email: 'new@example.com', current_password: 'secret' },
    })
    expect(sb.auth.refreshSession).toHaveBeenCalledTimes(1)
    expect(p.currentPassword.value).toBe('')
    expect(useStaffProfile().profile.value?.email).toBe('new@example.com')
    expect(useAuth().user.value?.email).toBe('new@example.com')
  })

  async function failWith(status: number, message: string) {
    sb.client.functions.invoke.mockResolvedValueOnce({ data: null, error: httpError(status, { error: message }) })
    const p = useProfile()
    p.newEmail.value = 'new@example.com'
    p.currentPassword.value = 'secret'
    const result = await p.changeEmail()
    expect(sb.auth.refreshSession).not.toHaveBeenCalled()
    expect(p.currentPassword.value).toBe('secret')
    expect(useStaffProfile().profile.value?.email).toBe('staff@example.com')
    return result
  }

  it.each([
    [400, 'Your current password is incorrect.', 'current_password'],
    [400, 'Enter your current password.', 'current_password'],
    [429, 'Too many attempts. Wait 15 minutes and try again.', 'current_password'],
    [429, 'Too many attempts. Wait a minute and try again.', 'current_password'],
    [409, 'That email is already used by another account.', 'email'],
    [400, 'That is already your email.', 'email'],
    [400, 'Enter a valid email address.', 'email'],
    [400, 'That email address cannot be used.', 'email'],
    [500, 'Could not change your email. Try again.', 'email'],
  ])('maps a %i "%s" to the %s field', async (status, message, field) => {
    expect(await failWith(status, message)).toEqual({ ok: false, error: message, field })
  })

  it.each([
    [401, 'Sign in first.'],
    [403, 'Only staff can do this.'],
  ])('treats a %i as an expired session', async (status, message) => {
    expect(await failWith(status, message)).toEqual({ ok: false, error: message, reason: 'session' })
  })

  it('flags a 500 saying the email may have changed as uncertain, not a field error', async () => {
    const message =
      'Your sign-in email may have changed to new@example.com. Sign out and try signing in with it, or contact the super admin.'
    expect(await failWith(500, message)).toEqual({ ok: false, error: message, reason: 'uncertain' })
  })

  it('reports a network failure under the email', async () => {
    sb.client.functions.invoke.mockRejectedValueOnce(new Error('Failed to send a request to the Edge Function'))
    const p = useProfile()
    p.newEmail.value = 'new@example.com'
    p.currentPassword.value = 'secret'
    expect(await p.changeEmail()).toEqual({
      ok: false,
      error: 'Could not reach the server. Check your connection and try again.',
      field: 'email',
    })
  })
})

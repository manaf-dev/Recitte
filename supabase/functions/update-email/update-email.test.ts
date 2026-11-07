import { afterEach, describe, expect, it, vi } from 'vitest'
import { callerDeps, post, STAFF, SUPER } from '../_shared/test-helpers.ts'
import {
  AUTH_RATE_LIMITED,
  CHANGE_FAILED,
  createUpdateEmailHandler,
  EMAIL_INVALID,
  EMAIL_NOT_AUTHORIZED,
  EMAIL_TAKEN,
  EMAIL_UNCHANGED,
  emailMayHaveChanged,
  FAILURE_WINDOW_MS,
  PASSWORD_MISSING,
  PASSWORD_WRONG,
  TOO_MANY_PASSWORD_ATTEMPTS,
  type UpdateEmailDeps,
} from './handler.ts'

const BODY = { email: 'new@example.com', current_password: 'hunter22' }
const NOW = new Date('2026-11-08T12:00:00Z')

function setup(overrides: Partial<UpdateEmailDeps> = {}) {
  const emails: Record<string, string> = { [STAFF.id]: STAFF.email, [SUPER.id]: SUPER.email }
  const deps: UpdateEmailDeps = {
    ...callerDeps,
    now: () => NOW,
    getAuthEmail: vi.fn(async (userId: string) => emails[userId] ?? null),
    countPasswordFailures: vi.fn(async () => 0),
    recordPasswordFailure: vi.fn(async () => {}),
    clearPasswordFailures: vi.fn(async () => {}),
    verifyPassword: vi.fn(async () => 'ok' as const),
    isEmailTaken: vi.fn(async () => false),
    setAuthEmail: vi.fn(async () => ({})),
    setStaffEmail: vi.fn(async () => ({})),
    signOutOtherSessions: vi.fn(async () => ({})),
    ...overrides,
  }
  return { deps, handle: createUpdateEmailHandler(deps) }
}

function nothingChanged(deps: UpdateEmailDeps) {
  expect(deps.setAuthEmail).not.toHaveBeenCalled()
  expect(deps.setStaffEmail).not.toHaveBeenCalled()
  expect(deps.signOutOtherSessions).not.toHaveBeenCalled()
}

function quietLog() {
  return vi.spyOn(console, 'error').mockImplementation(() => {})
}

async function expectJson(res: Response, status: number, body: unknown) {
  expect(res.status).toBe(status)
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  expect(await res.json()).toEqual(body)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('update-email', () => {
  it('answers CORS preflight and refuses other methods', async () => {
    const { handle } = setup()
    expect((await handle(new Request('http://localhost/fn', { method: 'OPTIONS' }))).status).toBe(200)
    expect((await handle(new Request('http://localhost/fn', { method: 'GET' }))).status).toBe(405)
  })

  it('rejects a request with no session', async () => {
    const { deps, handle } = setup()
    expect((await handle(post(BODY))).status).toBe(401)
    expect(deps.verifyPassword).not.toHaveBeenCalled()
    nothingChanged(deps)
  })

  it('rejects an invalid token', async () => {
    const { deps, handle } = setup()
    expect((await handle(post(BODY, 'forged'))).status).toBe(401)
    nothingChanged(deps)
  })

  it('rejects a signed-in user who is not staff with 403', async () => {
    const { deps, handle } = setup()
    await expectJson(await handle(post(BODY, 'token-stranger')), 403, { error: 'Only staff can do this.' })
    expect(deps.verifyPassword).not.toHaveBeenCalled()
    nothingChanged(deps)
  })

  it('changes a plain staff member’s email in auth and on the staff row, then ends other sessions', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ email: ' New@Example.COM ', current_password: 'hunter22' }, 'token-staff'))
    await expectJson(res, 200, { email: 'new@example.com' })
    expect(deps.verifyPassword).toHaveBeenCalledWith(STAFF.email, 'hunter22')
    expect(deps.clearPasswordFailures).toHaveBeenCalledWith(STAFF.id)
    expect(deps.recordPasswordFailure).not.toHaveBeenCalled()
    expect(deps.isEmailTaken).toHaveBeenCalledWith('new@example.com', STAFF.id)
    expect(deps.setAuthEmail).toHaveBeenCalledTimes(1)
    expect(deps.setAuthEmail).toHaveBeenCalledWith(STAFF.id, 'new@example.com')
    expect(deps.setStaffEmail).toHaveBeenCalledWith(STAFF.id, 'new@example.com', STAFF.email)
    expect(deps.signOutOtherSessions).toHaveBeenCalledWith('token-staff')
  })

  it('lets a super admin change their own email too', async () => {
    const { deps, handle } = setup()
    expect((await handle(post(BODY, 'token-super'))).status).toBe(200)
    expect(deps.setAuthEmail).toHaveBeenCalledWith(SUPER.id, 'new@example.com')
    expect(deps.setStaffEmail).toHaveBeenCalledWith(SUPER.id, 'new@example.com', SUPER.email)
    expect(deps.signOutOtherSessions).toHaveBeenCalledWith('token-super')
  })

  it('checks the password against the live auth email, not the token claim', async () => {
    const { deps, handle } = setup({ getAuthEmail: vi.fn(async () => 'renamed@example.com') })
    expect((await handle(post({ ...BODY, email: 'staff@example.com' }, 'token-staff'))).status).toBe(200)
    expect(deps.verifyPassword).toHaveBeenCalledWith('renamed@example.com', 'hunter22')
    expect(deps.setStaffEmail).toHaveBeenCalledWith(STAFF.id, 'staff@example.com', 'renamed@example.com')
  })

  it.each([undefined, null, '', '   ', 'nope', 'a@b', 'a b@example.com', 7])(
    'refuses the email %j with 400',
    async (email) => {
      const { deps, handle } = setup()
      await expectJson(await handle(post({ email, current_password: 'hunter22' }, 'token-staff')), 400, {
        error: EMAIL_INVALID,
      })
      expect(deps.verifyPassword).not.toHaveBeenCalled()
      nothingChanged(deps)
    },
  )

  it('refuses a body that is not a JSON object', async () => {
    const { deps, handle } = setup()
    const req = new Request('http://localhost/fn', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-staff' },
      body: 'not json',
    })
    await expectJson(await handle(req), 400, { error: EMAIL_INVALID })
    nothingChanged(deps)
  })

  it.each(['staff@example.com', ' STAFF@Example.com '])('refuses the current email %j with 400', async (email) => {
    const { deps, handle } = setup()
    await expectJson(await handle(post({ email, current_password: 'hunter22' }, 'token-staff')), 400, {
      error: EMAIL_UNCHANGED,
    })
    expect(deps.verifyPassword).not.toHaveBeenCalled()
    nothingChanged(deps)
  })

  it('compares with a current email stored in mixed case', async () => {
    const { handle } = setup({ getAuthEmail: vi.fn(async () => 'Staff@Example.com') })
    const res = await handle(post({ email: 'staff@example.com', current_password: 'hunter22' }, 'token-staff'))
    expect(await res.json()).toEqual({ error: EMAIL_UNCHANGED })
  })

  it.each([undefined, null, '', 42])('refuses the current password %j with 400', async (current_password) => {
    const { deps, handle } = setup()
    await expectJson(await handle(post({ email: 'new@example.com', current_password }, 'token-staff')), 400, {
      error: PASSWORD_MISSING,
    })
    expect(deps.countPasswordFailures).not.toHaveBeenCalled()
    expect(deps.verifyPassword).not.toHaveBeenCalled()
    nothingChanged(deps)
  })

  it('refuses a wrong current password with 400 and records the failure', async () => {
    const { deps, handle } = setup({ verifyPassword: vi.fn(async () => 'wrong' as const) })
    await expectJson(await handle(post(BODY, 'token-staff')), 400, { error: PASSWORD_WRONG })
    expect(deps.recordPasswordFailure).toHaveBeenCalledWith(STAFF.id)
    expect(deps.clearPasswordFailures).not.toHaveBeenCalled()
    expect(deps.isEmailTaken).not.toHaveBeenCalled()
    nothingChanged(deps)
  })

  it('counts failures over the last 15 minutes', async () => {
    const { deps, handle } = setup()
    await handle(post(BODY, 'token-staff'))
    expect(deps.countPasswordFailures).toHaveBeenCalledWith(STAFF.id, new Date(NOW.getTime() - FAILURE_WINDOW_MS))
    expect(FAILURE_WINDOW_MS).toBe(15 * 60 * 1000)
  })

  it('still checks the password after 4 recent failures', async () => {
    const { deps, handle } = setup({ countPasswordFailures: vi.fn(async () => 4) })
    expect((await handle(post(BODY, 'token-staff'))).status).toBe(200)
    expect(deps.verifyPassword).toHaveBeenCalled()
  })

  it.each([5, 9])('answers 429 without checking the password after %i recent failures', async (failures) => {
    const { deps, handle } = setup({ countPasswordFailures: vi.fn(async () => failures) })
    await expectJson(await handle(post(BODY, 'token-staff')), 429, { error: TOO_MANY_PASSWORD_ATTEMPTS })
    expect(deps.verifyPassword).not.toHaveBeenCalled()
    expect(deps.recordPasswordFailure).not.toHaveBeenCalled()
    nothingChanged(deps)
  })

  it('fails with 500 when the password cannot be checked', async () => {
    const { deps, handle } = setup({ verifyPassword: vi.fn(async () => 'error' as const) })
    await expectJson(await handle(post(BODY, 'token-staff')), 500, { error: CHANGE_FAILED })
    expect(deps.recordPasswordFailure).not.toHaveBeenCalled()
    nothingChanged(deps)
  })

  it.each<[string, Partial<UpdateEmailDeps>]>([
    ['the password check', { verifyPassword: vi.fn(async () => Promise.reject(new Error('no publishable key'))) }],
    ['the failure count', { countPasswordFailures: vi.fn(async () => Promise.reject(new Error('db down'))) }],
    [
      'recording a failure',
      {
        verifyPassword: vi.fn(async () => 'wrong' as const),
        recordPasswordFailure: vi.fn(async () => Promise.reject(new Error('db down'))),
      },
    ],
    ['the email lookup', { isEmailTaken: vi.fn(async () => Promise.reject(new Error('db down'))) }],
  ])('answers a JSON 500 with CORS when %s throws', async (_label, overrides) => {
    quietLog()
    const { deps, handle } = setup(overrides)
    await expectJson(await handle(post(BODY, 'token-staff')), 500, { error: CHANGE_FAILED })
    nothingChanged(deps)
  })

  it('fails with 500 when the current auth email cannot be read', async () => {
    quietLog()
    const { deps, handle } = setup({ getAuthEmail: vi.fn(async () => null) })
    await expectJson(await handle(post(BODY, 'token-staff')), 500, { error: CHANGE_FAILED })
    expect(deps.verifyPassword).not.toHaveBeenCalled()
    nothingChanged(deps)
  })

  it('refuses an email another account or staff row uses with 409', async () => {
    const { deps, handle } = setup({ isEmailTaken: vi.fn(async () => true) })
    await expectJson(await handle(post(BODY, 'token-staff')), 409, { error: EMAIL_TAKEN })
    nothingChanged(deps)
  })

  it.each<[string, Awaited<ReturnType<UpdateEmailDeps['setAuthEmail']>>, number, string]>([
    ['another account', { error: 'taken', code: 'email_exists', status: 422, alreadyRegistered: true }, 409, EMAIL_TAKEN],
    ['an invalid address', { error: 'bad', code: 'email_address_invalid', status: 400 }, 400, EMAIL_INVALID],
    ['a blocked address', { error: 'no', code: 'email_address_not_authorized', status: 400 }, 400, EMAIL_NOT_AUTHORIZED],
    ['a 429', { error: 'slow down', status: 429 }, 429, AUTH_RATE_LIMITED],
    ['an over_ limit code', { error: 'slow down', code: 'over_email_send_rate_limit', status: 400 }, 429, AUTH_RATE_LIMITED],
  ])('maps Supabase Auth refusing %s', async (_label, result, status, error) => {
    const { deps, handle } = setup({ setAuthEmail: vi.fn(async () => result) })
    await expectJson(await handle(post(BODY, 'token-staff')), status, { error })
    expect(deps.setAuthEmail).toHaveBeenCalledTimes(1)
    expect(deps.setStaffEmail).not.toHaveBeenCalled()
    expect(deps.signOutOtherSessions).not.toHaveBeenCalled()
  })

  it('fails with 500, logging only the code, when the auth update fails otherwise', async () => {
    const log = quietLog()
    const { deps, handle } = setup({
      setAuthEmail: vi.fn(async () => ({ error: 'Database error', code: 'unexpected_failure', status: 500 })),
    })
    await expectJson(await handle(post(BODY, 'token-staff')), 500, { error: CHANGE_FAILED })
    expect(deps.setStaffEmail).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(expect.any(String), { userId: STAFF.id, code: 'unexpected_failure', status: 500 })
  })

  it('restores the old auth email when the staff row cannot be updated', async () => {
    const { deps, handle } = setup({ setStaffEmail: vi.fn(async () => ({ error: 'No staff row matched' })) })
    await expectJson(await handle(post(BODY, 'token-staff')), 500, { error: CHANGE_FAILED })
    expect(deps.setAuthEmail).toHaveBeenNthCalledWith(1, STAFF.id, 'new@example.com')
    expect(deps.setAuthEmail).toHaveBeenNthCalledWith(2, STAFF.id, STAFF.email)
    expect(deps.signOutOtherSessions).not.toHaveBeenCalled()
  })

  it('tells the caller their sign-in email may have changed when the restore fails, without logging emails', async () => {
    const log = quietLog()
    const setAuthEmail = vi
      .fn<UpdateEmailDeps['setAuthEmail']>()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ error: 'down', code: 'unexpected_failure', status: 500 })
    const { deps, handle } = setup({ setAuthEmail, setStaffEmail: vi.fn(async () => ({ error: 'boom' })) })
    await expectJson(await handle(post(BODY, 'token-staff')), 500, { error: emailMayHaveChanged('new@example.com') })
    expect(emailMayHaveChanged('new@example.com')).toBe(
      'Your sign-in email may have changed to new@example.com. Sign out and try signing in with it, or contact the super admin.',
    )
    expect(setAuthEmail).toHaveBeenCalledTimes(2)
    expect(deps.signOutOtherSessions).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(expect.stringContaining('restore'), {
      userId: STAFF.id,
      code: 'unexpected_failure',
      status: 500,
    })
    expect(JSON.stringify(log.mock.calls)).not.toContain('@example.com')
  })

  it('still succeeds, logging the code, when other sessions cannot be signed out', async () => {
    const log = quietLog()
    const { handle } = setup({ signOutOtherSessions: vi.fn(async () => ({ error: 'nope', code: 'session_not_found' })) })
    await expectJson(await handle(post(BODY, 'token-staff')), 200, { email: 'new@example.com' })
    expect(log).toHaveBeenCalledWith(expect.stringContaining('other sessions'), {
      userId: STAFF.id,
      code: 'session_not_found',
    })
  })

  it('still succeeds when signing out other sessions throws', async () => {
    quietLog()
    const { handle } = setup({ signOutOtherSessions: vi.fn(async () => Promise.reject(new Error('network'))) })
    await expectJson(await handle(post(BODY, 'token-staff')), 200, { email: 'new@example.com' })
  })
})

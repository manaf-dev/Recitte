import { describe, expect, it, vi } from 'vitest'
import { callerDeps, post } from '../_shared/test-helpers.ts'
import {
  ADMIN_URL_MISSING,
  ALREADY_REGISTERED,
  createInviteHandler,
  escapeLike,
  type InviteDeps,
  isAlreadyRegistered,
  resolveAdminUrl,
} from './handler.ts'

function setup(overrides: Partial<InviteDeps> = {}) {
  const deps: InviteDeps = {
    ...callerDeps,
    adminUrl: 'https://admin.example.org',
    isStaffEmail: vi.fn(async () => false),
    createInvite: vi.fn(async () => ({ id: 'user-new', hashedToken: 'hash-abc' })),
    insertStaff: vi.fn(async () => ({})),
    deleteUser: vi.fn(async () => {}),
    ...overrides,
  }
  return { deps, handle: createInviteHandler(deps) }
}

describe('invite-staff', () => {
  it('rejects a request with no session', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ email: 'new@example.com' }))
    expect(res.status).toBe(401)
    expect(deps.createInvite).not.toHaveBeenCalled()
  })

  it('rejects an invalid token', async () => {
    const { handle } = setup()
    expect((await handle(post({ email: 'new@example.com' }, 'forged'))).status).toBe(401)
  })

  it('rejects a staff member with 403', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ email: 'new@example.com', role: 'super_admin' }, 'token-staff'))
    expect(res.status).toBe(403)
    expect(deps.createInvite).not.toHaveBeenCalled()
    expect(deps.insertStaff).not.toHaveBeenCalled()
  })

  it('rejects a signed-in user who is not staff', async () => {
    const { handle } = setup()
    expect((await handle(post({ email: 'new@example.com' }, 'token-stranger'))).status).toBe(403)
  })

  it('invites as plain staff by default and returns an invite link to the admin', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ email: ' New@Example.com ' }, 'token-super'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      user_id: 'user-new',
      email: 'new@example.com',
      role: 'staff',
      invite_url: 'https://admin.example.org/auth/set-password#token_hash=hash-abc&type=invite',
    })
    expect(deps.createInvite).toHaveBeenCalledWith('new@example.com', 'https://admin.example.org/auth/set-password')
    expect(deps.insertStaff).toHaveBeenCalledWith({ user_id: 'user-new', email: 'new@example.com', role: 'staff' })
  })

  it('invites a super admin when asked', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ email: 'boss@example.com', role: 'super_admin' }, 'token-super'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ role: 'super_admin' })
    expect(deps.insertStaff).toHaveBeenCalledWith({ user_id: 'user-new', email: 'boss@example.com', role: 'super_admin' })
  })

  it('accepts an explicit staff role', async () => {
    const { deps, handle } = setup()
    expect((await handle(post({ email: 'new@example.com', role: 'staff' }, 'token-super'))).status).toBe(200)
    expect(deps.insertStaff).toHaveBeenCalledWith(expect.objectContaining({ role: 'staff' }))
  })

  it.each(['owner', 'SUPER_ADMIN', '', 1, null])('refuses the role %j with 400', async (role) => {
    const { deps, handle } = setup()
    const res = await handle(post({ email: 'new@example.com', role }, 'token-super'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Choose a valid role.' })
    expect(deps.createInvite).not.toHaveBeenCalled()
    expect(deps.insertStaff).not.toHaveBeenCalled()
  })

  it('drops a trailing slash on the admin URL and encodes the token in the invite link', async () => {
    const { deps, handle } = setup({
      adminUrl: 'https://admin.example.org/',
      createInvite: vi.fn(async () => ({ id: 'user-new', hashedToken: 'a+b/c=d&e f' })),
    })
    const res = await handle(post({ email: 'new@example.com' }, 'token-super'))
    expect(deps.createInvite).toHaveBeenCalledWith('new@example.com', 'https://admin.example.org/auth/set-password')
    const { invite_url } = await res.json()
    expect(invite_url).toBe(
      'https://admin.example.org/auth/set-password#token_hash=a%2Bb%2Fc%3Dd%26e%20f&type=invite',
    )
    // The token is in the fragment, never the query, so it is not sent to any server.
    const url = new URL(invite_url)
    expect(url.search).toBe('')
    const fragment = new URLSearchParams(url.hash.slice(1))
    expect(fragment.get('token_hash')).toBe('a+b/c=d&e f')
    expect(fragment.get('type')).toBe('invite')
  })

  it('refuses to invite with 500 when the admin URL is not set', async () => {
    const { deps, handle } = setup({ adminUrl: undefined })
    const res = await handle(post({ email: 'new@example.com' }, 'token-super'))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: ADMIN_URL_MISSING })
    expect(deps.createInvite).not.toHaveBeenCalled()
    expect(deps.insertStaff).not.toHaveBeenCalled()
  })

  it('still checks the caller before reporting a missing admin URL', async () => {
    const { handle } = setup({ adminUrl: undefined })
    expect((await handle(post({ email: 'new@example.com' }))).status).toBe(401)
    expect((await handle(post({ email: 'new@example.com' }, 'token-staff'))).status).toBe(403)
  })

  it('validates the email', async () => {
    const { deps, handle } = setup()
    expect((await handle(post({ email: 'nope' }, 'token-super'))).status).toBe(400)
    expect((await handle(post({}, 'token-super'))).status).toBe(400)
    expect(deps.createInvite).not.toHaveBeenCalled()
  })

  it('refuses someone already on staff', async () => {
    const { deps, handle } = setup({ isStaffEmail: vi.fn(async () => true) })
    expect((await handle(post({ email: 'staff@example.com' }, 'token-super'))).status).toBe(409)
    expect(deps.createInvite).not.toHaveBeenCalled()
  })

  it('passes on an invite error from Supabase Auth', async () => {
    const { deps, handle } = setup({ createInvite: vi.fn(async () => ({ error: 'Database error saving new user' })) })
    const res = await handle(post({ email: 'new@example.com' }, 'token-super'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Database error saving new user' })
    expect(deps.insertStaff).not.toHaveBeenCalled()
  })

  it('explains an email that already has an auth account with 409', async () => {
    const { deps, handle } = setup({
      createInvite: vi.fn(async () => ({
        error: 'A user with this email address has already been registered',
        alreadyRegistered: true,
      })),
    })
    const res = await handle(post({ email: 'old@example.com' }, 'token-super'))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: ALREADY_REGISTERED })
    expect(deps.insertStaff).not.toHaveBeenCalled()
    expect(deps.deleteUser).not.toHaveBeenCalled()
  })

  it('removes the auth user again if the staff row cannot be saved', async () => {
    const { deps, handle } = setup({ insertStaff: vi.fn(async () => ({ error: 'boom' })) })
    const res = await handle(post({ email: 'new@example.com', role: 'super_admin' }, 'token-super'))
    expect(res.status).toBe(500)
    expect(await res.json()).not.toHaveProperty('invite_url')
    expect(deps.deleteUser).toHaveBeenCalledWith('user-new')
  })

  it('answers CORS preflight and refuses other methods', async () => {
    const { handle } = setup()
    expect((await handle(new Request('http://localhost/fn', { method: 'OPTIONS' }))).status).toBe(200)
    expect((await handle(new Request('http://localhost/fn', { method: 'GET' }))).status).toBe(405)
  })
})

describe('resolveAdminUrl', () => {
  it('uses ADMIN_URL when it is set', () => {
    expect(resolveAdminUrl('https://admin.example.org', 'https://abc.supabase.co')).toBe('https://admin.example.org')
    expect(resolveAdminUrl(' https://admin.example.org ', undefined)).toBe('https://admin.example.org')
  })

  it.each(['http://127.0.0.1:54321', 'http://localhost:54321', 'http://kong:8000'])(
    'falls back to the local admin app for %s',
    (supabaseUrl) => {
      expect(resolveAdminUrl(undefined, supabaseUrl)).toBe('http://127.0.0.1:5174')
      expect(resolveAdminUrl('', supabaseUrl)).toBe('http://127.0.0.1:5174')
    },
  )

  it.each(['https://abc.supabase.co', 'https://localhost.evil.example', undefined, 'not a url'])(
    'gives nothing for a hosted or unknown SUPABASE_URL %j',
    (supabaseUrl) => {
      expect(resolveAdminUrl(undefined, supabaseUrl)).toBeUndefined()
    },
  )
})

describe('isAlreadyRegistered', () => {
  it.each(['email_exists', 'user_already_exists'])('recognises the %s code', (code) => {
    expect(isAlreadyRegistered({ code, message: 'anything' })).toBe(true)
  })

  it('recognises the message older releases send without a code', () => {
    expect(isAlreadyRegistered({ message: 'A user with this email address has already been registered' })).toBe(true)
  })

  it('ignores other errors', () => {
    expect(isAlreadyRegistered(null)).toBe(false)
    expect(isAlreadyRegistered(undefined)).toBe(false)
    expect(isAlreadyRegistered({ code: 'unexpected_failure', message: 'Database error saving new user' })).toBe(false)
    expect(isAlreadyRegistered({ code: 'validation_failed', message: 'has already been registered' })).toBe(false)
    expect(isAlreadyRegistered({ message: 'Identity already exists' })).toBe(false)
  })
})

describe('escapeLike', () => {
  it('escapes LIKE wildcards and backslashes', () => {
    expect(escapeLike('first_last%@example.com')).toBe('first\\_last\\%@example.com')
    expect(escapeLike('a\\b@example.com')).toBe('a\\\\b@example.com')
    expect(escapeLike('plain@example.com')).toBe('plain@example.com')
  })
})

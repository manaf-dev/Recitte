import { describe, expect, it, vi } from 'vitest'
import { callerDeps, post } from '../_shared/test-helpers.ts'
import { createInviteHandler, type InviteDeps } from './handler.ts'

function setup(overrides: Partial<InviteDeps> = {}) {
  const deps: InviteDeps = {
    ...callerDeps,
    adminUrl: 'https://admin.example.org',
    isStaffEmail: vi.fn(async () => false),
    inviteUser: vi.fn(async () => ({ id: 'user-new' })),
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
    expect(deps.inviteUser).not.toHaveBeenCalled()
  })

  it('rejects an invalid token', async () => {
    const { handle } = setup()
    expect((await handle(post({ email: 'new@example.com' }, 'forged'))).status).toBe(401)
  })

  it('rejects a staff member with 403', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ email: 'new@example.com' }, 'token-staff'))
    expect(res.status).toBe(403)
    expect(deps.inviteUser).not.toHaveBeenCalled()
    expect(deps.insertStaff).not.toHaveBeenCalled()
  })

  it('rejects a signed-in user who is not staff', async () => {
    const { handle } = setup()
    expect((await handle(post({ email: 'new@example.com' }, 'token-stranger'))).status).toBe(403)
  })

  it('lets the super admin invite, as plain staff, redirecting to the admin', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ email: ' New@Example.com ' }, 'token-super'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user_id: 'user-new', email: 'new@example.com', role: 'staff' })
    expect(deps.inviteUser).toHaveBeenCalledWith('new@example.com', 'https://admin.example.org')
    expect(deps.insertStaff).toHaveBeenCalledWith({ user_id: 'user-new', email: 'new@example.com', role: 'staff' })
  })

  it('ignores a role in the request body', async () => {
    const { deps, handle } = setup()
    await handle(post({ email: 'new@example.com', role: 'super_admin' }, 'token-super'))
    expect(deps.insertStaff).toHaveBeenCalledWith(expect.objectContaining({ role: 'staff' }))
  })

  it('validates the email', async () => {
    const { deps, handle } = setup()
    expect((await handle(post({ email: 'nope' }, 'token-super'))).status).toBe(400)
    expect((await handle(post({}, 'token-super'))).status).toBe(400)
    expect(deps.inviteUser).not.toHaveBeenCalled()
  })

  it('refuses someone already on staff', async () => {
    const { deps, handle } = setup({ isStaffEmail: vi.fn(async () => true) })
    expect((await handle(post({ email: 'staff@example.com' }, 'token-super'))).status).toBe(409)
    expect(deps.inviteUser).not.toHaveBeenCalled()
  })

  it('passes on an invite error from Supabase Auth', async () => {
    const { handle } = setup({ inviteUser: vi.fn(async () => ({ error: 'Email rate limit exceeded' })) })
    const res = await handle(post({ email: 'new@example.com' }, 'token-super'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Email rate limit exceeded' })
  })

  it('removes the auth user again if the staff row cannot be saved', async () => {
    const { deps, handle } = setup({ insertStaff: vi.fn(async () => ({ error: 'boom' })) })
    const res = await handle(post({ email: 'new@example.com' }, 'token-super'))
    expect(res.status).toBe(500)
    expect(deps.deleteUser).toHaveBeenCalledWith('user-new')
  })

  it('answers CORS preflight and refuses other methods', async () => {
    const { handle } = setup()
    expect((await handle(new Request('http://localhost/fn', { method: 'OPTIONS' }))).status).toBe(200)
    expect((await handle(new Request('http://localhost/fn', { method: 'GET' }))).status).toBe(405)
  })
})

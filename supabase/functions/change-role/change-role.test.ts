import { afterEach, describe, expect, it, vi } from 'vitest'
import { callerDeps, post, STAFF, SUPER } from '../_shared/test-helpers.ts'
import {
  CHANGE_FAILED,
  type ChangeRoleDeps,
  createChangeRoleHandler,
  NOT_STAFF,
  OWN_ROLE,
  LAST_SUPER_ADMIN,
  ROLE_INVALID,
  USER_ID_MISSING,
} from './handler.ts'

const OTHER_SUPER = 'user-other-super'

const rows = {
  [SUPER.id]: { user_id: SUPER.id, role: 'super_admin' as const },
  [STAFF.id]: { user_id: STAFF.id, role: 'staff' as const },
  [OTHER_SUPER]: { user_id: OTHER_SUPER, role: 'super_admin' as const },
}

function setup(overrides: Partial<ChangeRoleDeps> = {}) {
  const deps: ChangeRoleDeps = {
    ...callerDeps,
    getStaff: vi.fn(async (id: string) => rows[id] ?? null),
    setRole: vi.fn(async () => ({ updated: 1 })),
    ...overrides,
  }
  return { deps, handle: createChangeRoleHandler(deps) }
}

afterEach(() => vi.restoreAllMocks())

describe('change-role', () => {
  it('answers the CORS preflight', async () => {
    const { handle } = setup()
    const res = await handle(new Request('http://localhost/fn', { method: 'OPTIONS' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('rejects methods other than POST', async () => {
    const { handle } = setup()
    expect((await handle(new Request('http://localhost/fn', { method: 'GET' }))).status).toBe(405)
  })

  it('rejects a request with no session', async () => {
    const { deps, handle } = setup()
    expect((await handle(post({ user_id: STAFF.id, role: 'super_admin' }))).status).toBe(401)
    expect(deps.setRole).not.toHaveBeenCalled()
  })

  it('rejects a signed-in user who is not staff', async () => {
    const { deps, handle } = setup()
    expect((await handle(post({ user_id: STAFF.id, role: 'super_admin' }, 'token-stranger'))).status).toBe(403)
    expect(deps.setRole).not.toHaveBeenCalled()
  })

  it('rejects a staff member with 403', async () => {
    const { deps, handle } = setup()
    expect((await handle(post({ user_id: STAFF.id, role: 'super_admin' }, 'token-staff'))).status).toBe(403)
    expect(deps.setRole).not.toHaveBeenCalled()
  })

  it('requires a user_id', async () => {
    const { handle } = setup()
    const res = await handle(post({ role: 'staff' }, 'token-super'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: USER_ID_MISSING })
  })

  it('rejects a body that is not JSON', async () => {
    const { handle } = setup()
    const req = new Request('http://localhost/fn', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-super' },
      body: 'not json',
    })
    const res = await handle(req)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: USER_ID_MISSING })
  })

  it.each([undefined, '', 'owner', 7])('rejects the role %s', async (role) => {
    const { deps, handle } = setup()
    const res = await handle(post({ user_id: STAFF.id, role }, 'token-super'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: ROLE_INVALID })
    expect(deps.setRole).not.toHaveBeenCalled()
  })

  it('blocks the super admin from changing their own role', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ user_id: SUPER.id, role: 'staff' }, 'token-super'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: OWN_ROLE })
    expect(deps.getStaff).not.toHaveBeenCalled()
    expect(deps.setRole).not.toHaveBeenCalled()
  })

  it('returns 404 for someone not on the staff list', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ user_id: 'nobody', role: 'staff' }, 'token-super'))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: NOT_STAFF })
    expect(deps.setRole).not.toHaveBeenCalled()
  })

  it('leaves an unchanged role alone', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ user_id: STAFF.id, role: 'staff' }, 'token-super'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user_id: STAFF.id, role: 'staff' })
    expect(deps.setRole).not.toHaveBeenCalled()
  })

  it('promotes a staff member to super admin', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ user_id: STAFF.id, role: 'super_admin' }, 'token-super'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user_id: STAFF.id, role: 'super_admin' })
    expect(deps.setRole).toHaveBeenCalledWith(STAFF.id, 'super_admin')
  })

  it('demotes another super admin to staff', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ user_id: OTHER_SUPER, role: 'staff' }, 'token-super'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user_id: OTHER_SUPER, role: 'staff' })
    expect(deps.setRole).toHaveBeenCalledWith(OTHER_SUPER, 'staff')
  })

  it('returns 404 when the update matches no row', async () => {
    const { handle } = setup({ setRole: vi.fn(async () => ({ updated: 0 })) })
    const res = await handle(post({ user_id: STAFF.id, role: 'super_admin' }, 'token-super'))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: NOT_STAFF })
  })

  it('answers 409 when the database keeps the last super admin', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { handle } = setup({
      setRole: vi.fn(async () => ({ updated: 0, error: { code: 'P0001', message: LAST_SUPER_ADMIN } })),
    })
    const res = await handle(post({ user_id: OTHER_SUPER, role: 'staff' }, 'token-super'))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'At least one super admin must remain.' })
    expect(log).not.toHaveBeenCalled()
  })

  it('maps the trigger message to 409 even without its code', async () => {
    const { handle } = setup({
      setRole: vi.fn(async () => ({ updated: 0, error: { message: LAST_SUPER_ADMIN } })),
    })
    expect((await handle(post({ user_id: OTHER_SUPER, role: 'staff' }, 'token-super'))).status).toBe(409)
  })

  it('reports a database error and logs only its code', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { handle } = setup({ setRole: vi.fn(async () => ({ updated: 0, error: { code: '42501' } })) })
    const res = await handle(post({ user_id: STAFF.id, role: 'super_admin' }, 'token-super'))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: CHANGE_FAILED })
    expect(log).toHaveBeenCalledWith('change-role: could not update the staff role', { code: '42501' })
  })
})

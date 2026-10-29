import { describe, expect, it, vi } from 'vitest'
import { callerDeps, post, STAFF, SUPER } from '../_shared/test-helpers.ts'
import { createRemoveHandler, type RemoveDeps } from './handler.ts'

const rows = {
  [SUPER.id]: { user_id: SUPER.id, role: 'super_admin' as const },
  [STAFF.id]: { user_id: STAFF.id, role: 'staff' as const },
  'user-other-super': { user_id: 'user-other-super', role: 'super_admin' as const },
}

function setup(overrides: Partial<RemoveDeps> = {}) {
  const deps: RemoveDeps = {
    ...callerDeps,
    getStaff: vi.fn(async (id: string) => rows[id] ?? null),
    deleteUser: vi.fn(async () => ({})),
    ...overrides,
  }
  return { deps, handle: createRemoveHandler(deps) }
}

describe('remove-staff', () => {
  it('rejects a request with no session', async () => {
    const { deps, handle } = setup()
    expect((await handle(post({ user_id: STAFF.id }))).status).toBe(401)
    expect(deps.deleteUser).not.toHaveBeenCalled()
  })

  it('rejects a staff member with 403', async () => {
    const { deps, handle } = setup()
    expect((await handle(post({ user_id: SUPER.id }, 'token-staff'))).status).toBe(403)
    expect(deps.deleteUser).not.toHaveBeenCalled()
  })

  it('blocks the super admin from removing themselves', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ user_id: SUPER.id }, 'token-super'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'You cannot remove your own account.' })
    expect(deps.deleteUser).not.toHaveBeenCalled()
  })

  it('removes an invited staff member', async () => {
    const { deps, handle } = setup()
    const res = await handle(post({ user_id: STAFF.id }, 'token-super'))
    expect(res.status).toBe(200)
    expect(deps.deleteUser).toHaveBeenCalledWith(STAFF.id)
  })

  it('does not remove another super admin', async () => {
    const { deps, handle } = setup()
    expect((await handle(post({ user_id: 'user-other-super' }, 'token-super'))).status).toBe(403)
    expect(deps.deleteUser).not.toHaveBeenCalled()
  })

  it('returns 404 for someone not on the staff list', async () => {
    const { handle } = setup()
    expect((await handle(post({ user_id: 'nobody' }, 'token-super'))).status).toBe(404)
  })

  it('requires a user_id', async () => {
    const { handle } = setup()
    expect((await handle(post({}, 'token-super'))).status).toBe(400)
  })

  it('reports a failed deletion', async () => {
    const { handle } = setup({ deleteUser: vi.fn(async () => ({ error: 'db down' })) })
    expect((await handle(post({ user_id: STAFF.id }, 'token-super'))).status).toBe(500)
  })
})

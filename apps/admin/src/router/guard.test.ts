import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { sb } from '@/test/supabaseMock'
import { createAdminRouter } from './index'
import { resetAuthState } from '@/composables/useAuth'
import { clearStaffProfile } from '@/composables/useStaffProfile'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

function staffRow(role: 'staff' | 'super_admin') {
  return { data: { user_id: 'user-1', email: 'staff@example.com', role, created_at: '2026-10-01T00:00:00Z' } }
}

async function visit(path: string) {
  const router = createAdminRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  return router.currentRoute.value
}

beforeEach(() => {
  sb.reset()
  resetAuthState()
  clearStaffProfile()
})

describe('route guard', () => {
  it('sends a signed-out visitor to /login and keeps the intended path', async () => {
    const route = await visit('/programs')
    expect(route.name).toBe('login')
    expect(route.query.redirect).toBe('/programs')
  })

  it('sends a signed-out visitor at / to /login without a redirect', async () => {
    const route = await visit('/')
    expect(route.name).toBe('login')
    expect(route.query.redirect).toBeUndefined()
  })

  it('lets a signed-out visitor see the login form', async () => {
    const route = await visit('/login')
    expect(route.name).toBe('login')
  })

  it('lets a signed-in staff member into the admin', async () => {
    sb.signIn()
    sb.respond('staff', 'select', staffRow('staff'))
    const route = await visit('/')
    expect(route.name).toBe('overview')
    expect(sb.callsFor('staff', 'select')[0]?.filters).toContainEqual(['eq', 'user_id', 'user-1'])
  })

  it('signs out a user who has no staff row and explains why', async () => {
    sb.signIn()
    sb.respond('staff', 'select', { data: null })
    const route = await visit('/')
    expect(route.name).toBe('login')
    expect(route.query.reason).toBe('no-access')
    expect(sb.auth.signOut).toHaveBeenCalled()
  })

  it('moves a signed-in staff member off the login form to their redirect', async () => {
    sb.signIn()
    sb.respond('staff', 'select', staffRow('staff'))
    const route = await visit('/login?redirect=/')
    expect(route.name).toBe('overview')
  })

  it('redirects a staff member away from /staff', async () => {
    sb.signIn()
    sb.respond('staff', 'select', staffRow('staff'))
    const route = await visit('/staff')
    expect(route.name).toBe('overview')
  })

  it('lets the super admin open /staff', async () => {
    sb.signIn()
    sb.respond('staff', 'select', staffRow('super_admin'))
    const route = await visit('/staff')
    expect(route.name).toBe('staff')
  })

  it('sends a signed-out visit to /staff to login with the redirect', async () => {
    const route = await visit('/staff')
    expect(route.name).toBe('login')
    expect(route.query.redirect).toBe('/staff')
  })

  it('ignores a redirect that points off-site', async () => {
    sb.signIn()
    sb.respond('staff', 'select', staffRow('staff'))
    const route = await visit('/login?redirect=//evil.example')
    expect(route.name).toBe('overview')
  })
})

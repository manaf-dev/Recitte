import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { sb } from '@/test/supabaseMock'
import { createAdminRouter } from '@/router'
import { resetAuthState } from '@/composables/useAuth'
import { clearStaffProfile } from '@/composables/useStaffProfile'
import App from '@/App.vue'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

async function navLabels(role: 'staff' | 'super_admin') {
  sb.signIn()
  sb.respond('staff', 'select', {
    data: { user_id: 'user-1', email: 'staff@example.com', role, created_at: '2026-10-01T00:00:00Z' },
  })
  const router = createAdminRouter(createMemoryHistory())
  await router.push('/')
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper.findAll('nav[aria-label="Admin sections"] a').map((a) => a.text())
}

// A mounted app from a previous test would react to the auth reset below.
enableAutoUnmount(afterEach)

beforeEach(() => {
  sb.reset()
  resetAuthState()
  clearStaffProfile()
})

const BASE = ['Overview', 'Programs', 'Applications', 'Registrations', 'Messages', 'Testimonials', 'Content & links']

describe('AdminLayout navigation', () => {
  it('shows the sections in order without Staff for a staff member', async () => {
    expect(await navLabels('staff')).toEqual(BASE)
  })

  it('adds Staff last for the super admin', async () => {
    expect(await navLabels('super_admin')).toEqual([...BASE, 'Staff'])
  })
})

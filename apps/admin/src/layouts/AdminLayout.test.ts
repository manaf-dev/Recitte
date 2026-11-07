import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { sb } from '@/test/supabaseMock'
import { createAdminRouter } from '@/router'
import { resetAuthState } from '@/composables/useAuth'
import { clearStaffProfile } from '@/composables/useStaffProfile'
import App from '@/App.vue'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

type Names = { first_name: string | null; last_name: string | null }

async function mountAs(role: 'staff' | 'super_admin', names: Names = { first_name: null, last_name: null }) {
  sb.signIn()
  sb.respond('staff', 'select', {
    data: { user_id: 'user-1', email: 'staff@example.com', ...names, role, created_at: '2026-10-01T00:00:00Z' },
  })
  const router = createAdminRouter(createMemoryHistory())
  await router.push('/')
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

async function navLabels(role: 'staff' | 'super_admin') {
  const wrapper = await mountAs(role)
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

describe('AdminLayout account', () => {
  it('shows the signed-in name in the header and the email in the menu', async () => {
    const wrapper = await mountAs('staff', { first_name: 'Amina', last_name: 'Mensah' })
    expect(wrapper.get('[data-test="account-name"]').text()).toBe('Amina Mensah')
    const button = wrapper.get('button[aria-haspopup="menu"]')
    expect(button.text()).toContain('AM')
    await button.trigger('click')
    const summary = wrapper.get('[data-test="account-summary"]').text()
    expect(summary).toContain('Amina Mensah')
    expect(summary).toContain('staff@example.com')
  })

  it('falls back to the email for an older row without a name', async () => {
    const wrapper = await mountAs('super_admin')
    expect(wrapper.get('[data-test="account-name"]').text()).toBe('staff@example.com')
    await wrapper.get('button[aria-haspopup="menu"]').trigger('click')
    const summary = wrapper.get('[data-test="account-summary"]')
    expect(summary.findAll('span').filter((s) => s.text() === 'staff@example.com')).toHaveLength(1)
  })

  it('asks for the name columns with the profile', async () => {
    await mountAs('staff')
    const call = sb.calls.find((c) => c.table === 'staff')!
    expect(call.columns).toBe('user_id, email, first_name, last_name, role, created_at')
  })
})

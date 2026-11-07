import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { sb } from '@/test/supabaseMock'
import { resetAuthState } from '@/composables/useAuth'
import { clearStaffProfile, loadStaffProfile } from '@/composables/useStaffProfile'
import ProfileView from './ProfileView.vue'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

async function mountAs(role: 'staff' | 'super_admin' = 'staff') {
  sb.respond('staff', 'select', {
    data: {
      user_id: 'user-1',
      email: 'staff@example.com',
      first_name: 'Amina',
      last_name: 'Mensah',
      role,
      created_at: '2026-10-01T00:00:00Z',
    },
  })
  await loadStaffProfile('user-1')
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', name: 'profile', component: ProfileView },
      { path: '/login', name: 'login', component: { render: () => null } },
    ],
  })
  await router.push('/profile')
  const wrapper = mount(ProfileView, { global: { plugins: [router] } })
  await flushPromises()
  return Object.assign(wrapper, { router })
}

function httpError(status: number, message: string) {
  const err = new Error('Edge Function returned a non-2xx status code') as Error & { context: Response }
  err.context = new Response(JSON.stringify({ error: message }), { status })
  return err
}

async function submitEmail(wrapper: Awaited<ReturnType<typeof mountAs>>) {
  await wrapper.get('#profile-new-email').setValue('new@example.com')
  await wrapper.get('#profile-current-password').setValue('secret')
  await wrapper.get('#profile-email-form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  sb.reset()
  resetAuthState()
  clearStaffProfile()
})

describe('ProfileView', () => {
  it('prefills the name, shows the email and role, and disables Save until something changes', async () => {
    const wrapper = await mountAs('super_admin')
    const first = wrapper.get<HTMLInputElement>('#profile-first-name')
    const last = wrapper.get<HTMLInputElement>('#profile-last-name')
    expect(first.element.value).toBe('Amina')
    expect(first.attributes('autocomplete')).toBe('given-name')
    expect(last.element.value).toBe('Mensah')
    expect(last.attributes('autocomplete')).toBe('family-name')
    expect(wrapper.get('#profile-new-email').attributes('autocomplete')).toBe('email')
    expect(wrapper.get('#profile-current-password').attributes('autocomplete')).toBe('current-password')
    expect(wrapper.get('[data-test="current-email"]').text()).toBe('staff@example.com')
    expect(wrapper.get('[data-test="profile-role"]').text()).toContain('Super admin')
    expect(wrapper.text()).toContain('No confirmation email is sent.')

    const save = wrapper.get('#profile-name-form button[type="submit"]')
    expect(save.attributes('disabled')).toBeDefined()
    await first.setValue('Ama')
    expect(save.attributes('disabled')).toBeUndefined()
  })

  it('shows a name error inline and sends nothing', async () => {
    const wrapper = await mountAs()
    await wrapper.get('#profile-first-name').setValue('  ')
    await wrapper.get('#profile-last-name').setValue('Owusu')
    await wrapper.get('#profile-name-form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('#profile-first-name-error').text()).toBe('Enter a first name.')
    expect(sb.callsFor('staff', 'update')).toHaveLength(0)
  })

  it('saves the name and confirms', async () => {
    sb.respond('staff', 'update', { data: [{ user_id: 'user-1' }] })
    const wrapper = await mountAs()
    await wrapper.get('#profile-first-name').setValue('Ama')
    await wrapper.get('#profile-name-form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-test="name-feedback"]').text()).toBe('Name saved.')
  })

  it('puts a wrong password under the password field', async () => {
    sb.client.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: httpError(400, 'Your current password is incorrect.'),
    })
    const wrapper = await mountAs()
    await wrapper.get('#profile-new-email').setValue('new@example.com')
    await wrapper.get('#profile-current-password').setValue('wrong')
    await wrapper.get('#profile-email-form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('#profile-current-password-error').text()).toBe('Your current password is incorrect.')
    expect(wrapper.find('#profile-new-email-error').exists()).toBe(false)
  })

  it('changes the email, clears the password and shows the new address', async () => {
    sb.client.functions.invoke.mockResolvedValueOnce({ data: { email: 'new@example.com' }, error: null })
    const wrapper = await mountAs()
    await wrapper.get('#profile-new-email').setValue('new@example.com')
    await wrapper.get('#profile-current-password').setValue('secret')
    await wrapper.get('#profile-email-form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-test="current-email"]').text()).toBe('new@example.com')
    expect(wrapper.get<HTMLInputElement>('#profile-current-password').element.value).toBe('')
    expect(wrapper.get('[data-test="email-feedback"]').text()).toContain('Email changed.')
    expect(sb.auth.refreshSession).toHaveBeenCalled()
  })

  it('signs out and goes to login when the server rejects the session', async () => {
    sb.client.functions.invoke.mockResolvedValueOnce({ data: null, error: httpError(401, 'Sign in first.') })
    const wrapper = await mountAs()
    await submitEmail(wrapper)
    expect(sb.auth.signOut).toHaveBeenCalled()
    expect(wrapper.router.currentRoute.value.name).toBe('login')
    expect(wrapper.router.currentRoute.value.query.redirect).toBe('/profile')
  })

  it('shows an uncertain email change as a page alert, not a field error', async () => {
    const message =
      'Your sign-in email may have changed to new@example.com. Sign out and try signing in with it, or contact the super admin.'
    sb.client.functions.invoke.mockResolvedValueOnce({ data: null, error: httpError(500, message) })
    const wrapper = await mountAs()
    await submitEmail(wrapper)
    expect(wrapper.get('[data-test="email-alert"]').text()).toBe(message)
    expect(wrapper.find('#profile-new-email-error').exists()).toBe(false)
    expect(wrapper.find('#profile-current-password-error').exists()).toBe(false)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { sb } from '@/test/supabaseMock'
import StaffView from './StaffView.vue'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

const LINK = 'https://admin.test/set-password#token=abc'

beforeEach(() => {
  sb.reset()
  sb.respond('staff', 'select', {
    data: [
      { user_id: 'u1', email: 'owner@example.com', role: 'super_admin', created_at: '2026-10-01T00:00:00Z' },
      { user_id: 'u2', email: 'helper@example.com', role: 'staff', created_at: '2026-10-02T00:00:00Z' },
    ],
  })
})

afterEach(() => {
  document.body.innerHTML = ''
})

async function openInvite() {
  const wrapper = mount(StaffView, { attachTo: document.body })
  await flushPromises()
  await wrapper.get('button.btn-primary').trigger('click')
  await flushPromises()
  return wrapper
}

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}

describe('StaffView', () => {
  it('shows each person with their role', async () => {
    const wrapper = mount(StaffView)
    await flushPromises()
    expect(wrapper.text()).toContain('Super admin · added')
    expect(wrapper.text()).toContain('Staff · added')
  })

  it('defaults the invite role to Staff', async () => {
    await openInvite()
    const select = document.querySelector<HTMLSelectElement>('#invite-role')!
    expect(select.value).toBe('staff')
    expect([...select.options].map((o) => o.text)).toEqual(['Staff', 'Super admin'])
  })

  it('shows the invite link after success and copies it', async () => {
    const writeText = vi.fn(async () => {})
    setClipboard({ writeText })
    sb.client.functions.invoke.mockResolvedValueOnce({
      data: { user_id: 'u3', email: 'new@example.com', role: 'super_admin', invite_url: LINK },
      error: null,
    })
    const wrapper = await openInvite()

    const email = document.querySelector<HTMLInputElement>('#invite-email')!
    email.value = 'New@example.com'
    email.dispatchEvent(new Event('input'))
    const select = document.querySelector<HTMLSelectElement>('#invite-role')!
    select.value = 'super_admin'
    select.dispatchEvent(new Event('change'))
    document.querySelector<HTMLFormElement>('#invite-form')!.dispatchEvent(new Event('submit'))
    await flushPromises()

    expect(sb.client.functions.invoke).toHaveBeenCalledWith('invite-staff', {
      body: { email: 'new@example.com', role: 'super_admin' },
    })
    expect(wrapper.get<HTMLInputElement>('#invite-link').element.value).toBe(LINK)
    expect(wrapper.text()).toContain(
      'Send this link to new@example.com privately. It works once and expires in 24 hours.',
    )

    const copy = wrapper.findAll('button').find((b) => b.text() === 'Copy link')!
    await copy.trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(LINK)
    expect(copy.text()).toBe('Copied')

    await wrapper.findAll('button').find((b) => b.text() === 'Dismiss')!.trigger('click')
    expect(wrapper.find('#invite-link').exists()).toBe(false)
  })

  it('selects the link and explains when the clipboard is unavailable', async () => {
    setClipboard(undefined)
    sb.client.functions.invoke.mockResolvedValueOnce({
      data: { user_id: 'u3', email: 'new@example.com', role: 'staff', invite_url: LINK },
      error: null,
    })
    const wrapper = await openInvite()
    const email = document.querySelector<HTMLInputElement>('#invite-email')!
    email.value = 'new@example.com'
    email.dispatchEvent(new Event('input'))
    document.querySelector<HTMLFormElement>('#invite-form')!.dispatchEvent(new Event('submit'))
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text() === 'Copy link')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Copying is not available here.')
    expect(document.activeElement?.id).toBe('invite-link')
  })

  it('keeps the form open with the error when the invite fails', async () => {
    const err = new Error('Edge Function returned a non-2xx status code') as Error & { context: Response }
    err.context = new Response(JSON.stringify({ error: 'That person is already on the staff list.' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    })
    sb.client.functions.invoke.mockResolvedValueOnce({ data: null, error: err })
    const wrapper = await openInvite()
    const email = document.querySelector<HTMLInputElement>('#invite-email')!
    email.value = 'helper@example.com'
    email.dispatchEvent(new Event('input'))
    document.querySelector<HTMLFormElement>('#invite-form')!.dispatchEvent(new Event('submit'))
    await flushPromises()

    expect(document.querySelector('#invite-email-error')?.textContent).toContain('already on the staff list')
    expect(wrapper.find('#invite-link').exists()).toBe(false)
  })
})

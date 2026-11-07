import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { sb } from '@/test/supabaseMock'
import { clearStaffProfile, loadStaffProfile } from '@/composables/useStaffProfile'
import ConfirmHost from '@/components/ConfirmHost.vue'
import { settleConfirm } from '@/lib/confirm'
import StaffView from './StaffView.vue'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

const LINK = 'https://admin.test/set-password#token=abc'

const OWNER = {
  user_id: 'u1',
  email: 'owner@example.com',
  first_name: 'Kofi',
  last_name: 'Owusu',
  role: 'super_admin',
  created_at: '2026-10-01T00:00:00Z',
}

const ROWS = [
  OWNER,
  {
    user_id: 'u2',
    email: 'helper@example.com',
    first_name: null,
    last_name: null,
    role: 'staff',
    created_at: '2026-10-02T00:00:00Z',
  },
  {
    user_id: 'u3',
    email: 'ama@example.com',
    first_name: 'Ama',
    last_name: 'Boateng',
    role: 'super_admin',
    created_at: '2026-10-03T00:00:00Z',
  },
]

beforeEach(() => {
  sb.reset()
  clearStaffProfile()
  sb.respond('staff', 'select', { data: ROWS })
})

const mounted: Array<{ unmount: () => void }> = []

afterEach(() => {
  settleConfirm(false)
  mounted.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

/** Mounts as Kofi (u1), a super admin, with the confirm dialog host on the page. */
async function mountAsOwner() {
  sb.respond('staff', 'select', { data: OWNER })
  await loadStaffProfile('u1')
  sb.respond('staff', 'select', { data: ROWS })
  const wrapper = mount(
    defineComponent({ render: () => [h(StaffView), h(ConfirmHost)] }),
    { attachTo: document.body },
  )
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

function roleSelect(userId: string) {
  return document.querySelector<HTMLSelectElement>(`#role-${userId}`)
}

async function chooseRole(userId: string, role: string) {
  const select = roleSelect(userId)!
  select.value = role
  select.dispatchEvent(new Event('change'))
  await flushPromises()
}

function confirmMessage() {
  return document.querySelector('[role="dialog"] p')?.textContent ?? ''
}

async function answerConfirm(ok: boolean) {
  const button = ok
    ? document.querySelector<HTMLButtonElement>('[data-confirm]')!
    : [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((b) => b.textContent?.trim() === 'Cancel')!
  button.click()
  await flushPromises()
}

function httpError(status: number, message: string) {
  const err = new Error('Edge Function returned a non-2xx status code') as Error & { context: Response }
  err.context = new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json' } })
  return err
}

async function openInvite() {
  const wrapper = mount(StaffView, { attachTo: document.body })
  await flushPromises()
  await wrapper.get('button.btn-primary').trigger('click')
  await flushPromises()
  return wrapper
}

function type(selector: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(selector)!
  input.value = value
  input.dispatchEvent(new Event('input'))
}

function fillInvite(email: string, first = 'Amina', last = 'Mensah') {
  type('#invite-first-name', first)
  type('#invite-last-name', last)
  type('#invite-email', email)
}

function submitInvite() {
  document.querySelector<HTMLFormElement>('#invite-form')!.dispatchEvent(new Event('submit'))
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

  it('shows the name with the email beneath, and just the email for older rows', async () => {
    const wrapper = mount(StaffView)
    await flushPromises()
    const [owner, helper] = wrapper.findAll('li')
    const ownerLines = owner!.findAll('div > span').map((s) => s.text())
    expect(ownerLines[0]).toBe('Kofi Owusu')
    expect(ownerLines[1]).toBe('owner@example.com')
    const helperLines = helper!.findAll('div > span').map((s) => s.text())
    expect(helperLines[0]).toBe('helper@example.com')
    expect(helperLines[1]).toMatch(/^Staff · added/)
  })

  it('asks for first name, last name, then email', async () => {
    await openInvite()
    const ids = [...document.querySelectorAll('#invite-form input, #invite-form select')].map((el) => el.id)
    expect(ids).toEqual(['invite-first-name', 'invite-last-name', 'invite-email', 'invite-role'])
    expect(document.querySelector('#invite-first-name')!.getAttribute('autocomplete')).toBe('given-name')
    expect(document.querySelector('#invite-last-name')!.getAttribute('autocomplete')).toBe('family-name')
  })

  it('shows inline name errors without calling the server', async () => {
    await openInvite()
    fillInvite('new@example.com', '  ', 'Mensah')
    submitInvite()
    await flushPromises()
    expect(document.querySelector('#invite-first-name-error')?.textContent).toBe('Enter a first name.')
    expect(document.querySelector('#invite-first-name')!.getAttribute('aria-invalid')).toBe('true')
    expect(document.querySelector('#invite-email-error')).toBeNull()

    fillInvite('new@example.com', 'Amina', 'x'.repeat(81))
    submitInvite()
    await flushPromises()
    expect(document.querySelector('#invite-first-name-error')).toBeNull()
    expect(document.querySelector('#invite-last-name-error')?.textContent).toBe(
      'Keep the last name to 80 characters or fewer.',
    )
    expect(sb.client.functions.invoke).not.toHaveBeenCalled()
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
      data: {
        user_id: 'u3',
        email: 'new@example.com',
        role: 'super_admin',
        first_name: 'Amina',
        last_name: 'Mensah',
        invite_url: LINK,
      },
      error: null,
    })
    const wrapper = await openInvite()

    fillInvite('New@example.com', ' Amina ', 'Mensah')
    const select = document.querySelector<HTMLSelectElement>('#invite-role')!
    select.value = 'super_admin'
    select.dispatchEvent(new Event('change'))
    submitInvite()
    await flushPromises()

    expect(sb.client.functions.invoke).toHaveBeenCalledWith('invite-staff', {
      body: { email: 'new@example.com', role: 'super_admin', first_name: 'Amina', last_name: 'Mensah' },
    })
    expect(wrapper.get<HTMLInputElement>('#invite-link').element.value).toBe(LINK)
    expect(wrapper.text()).toContain(
      'Send this link to Amina Mensah (new@example.com) privately. It works once and expires in 24 hours.',
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
    fillInvite('new@example.com')
    submitInvite()
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
    fillInvite('helper@example.com')
    submitInvite()
    await flushPromises()

    expect(document.querySelector('#invite-email-error')?.textContent).toContain('already on the staff list')
    expect(wrapper.find('#invite-link').exists()).toBe(false)
  })

  it('shows your own row read-only with a You marker', async () => {
    const wrapper = await mountAsOwner()
    const own = wrapper.findAll('li')[0]!
    expect(own.text()).toContain('You')
    expect(own.text()).toContain('Super admin · added')
    expect(own.find('select').exists()).toBe(false)
    expect(own.findAll('button').some((b) => b.text().startsWith('Remove'))).toBe(false)
  })

  it('gives everyone else a labelled role control and Remove, super admins included', async () => {
    const wrapper = await mountAsOwner()
    const [, helper, ama] = wrapper.findAll('li')
    for (const [row, id, name, role] of [
      [helper!, 'u2', 'helper@example.com', 'staff'],
      [ama!, 'u3', 'Ama Boateng', 'super_admin'],
    ] as const) {
      const select = row.get<HTMLSelectElement>('select')
      expect(select.attributes('id')).toBe(`role-${id}`)
      expect(select.element.value).toBe(role)
      expect(row.get(`label[for="role-${id}"]`).text()).toBe(`Role for ${name}`)
      expect(row.findAll('button').find((b) => b.text().startsWith('Remove'))?.text()).toBe(`Remove ${name}`)
    }
  })

  it('mentions a super admin in the remove confirmation', async () => {
    const wrapper = await mountAsOwner()
    await wrapper.findAll('li')[2]!.findAll('button').find((b) => b.text().startsWith('Remove'))!.trigger('click')
    await flushPromises()
    expect(confirmMessage()).toContain('Ama Boateng is a super admin.')
    await answerConfirm(true)
    expect(sb.client.functions.invoke).toHaveBeenCalledWith('remove-staff', { body: { user_id: 'u3' } })
    expect(wrapper.text()).toContain('Ama Boateng was removed.')
  })

  it('asks before promoting and puts the select back on cancel', async () => {
    await mountAsOwner()
    await chooseRole('u2', 'super_admin')
    expect(confirmMessage()).toBe(
      'Make helper@example.com a super admin? They will be able to invite, remove and change the role of anyone else.',
    )
    await answerConfirm(false)
    expect(roleSelect('u2')!.value).toBe('staff')
    expect(sb.client.functions.invoke).not.toHaveBeenCalled()
  })

  it('demotes after confirming, disables the row while saving and shows the new role', async () => {
    let finish!: (value: { data: unknown; error: unknown }) => void
    sb.client.functions.invoke.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
    const wrapper = await mountAsOwner()
    await chooseRole('u3', 'staff')
    expect(confirmMessage()).toBe('Make Ama Boateng staff? They will lose access to the Staff screen.')
    await answerConfirm(true)

    const row = wrapper.findAll('li')[2]!
    expect(roleSelect('u3')!.disabled).toBe(true)
    expect(row.findAll('button').find((b) => b.text().startsWith('Remove'))!.element.disabled).toBe(true)
    expect(roleSelect('u2')!.disabled).toBe(false)

    finish({ data: { user_id: 'u3', role: 'staff' }, error: null })
    await flushPromises()
    expect(sb.client.functions.invoke).toHaveBeenCalledWith('change-role', { body: { user_id: 'u3', role: 'staff' } })
    expect(roleSelect('u3')!.disabled).toBe(false)
    expect(roleSelect('u3')!.value).toBe('staff')
    expect(wrapper.findAll('li')[2]!.text()).toContain('Staff · added')
    expect(wrapper.get('.notice-ok').text()).toBe('Ama Boateng is now staff.')
  })

  it('puts the select back and shows the error when the change fails', async () => {
    sb.client.functions.invoke.mockResolvedValueOnce({ data: null, error: httpError(403, 'Only a super admin can change roles.') })
    const wrapper = await mountAsOwner()
    await chooseRole('u2', 'super_admin')
    await answerConfirm(true)
    expect(roleSelect('u2')!.value).toBe('staff')
    expect(roleSelect('u2')!.disabled).toBe(false)
    expect(wrapper.get('.notice-error').text()).toBe('Role not changed. Only a super admin can change roles.')
  })
})

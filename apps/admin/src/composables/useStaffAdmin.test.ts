import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sb } from '@/test/supabaseMock'
import { useStaffAdmin } from './useStaffAdmin'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

beforeEach(() => sb.reset())

/** Shaped like supabase-js's FunctionsHttpError: the Response sits in `context`. */
function httpError(status: number, body: unknown) {
  const err = new Error('Edge Function returned a non-2xx status code') as Error & { context: Response }
  err.context = new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  return err
}

describe('useStaffAdmin', () => {
  it('invites through the invite-staff function with the role and names, returns the link and reloads the list', async () => {
    sb.respond('staff', 'select', {
      data: [{ user_id: 'u2', email: 'new@example.com', first_name: 'Amina', last_name: 'Mensah', role: 'staff', created_at: 'x' }],
    })
    sb.client.functions.invoke.mockResolvedValueOnce({
      data: {
        user_id: 'u2',
        email: 'new@example.com',
        role: 'staff',
        first_name: 'Amina',
        last_name: 'Mensah',
        invite_url: 'https://admin.test/set-password#t',
      },
      error: null,
    })
    const admin = useStaffAdmin()
    const result = await admin.invite('  New@Example.com ', 'staff', '  Amina ', ' Mensah  ')
    expect(result).toEqual({
      ok: true,
      invite: {
        user_id: 'u2',
        email: 'new@example.com',
        role: 'staff',
        first_name: 'Amina',
        last_name: 'Mensah',
        invite_url: 'https://admin.test/set-password#t',
      },
    })
    expect(sb.client.functions.invoke).toHaveBeenCalledWith('invite-staff', {
      body: { email: 'new@example.com', role: 'staff', first_name: 'Amina', last_name: 'Mensah' },
    })
    expect(admin.staff.value).toHaveLength(1)
    expect(admin.staff.value[0]?.first_name).toBe('Amina')
  })

  it('selects the name columns when loading', async () => {
    await useStaffAdmin().load()
    const call = sb.calls.find((c) => c.table === 'staff')!
    expect(call.columns).toBe('user_id, email, first_name, last_name, role, created_at')
  })

  it.each([
    ['', 'Mensah', 'Enter a first name.', 'first_name'],
    ['   ', 'Mensah', 'Enter a first name.', 'first_name'],
    ['Amina', '', 'Enter a last name.', 'last_name'],
    ['a'.repeat(81), 'Mensah', 'Keep the first name to 80 characters or fewer.', 'first_name'],
    ['Amina', 'b'.repeat(81), 'Keep the last name to 80 characters or fewer.', 'last_name'],
  ])('does not call the function for first name %j and last name %j', async (first, last, error, field) => {
    const result = await useStaffAdmin().invite('new@example.com', 'staff', first, last)
    expect(result).toEqual({ ok: false, error, field })
    expect(sb.client.functions.invoke).not.toHaveBeenCalled()
  })

  it('accepts names of exactly 80 characters after trimming', async () => {
    sb.client.functions.invoke.mockResolvedValueOnce({
      data: { user_id: 'u2', email: 'new@example.com', role: 'staff', invite_url: 'https://admin.test/x' },
      error: null,
    })
    const long = 'a'.repeat(80)
    const result = await useStaffAdmin().invite('new@example.com', 'staff', ` ${long} `, 'Mensah')
    expect(result.ok && result.invite.first_name).toBe(long)
  })

  it('points a server name error at its field', async () => {
    sb.client.functions.invoke.mockResolvedValueOnce({ data: null, error: httpError(400, { error: 'Enter a last name.' }) })
    const result = await useStaffAdmin().invite('a@example.com', 'staff', 'Amina', 'Mensah')
    expect(result).toEqual({ ok: false, error: 'Enter a last name.', field: 'last_name' })
  })

  it('sends the super_admin role when chosen', async () => {
    sb.client.functions.invoke.mockResolvedValueOnce({
      data: { user_id: 'u3', email: 'boss@example.com', role: 'super_admin', invite_url: 'https://admin.test/x' },
      error: null,
    })
    const result = await useStaffAdmin().invite('boss@example.com', 'super_admin', 'Kofi', 'Owusu')
    expect(sb.client.functions.invoke).toHaveBeenCalledWith('invite-staff', {
      body: { email: 'boss@example.com', role: 'super_admin', first_name: 'Kofi', last_name: 'Owusu' },
    })
    expect(result.ok && result.invite.role).toBe('super_admin')
  })

  it('fails when the function answers without a link', async () => {
    sb.client.functions.invoke.mockResolvedValueOnce({ data: { user_id: 'u2' }, error: null })
    const result = await useStaffAdmin().invite('new@example.com', 'staff', 'Amina', 'Mensah')
    expect(result.ok).toBe(false)
  })

  it.each([400, 403, 500])('passes through the %i error message', async (status) => {
    sb.client.functions.invoke.mockResolvedValueOnce({ data: null, error: httpError(status, { error: `Nope ${status}` }) })
    const result = await useStaffAdmin().invite('a@example.com', 'staff', 'Amina', 'Mensah')
    expect(result).toEqual({ ok: false, error: `Nope ${status}` })
  })

  it('shows the error message the function returned', async () => {
    sb.client.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: httpError(409, { error: 'That person is already on the staff list.' }),
    })
    const result = await useStaffAdmin().invite('dup@example.com', 'staff', 'Amina', 'Mensah')
    expect(result).toEqual({ ok: false, error: 'That person is already on the staff list.' })
  })

  it('does not call the function for an invalid email', async () => {
    const result = await useStaffAdmin().invite('not-an-email', 'staff', 'Amina', 'Mensah')
    expect(result.ok).toBe(false)
    expect(sb.client.functions.invoke).not.toHaveBeenCalled()
  })

  it('removes through the remove-staff function', async () => {
    const admin = useStaffAdmin()
    admin.staff.value = [{ user_id: 'u2', email: 'a@example.com', first_name: null, last_name: null, role: 'staff', created_at: 'x' }]
    const result = await admin.remove(admin.staff.value[0]!)
    expect(result).toEqual({ ok: true })
    expect(sb.client.functions.invoke).toHaveBeenCalledWith('remove-staff', { body: { user_id: 'u2' } })
    expect(admin.staff.value).toEqual([])
  })
})

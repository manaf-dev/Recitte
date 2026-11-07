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
  it('invites through the invite-staff function with the role, returns the link and reloads the list', async () => {
    sb.respond('staff', 'select', { data: [{ user_id: 'u2', email: 'new@example.com', role: 'staff', created_at: 'x' }] })
    sb.client.functions.invoke.mockResolvedValueOnce({
      data: { user_id: 'u2', email: 'new@example.com', role: 'staff', invite_url: 'https://admin.test/set-password#t' },
      error: null,
    })
    const admin = useStaffAdmin()
    const result = await admin.invite('  New@Example.com ', 'staff')
    expect(result).toEqual({
      ok: true,
      invite: { user_id: 'u2', email: 'new@example.com', role: 'staff', invite_url: 'https://admin.test/set-password#t' },
    })
    expect(sb.client.functions.invoke).toHaveBeenCalledWith('invite-staff', {
      body: { email: 'new@example.com', role: 'staff' },
    })
    expect(admin.staff.value).toHaveLength(1)
  })

  it('sends the super_admin role when chosen', async () => {
    sb.client.functions.invoke.mockResolvedValueOnce({
      data: { user_id: 'u3', email: 'boss@example.com', role: 'super_admin', invite_url: 'https://admin.test/x' },
      error: null,
    })
    const result = await useStaffAdmin().invite('boss@example.com', 'super_admin')
    expect(sb.client.functions.invoke).toHaveBeenCalledWith('invite-staff', {
      body: { email: 'boss@example.com', role: 'super_admin' },
    })
    expect(result.ok && result.invite.role).toBe('super_admin')
  })

  it('fails when the function answers without a link', async () => {
    sb.client.functions.invoke.mockResolvedValueOnce({ data: { user_id: 'u2' }, error: null })
    const result = await useStaffAdmin().invite('new@example.com', 'staff')
    expect(result.ok).toBe(false)
  })

  it.each([400, 403, 500])('passes through the %i error message', async (status) => {
    sb.client.functions.invoke.mockResolvedValueOnce({ data: null, error: httpError(status, { error: `Nope ${status}` }) })
    const result = await useStaffAdmin().invite('a@example.com', 'staff')
    expect(result).toEqual({ ok: false, error: `Nope ${status}` })
  })

  it('shows the error message the function returned', async () => {
    sb.client.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: httpError(409, { error: 'That person is already on the staff list.' }),
    })
    const result = await useStaffAdmin().invite('dup@example.com')
    expect(result).toEqual({ ok: false, error: 'That person is already on the staff list.' })
  })

  it('does not call the function for an invalid email', async () => {
    const result = await useStaffAdmin().invite('not-an-email')
    expect(result.ok).toBe(false)
    expect(sb.client.functions.invoke).not.toHaveBeenCalled()
  })

  it('removes through the remove-staff function', async () => {
    const admin = useStaffAdmin()
    admin.staff.value = [{ user_id: 'u2', email: 'a@example.com', role: 'staff', created_at: 'x' }]
    const result = await admin.remove(admin.staff.value[0]!)
    expect(result).toEqual({ ok: true })
    expect(sb.client.functions.invoke).toHaveBeenCalledWith('remove-staff', { body: { user_id: 'u2' } })
    expect(admin.staff.value).toEqual([])
  })
})

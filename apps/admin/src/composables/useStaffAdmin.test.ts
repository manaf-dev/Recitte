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
  it('invites through the invite-staff function and reloads the list', async () => {
    sb.respond('staff', 'select', { data: [{ user_id: 'u2', email: 'new@example.com', role: 'staff', created_at: 'x' }] })
    const admin = useStaffAdmin()
    const result = await admin.invite('  New@Example.com ')
    expect(result).toEqual({ ok: true })
    expect(sb.client.functions.invoke).toHaveBeenCalledWith('invite-staff', { body: { email: 'new@example.com' } })
    expect(admin.staff.value).toHaveLength(1)
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

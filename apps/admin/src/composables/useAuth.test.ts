import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sb } from '@/test/supabaseMock'
import { consumeRedirect, requestMagicLink, safeRedirect } from './useAuth'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

beforeEach(() => {
  sb.reset()
  localStorage.clear()
})

describe('requestMagicLink', () => {
  it('never creates an account and lands on /auth/callback', async () => {
    const result = await requestMagicLink('  staff@example.com ')
    expect(result).toEqual({ ok: true })
    expect(sb.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'staff@example.com',
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
  })

  it('tells someone who is not a user yet to ask for an invite', async () => {
    sb.auth.signInWithOtp.mockResolvedValueOnce({
      data: {},
      error: { code: 'otp_disabled', status: 422, message: 'Signups not allowed for otp' },
    })
    const result = await requestMagicLink('stranger@example.com')
    expect(result).toMatchObject({ ok: false, reason: 'not_invited' })
    if (!result.ok) expect(result.message).toMatch(/ask the super admin/i)
  })

  it('remembers a safe redirect for after the link is opened', async () => {
    await requestMagicLink('staff@example.com', '/programs')
    expect(consumeRedirect()).toBe('/programs')
    expect(consumeRedirect()).toBeNull()
  })
})

describe('safeRedirect', () => {
  it('only accepts paths inside the app', () => {
    expect(safeRedirect('/messages')).toBe('/messages')
    expect(safeRedirect('//evil.example')).toBeNull()
    expect(safeRedirect('https://evil.example')).toBeNull()
    expect(safeRedirect('/login')).toBeNull()
    expect(safeRedirect(undefined)).toBeNull()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Program } from '@recitte/shared'
import { sb } from '@/test/supabaseMock'
import { sortProgramsForAdmin, useProgramsAdmin } from './useProgramsAdmin'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

beforeEach(() => sb.reset())

function program(over: Partial<Program>): Program {
  return {
    id: 'p1',
    slug: 'p',
    type: 'seminar',
    title: 'Seminar',
    description: 'd',
    about: null,
    highlights: [],
    starts_on: null,
    ends_on: null,
    time: null,
    duration: null,
    format: null,
    extra_details: [],
    speaker: null,
    speaker_bio: null,
    speaker_photo_url: null,
    status: 'open',
    featured: false,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    ...over,
  }
}

describe('sortProgramsForAdmin', () => {
  it('lists upcoming by date, then undated, then past programs', () => {
    const list = [
      program({ id: 'past-old', starts_on: '2026-01-01' }),
      program({ id: 'undated' }),
      program({ id: 'later', starts_on: '2026-12-01' }),
      program({ id: 'past-recent', starts_on: '2026-10-01', ends_on: '2026-10-20' }),
      program({ id: 'soon', starts_on: '2026-11-01' }),
    ]
    expect(sortProgramsForAdmin(list, '2026-10-29').map((p) => p.id)).toEqual([
      'soon',
      'later',
      'undated',
      'past-recent',
      'past-old',
    ])
  })
})

describe('useProgramsAdmin', () => {
  it('cycles status open → soon → closed → open', async () => {
    sb.respond('programs', 'update', (call) => ({ data: program(call.payload as Partial<Program>) }))
    const admin = useProgramsAdmin()
    admin.programs.value = [program({ status: 'open' })]

    await admin.cycleStatus(admin.programs.value[0]!)
    await admin.cycleStatus(admin.programs.value[0]!)
    await admin.cycleStatus(admin.programs.value[0]!)

    const updates = sb.callsFor('programs', 'update')
    expect(updates.map((u) => u.payload)).toEqual([{ status: 'soon' }, { status: 'closed' }, { status: 'open' }])
    expect(updates[0]?.filters).toContainEqual(['eq', 'id', 'p1'])
    expect(admin.programs.value[0]?.status).toBe('open')
  })

  it('toggles featured', async () => {
    sb.respond('programs', 'update', (call) => ({ data: program(call.payload as Partial<Program>) }))
    const admin = useProgramsAdmin()
    admin.programs.value = [program({ featured: false })]
    const result = await admin.toggleFeatured(admin.programs.value[0]!)
    expect(result.ok).toBe(true)
    expect(sb.callsFor('programs', 'update')[0]?.payload).toEqual({ featured: true })
    expect(admin.programs.value[0]?.featured).toBe(true)
  })

  it('removes a program and its stored photo', async () => {
    const admin = useProgramsAdmin()
    const url = 'http://supabase.test/storage/v1/object/public/speaker-photos/p1/1.jpg'
    admin.programs.value = [program({ speaker_photo_url: url })]
    const result = await admin.remove(admin.programs.value[0]!)
    expect(result.ok).toBe(true)
    expect(sb.callsFor('programs', 'delete')[0]?.filters).toContainEqual(['eq', 'id', 'p1'])
    expect(admin.programs.value).toEqual([])
    expect(sb.storageBucket.remove).toHaveBeenCalledWith(['p1/1.jpg'])
  })

  it('surfaces a database error and keeps the row', async () => {
    sb.respond('programs', 'update', { error: { code: '42501', message: 'permission denied' } })
    const admin = useProgramsAdmin()
    admin.programs.value = [program({})]
    const result = await admin.cycleStatus(admin.programs.value[0]!)
    expect(result).toMatchObject({ ok: false, error: "You don't have permission to do that." })
    expect(admin.programs.value[0]?.status).toBe('open')
  })
})

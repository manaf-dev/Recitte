import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sb } from '@/test/supabaseMock'
import { useOverview } from './useOverview'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

beforeEach(() => sb.reset())

const iso = (day: number) => `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`

describe('useOverview', () => {
  it('counts new submissions and open programs that are not past', async () => {
    const counts: Record<string, number> = { applications: 2, registrations: 5, contacts: 1 }
    for (const table of Object.keys(counts)) {
      sb.respond(table, 'select', (call) =>
        call.options ? { count: counts[table] } : { data: [] },
      )
    }
    sb.respond('programs', 'select', {
      data: [
        { starts_on: null, ends_on: null },
        { starts_on: '2999-01-01', ends_on: null },
        { starts_on: '2000-01-01', ends_on: '2000-01-02' },
      ],
    })

    const overview = useOverview()
    await overview.load()

    expect(overview.error.value).toBe('')
    expect(overview.counts.value).toEqual({ applications: 2, registrations: 5, contacts: 1, openPrograms: 2 })
    for (const table of Object.keys(counts)) {
      const countCall = sb.callsFor(table, 'select').find((c) => c.options)
      expect(countCall?.filters).toContainEqual(['eq', 'status', 'new'])
    }
    expect(sb.callsFor('programs', 'select')[0]?.filters).toContainEqual(['eq', 'status', 'open'])
  })

  it('lists the latest eight submissions across inboxes, newest first', async () => {
    const apps = [1, 5, 9].map((d) => ({ id: `a${d}`, created_at: iso(d), full_name: 'Amina', program_title: 'Tajweed' }))
    const regs = [2, 6, 10].map((d) => ({
      id: `r${d}`,
      created_at: iso(d),
      full_name: 'Bilal',
      program_title: 'Seminar',
      kind: 'notify',
    }))
    const contacts = [3, 7, 11].map((d) => ({
      id: `c${d}`,
      created_at: iso(d),
      full_name: 'Khadija',
      subject: null,
      message: 'Salaam, a question about classes',
    }))
    sb.respond('applications', 'select', (c) => (c.options ? { count: 0 } : { data: apps }))
    sb.respond('registrations', 'select', (c) => (c.options ? { count: 0 } : { data: regs }))
    sb.respond('contacts', 'select', (c) => (c.options ? { count: 0 } : { data: contacts }))

    const overview = useOverview()
    await overview.load()

    const recent = overview.recent.value
    expect(recent).toHaveLength(8)
    expect(recent.map((r) => r.key)).toEqual(['c-c11', 'r-r10', 'a-a9', 'c-c7', 'r-r6', 'a-a5', 'c-c3', 'r-r2'])
    expect(recent[1]).toMatchObject({ kind: 'Registration', to: '/registrations', text: 'Bilal · Notify me · Seminar' })
    expect(recent[0]?.kind).toBe('Message')
  })

  it('reports a failed query', async () => {
    sb.respond('contacts', 'select', { error: { message: 'boom' } })
    const overview = useOverview()
    await overview.load()
    expect(overview.error.value).toBe('boom')
  })
})

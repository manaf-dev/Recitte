import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sb } from '@/test/supabaseMock'
import { useProgramTypes } from './useProgramTypes'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

beforeEach(() => sb.reset())

const echo = (call: { payload?: unknown }) => ({ data: { ...(call.payload as object), builtin: false } })

describe('useProgramTypes', () => {
  it('lists built-ins first, then custom types by name', async () => {
    sb.respond('program_types', 'select', {
      data: [
        { slug: 'workshop', label: 'Workshop', area: 'academy', builtin: true },
        { slug: 'zikr', label: 'Zikr night', area: 'connect', builtin: false },
        { slug: 'fireside', label: 'Fireside chat', area: 'academy', builtin: false },
      ],
    })
    const { types, load } = useProgramTypes()
    await load()
    expect(types.value.map((t) => t.slug)).toEqual([
      'workshop', 'seminar', 'course', 'event', 'community', 'challenge', 'fireside', 'zikr',
    ])
  })

  it('reports a failed load instead of staying silent', async () => {
    sb.respond('program_types', 'select', { error: { message: 'boom' } })
    const { loadError, load } = useProgramTypes()
    await load()
    expect(loadError.value).not.toBe('')
  })

  it('refuses a duplicate name ignoring case, without calling the database', async () => {
    const { add } = useProgramTypes()
    const result = await add('workshop', 'academy')
    expect(result.ok).toBe(false)
    expect(sb.callsFor('program_types', 'insert')).toHaveLength(0)
  })

  it('gives a name with no Latin letters a generated slug', async () => {
    sb.respond('program_types', 'insert', echo)
    const { add } = useProgramTypes()
    const result = await add('حلقة', 'connect')
    expect(result.ok).toBe(true)
    const payload = sb.callsFor('program_types', 'insert')[0]?.payload as { slug: string; label: string }
    expect(payload.slug).toMatch(/^type-[a-z0-9]+$/)
    expect(payload.label).toBe('حلقة')
  })

  it('keeps slugs unique when two names reduce to the same one', async () => {
    sb.respond('program_types', 'insert', echo)
    const { add } = useProgramTypes()
    await add('Q&A', 'academy')
    await add('Q A', 'academy')
    const slugs = sb.callsFor('program_types', 'insert').map((c) => (c.payload as { slug: string }).slug)
    expect(slugs).toEqual(['q-a', 'q-a-2'])
  })

  it('renames a custom type and moves its area', async () => {
    sb.respond('program_types', 'insert', echo)
    sb.respond('program_types', 'update', { data: { slug: 'fireside-chat', label: 'Fireside talk', area: 'connect', builtin: false } })
    const { add, update, types } = useProgramTypes()
    await add('Fireside chat', 'academy')
    const result = await update('fireside-chat', 'Fireside talk', 'connect')
    expect(result.ok).toBe(true)
    expect(types.value.find((t) => t.slug === 'fireside-chat')).toMatchObject({ label: 'Fireside talk', area: 'connect' })
  })

  it('explains why a type in use cannot be deleted', async () => {
    sb.respond('program_types', 'delete', { error: { code: '23503', message: 'fk' } })
    const { remove } = useProgramTypes()
    const result = await remove('fireside-chat')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/still use this type/i)
  })

  it('removes a deleted type from the list', async () => {
    sb.respond('program_types', 'insert', echo)
    sb.respond('program_types', 'delete', { data: [{ slug: 'fireside-chat' }] })
    const { add, remove, types } = useProgramTypes()
    await add('Fireside chat', 'academy')
    expect((await remove('fireside-chat')).ok).toBe(true)
    expect(types.value.some((t) => t.slug === 'fireside-chat')).toBe(false)
  })
})

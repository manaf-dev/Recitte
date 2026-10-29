import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Contact } from '@recitte/shared'
import { sb } from '@/test/supabaseMock'
import * as confirm from '@/lib/confirm'
import type { Submission, SubmissionView } from '@/composables/useSubmissions'
import SubmissionList from './SubmissionList.vue'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

const rows: Contact[] = [
  {
    id: 'c2',
    created_at: '2026-10-28T10:00:00Z',
    status: 'new',
    full_name: 'Amina',
    email: 'amina@example.com',
    subject: 'General',
    phone: null,
    message: 'When does the next seminar start?',
  },
  {
    id: 'c1',
    created_at: '2026-10-20T10:00:00Z',
    status: 'handled',
    full_name: 'Bilal',
    email: 'bilal@example.com',
    subject: null,
    phone: '+233 20 000 0000',
    message: 'Can I join the challenge late?',
  },
]

function describeRow(c: Contact) {
  return {
    heading: c.full_name,
    fields: [
      { label: 'Email', value: c.email },
      { label: 'Message', value: c.message, wide: true },
    ],
  }
}

// mount() cannot infer the component's generic, so widen the row type here.
const describeProp = describeRow as unknown as (row: Submission) => SubmissionView

async function mountList() {
  sb.respond('contacts', 'select', { data: rows })
  sb.respond('contacts', 'update', (c) => ({ data: { id: (c.filters[0]?.[2] as string) ?? '' } }))
  const wrapper = mount(SubmissionList, {
    props: { table: 'contacts', title: 'Messages', noun: 'message', emptyText: 'No messages yet.', describe: describeProp },
  })
  await flushPromises()
  return wrapper
}

function rowFor(wrapper: Awaited<ReturnType<typeof mountList>>, name: string) {
  const row = wrapper.findAll('li').find((li) => li.text().includes(name))
  if (!row) throw new Error(`no row for ${name}`)
  return row
}

beforeEach(() => sb.reset())

describe('SubmissionList', () => {
  it('loads newest first and shows every field, the date and the status', async () => {
    const wrapper = await mountList()
    const select = sb.callsFor('contacts', 'select')[0]
    expect(select?.filters).toContainEqual(['order', 'created_at', { ascending: false }])
    const first = wrapper.findAll('li')[0]!
    expect(first.text()).toContain('Amina')
    expect(first.text()).toContain('amina@example.com')
    expect(first.text()).toContain('When does the next seminar start?')
    expect(first.text()).toContain('New')
    expect(first.find('time').attributes('datetime')).toBe('2026-10-28T10:00:00Z')
  })

  it('marks a new submission handled and a handled one new again', async () => {
    const wrapper = await mountList()

    await rowFor(wrapper, 'Amina').get('button').trigger('click')
    await flushPromises()
    await rowFor(wrapper, 'Bilal').get('button').trigger('click')
    await flushPromises()

    const updates = sb.callsFor('contacts', 'update')
    expect(updates[0]?.payload).toEqual({ status: 'handled' })
    expect(updates[0]?.filters).toContainEqual(['eq', 'id', 'c2'])
    expect(updates[1]?.payload).toEqual({ status: 'new' })
    expect(updates[1]?.filters).toContainEqual(['eq', 'id', 'c1'])
    expect(rowFor(wrapper, 'Amina').attributes('data-status')).toBe('handled')
    expect(rowFor(wrapper, 'Bilal').attributes('data-status')).toBe('new')
    expect(rowFor(wrapper, 'Amina').get('button').text()).toBe('Mark new again')
  })

  it('does not delete when the confirmation is cancelled', async () => {
    const ask = vi.spyOn(confirm, 'confirmAction').mockResolvedValue(false)
    const wrapper = await mountList()
    await rowFor(wrapper, 'Amina').get('button.btn-danger').trigger('click')
    await flushPromises()
    expect(ask).toHaveBeenCalledOnce()
    expect(sb.callsFor('contacts', 'delete')).toHaveLength(0)
    expect(wrapper.text()).toContain('Amina')
  })

  it('deletes after the confirmation is accepted', async () => {
    vi.spyOn(confirm, 'confirmAction').mockResolvedValue(true)
    const wrapper = await mountList()
    await rowFor(wrapper, 'Amina').get('button.btn-danger').trigger('click')
    await flushPromises()
    const del = sb.callsFor('contacts', 'delete')
    expect(del).toHaveLength(1)
    expect(del[0]?.filters).toContainEqual(['eq', 'id', 'c2'])
    expect(wrapper.findAll('li').map((li) => li.text()).join()).not.toContain('Amina')
  })

  it('filters by status and shows an empty state', async () => {
    const wrapper = await mountList()
    const handledFilter = wrapper.findAll('button').find((b) => b.text().startsWith('Handled'))!
    await handledFilter.trigger('click')
    expect(wrapper.findAll('li')).toHaveLength(1)
    expect(wrapper.find('li').text()).toContain('Bilal')

    sb.reset()
    sb.respond('contacts', 'select', { data: [] })
    const empty = mount(SubmissionList, {
      props: { table: 'contacts', title: 'Messages', noun: 'message', emptyText: 'No messages yet.', describe: describeProp },
    })
    await flushPromises()
    expect(empty.text()).toContain('No messages yet.')
  })
})

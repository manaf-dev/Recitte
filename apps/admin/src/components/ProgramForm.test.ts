import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Program } from '@recitte/shared'
import { sb } from '@/test/supabaseMock'
import ProgramForm from './ProgramForm.vue'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock').then((m) => m.supabaseModule))

beforeEach(() => sb.reset())

const existing = {
  id: 'p1',
  slug: 'tajweed-essentials',
  type: 'course',
  title: 'Tajweed Essentials',
  description: 'Core rules of recitation.',
  highlights: [],
  starts_on: null,
  ends_on: null,
  time: null,
  duration: null,
  format: null,
  start_time: null,
  end_time: null,
  format_kind: null,
  location: null,
  is_draft: false,
  extra_details: [],
  speaker: null,
  speaker_bio: null,
  speaker_photo_url: null,
  status: 'open',
  featured: false,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
} satisfies Program

describe('ProgramForm', () => {
  it('fills the slug from the title until the slug field is edited', async () => {
    const wrapper = mount(ProgramForm)
    const title = wrapper.get<HTMLInputElement>('#pf-title')
    const slug = wrapper.get<HTMLInputElement>('#pf-slug')

    await title.setValue('Seerah Evening')
    expect(slug.element.value).toBe('seerah-evening')

    await slug.setValue('seerah')
    await title.setValue('Seerah Evening, part two')
    expect(slug.element.value).toBe('seerah')
  })

  it('keeps the slug when the title of an existing program changes', async () => {
    const wrapper = mount(ProgramForm, { props: { program: existing } })
    await wrapper.get('#pf-title').setValue('Tajweed Essentials II')
    expect(wrapper.get<HTMLInputElement>('#pf-slug').element.value).toBe('tajweed-essentials')
  })

  it('shows per-field errors and does not save an invalid form', async () => {
    const wrapper = mount(ProgramForm)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('#pf-title-error').text()).toMatch(/title is required/i)
    expect(wrapper.get('#pf-description-error').text()).toMatch(/add a description before publishing/i)
    expect(sb.callsFor('programs')).toHaveLength(0)
  })

  it('reports a duplicate slug on the slug field', async () => {
    sb.respond('programs', 'insert', { error: { code: '23505', message: 'duplicate key value' } })
    const wrapper = mount(ProgramForm)
    await wrapper.get('#pf-title').setValue('Tajweed Essentials')
    await wrapper.get('#pf-description').setValue('Core rules.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('#pf-slug-error').text()).toMatch(/slug is already used/i)
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('inserts a valid new program, not featured, and emits saved', async () => {
    sb.respond('programs', 'insert', (call) => ({ data: { ...existing, ...(call.payload as object), id: 'new-id' } }))
    const wrapper = mount(ProgramForm)
    await wrapper.get('#pf-title').setValue('Tajweed Essentials')
    await wrapper.get('#pf-description').setValue('Core rules.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const insert = sb.callsFor('programs', 'insert')[0]
    expect(insert?.payload).toMatchObject({ title: 'Tajweed Essentials', slug: 'tajweed-essentials', featured: false })
    expect(wrapper.emitted('saved')?.[0]?.[0]).toMatchObject({ id: 'new-id' })
  })

  it('saves a draft with only a title, hidden and never featured', async () => {
    sb.respond('programs', 'insert', (call) => ({ data: { ...existing, ...(call.payload as object), id: 'draft-id' } }))
    const wrapper = mount(ProgramForm)
    await wrapper.get('#pf-title').setValue('Work in progress')
    await wrapper.findAll('button').find((b) => b.text() === 'Save as draft')!.trigger('click')
    await flushPromises()
    expect(sb.callsFor('programs', 'insert')[0]?.payload).toMatchObject({ is_draft: true, description: '', featured: false })
    expect(wrapper.emitted('saved')?.[0]?.[0]).toMatchObject({ id: 'draft-id' })
  })

  it('does not publish a draft without a description', async () => {
    const wrapper = mount(ProgramForm)
    await wrapper.get('#pf-title').setValue('Work in progress')
    await wrapper.findAll('button').find((b) => b.text() === 'Publish program')!.trigger('click')
    await flushPromises()
    expect(wrapper.get('#pf-description-error').text()).toMatch(/description/i)
    expect(sb.callsFor('programs', 'insert')).toHaveLength(0)
  })

  it('shows the duration from the dates and open-ended with no end date', async () => {
    const wrapper = mount(ProgramForm)
    await wrapper.get('#pf-starts').setValue('2026-11-14')
    expect(wrapper.get('[role="status"]').text()).toContain('Open-ended')
    await wrapper.get('#pf-ends').setValue('2026-12-11')
    expect(wrapper.get('[role="status"]').text()).toContain('4 weeks')
  })

  it('asks for a location only when the format is in person', async () => {
    const wrapper = mount(ProgramForm)
    expect(wrapper.find('#pf-location').exists()).toBe(false)
    await wrapper.get('#pf-format').setValue('in_person')
    expect(wrapper.find('#pf-location').exists()).toBe(true)
    await wrapper.get('#pf-format').setValue('online')
    expect(wrapper.find('#pf-location').exists()).toBe(false)
    expect(wrapper.find('#pf-platform').exists()).toBe(true)
    expect(wrapper.find('#pf-platform-other').exists()).toBe(false)
    await wrapper.get('#pf-platform').setValue('Other')
    expect(wrapper.find('#pf-platform-other').exists()).toBe(true)
  })

  it('saves the chosen online platform as the location and format text', async () => {
    sb.respond('programs', 'insert', (call) => ({ data: { ...existing, ...(call.payload as object), id: 'n' } }))
    const wrapper = mount(ProgramForm)
    await wrapper.get('#pf-title').setValue('Tajweed Essentials')
    await wrapper.get('#pf-description').setValue('Core rules.')
    await wrapper.get('#pf-format').setValue('online')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('#pf-platform-error').text()).toMatch(/choose the online platform/i)
    await wrapper.get('#pf-platform').setValue('Google Meet')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(sb.callsFor('programs', 'insert')[0]?.payload).toMatchObject({
      format_kind: 'online',
      location: 'Google Meet',
      format: 'Online · Google Meet',
    })
  })

  it('adds highlights one line at a time and drops blank ones on save', async () => {
    sb.respond('programs', 'insert', (call) => ({ data: { ...existing, ...(call.payload as object), id: 'n' } }))
    const wrapper = mount(ProgramForm)
    await wrapper.get('#pf-title').setValue('Tajweed Essentials')
    await wrapper.get('#pf-description').setValue('Core rules.')
    await wrapper.get('input[aria-label$="point 1"]').setValue('Makharij')
    await wrapper.findAll('button').find((b) => b.text().includes('Add a point'))!.trigger('click')
    await wrapper.get('input[aria-label$="point 2"]').setValue('Madd')
    await wrapper.findAll('button').find((b) => b.text().includes('Add a point'))!.trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(sb.callsFor('programs', 'insert')[0]?.payload).toMatchObject({ highlights: ['Makharij', 'Madd'] })
  })

  it('adds a new program type and selects it', async () => {
    sb.respond('program_types', 'insert', (call) => ({ data: { ...(call.payload as object), builtin: false } }))
    const wrapper = mount(ProgramForm)
    await flushPromises()
    await wrapper.get('#pf-type').setValue('__new__')
    await wrapper.get('#pf-new-type').setValue('Fireside chat')
    await wrapper.findAll('button').find((b) => b.text() === 'Add type')!.trigger('click')
    await flushPromises()
    expect(sb.callsFor('program_types', 'insert')[0]?.payload).toEqual({ slug: 'fireside-chat', label: 'Fireside chat', area: 'academy' })
    expect(wrapper.get<HTMLSelectElement>('#pf-type').element.value).toBe('fireside-chat')
  })

  it('keeps a hand-written duration when an existing program is saved', async () => {
    sb.respond('programs', 'update', (call) => ({ data: { ...existing, ...(call.payload as object) } }))
    const program = { ...existing, type: 'workshop', starts_on: '2026-11-14', ends_on: '2026-12-11', duration: '4 weeks · 2×/week' }
    const wrapper = mount(ProgramForm, { props: { program } })
    expect(wrapper.get<HTMLInputElement>('#pf-duration').element.value).toBe('4 weeks · 2×/week')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(sb.callsFor('programs', 'update')[0]?.payload).toMatchObject({ duration: '4 weeks · 2×/week' })
  })

  it('clears the end date and time when their start is cleared, so a draft can still be saved', async () => {
    sb.respond('programs', 'insert', (call) => ({ data: { ...existing, ...(call.payload as object), id: 'd' } }))
    const wrapper = mount(ProgramForm)
    await wrapper.get('#pf-title').setValue('Talk')
    await wrapper.get('#pf-starts').setValue('2026-11-14')
    await wrapper.get('#pf-ends').setValue('2026-11-20')
    await wrapper.get('#pf-start-time').setValue('19:00')
    await wrapper.get('#pf-end-time').setValue('21:00')
    await wrapper.get('#pf-starts').setValue('')
    await wrapper.get('#pf-start-time').setValue('')
    expect(wrapper.get<HTMLInputElement>('#pf-ends').element.value).toBe('')
    expect(wrapper.get<HTMLInputElement>('#pf-end-time').element.value).toBe('')
    await wrapper.findAll('button').find((b) => b.text() === 'Save as draft')!.trigger('click')
    await flushPromises()
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('announces a failed type add and shows the program type even when the list lacks it', async () => {
    const wrapper = mount(ProgramForm, { props: { program: { ...existing, type: 'fireside' } } })
    await flushPromises()
    expect(wrapper.get<HTMLSelectElement>('#pf-type').element.value).toBe('fireside')
    await wrapper.get('#pf-type').setValue('__new__')
    await wrapper.get('#pf-new-type').setValue('Workshop')
    await wrapper.findAll('button').find((b) => b.text() === 'Add type')!.trigger('click')
    await flushPromises()
    expect(wrapper.get('#pf-new-type-error').attributes('role')).toBe('alert')
  })

  it('tells staff when the custom types could not be loaded', async () => {
    sb.respond('program_types', 'select', { error: { message: 'boom' } })
    const wrapper = mount(ProgramForm)
    await flushPromises()
    expect(wrapper.text()).toMatch(/could not load your custom types/i)
  })
})

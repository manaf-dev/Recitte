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
    expect(wrapper.get('#pf-description-error').text()).toMatch(/description is required/i)
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
})

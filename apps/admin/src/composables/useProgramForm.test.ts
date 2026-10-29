import { describe, expect, it } from 'vitest'
import type { Program } from '@recitte/shared'
import { useProgramForm } from './useProgramForm'

const existing: Program = {
  id: 'p1',
  slug: 'tajweed-essentials',
  type: 'course',
  title: 'Tajweed Essentials',
  description: 'Core rules of recitation.',
  about: null,
  highlights: ['Makharij', 'Madd'],
  starts_on: '2026-11-14',
  ends_on: null,
  time: null,
  duration: null,
  format: null,
  extra_details: [{ label: 'Level', value: 'Beginner' }],
  speaker: null,
  speaker_bio: null,
  speaker_photo_url: null,
  status: 'open',
  featured: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
}

describe('useProgramForm slug', () => {
  it('suggests the slug from the title while the slug is untouched', () => {
    const { form } = useProgramForm()
    form.title = "Qur'an Night: Al-Mulk"
    expect(form.slug).toBe('quran-night-al-mulk')
    form.title = 'Tajweed Essentials'
    expect(form.slug).toBe('tajweed-essentials')
  })

  it('stops following the title once the slug is edited', () => {
    const { form, editSlug } = useProgramForm()
    form.title = 'Monthly seminar'
    editSlug('november-seminar')
    form.title = 'Monthly seminar: November'
    expect(form.slug).toBe('november-seminar')
  })

  it('never changes the slug of an existing program when the title changes', () => {
    const { form } = useProgramForm(existing)
    expect(form.slug).toBe('tajweed-essentials')
    form.title = 'Tajweed Essentials, second cohort'
    expect(form.slug).toBe('tajweed-essentials')
  })

  it('starts new programs not featured and loads existing values for editing', () => {
    expect(useProgramForm().form.featured).toBe(false)
    const { form } = useProgramForm(existing)
    expect(form.highlights).toBe('Makharij\nMadd')
    expect(form.featured).toBe(true)
    expect(form.extra_details).toEqual([{ label: 'Level', value: 'Beginner' }])
  })

  it('validates with the shared rules and returns per-field errors', () => {
    const { form, validate, errors } = useProgramForm()
    form.starts_on = '2026-11-14'
    form.ends_on = '2026-11-01'
    expect(validate()).toBeNull()
    expect(Object.keys(errors.value)).toEqual(expect.arrayContaining(['title', 'slug', 'description', 'ends_on']))

    form.title = 'Tajweed Essentials'
    form.description = 'Core rules.'
    form.ends_on = ''
    expect(validate()).toMatchObject({ slug: 'tajweed-essentials', ends_on: null, featured: false })
    expect(errors.value).toEqual({})
  })
})

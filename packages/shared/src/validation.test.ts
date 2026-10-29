import { describe, expect, it } from 'vitest'
import {
  validateApplication,
  validateContact,
  validateProgram,
  validateRegistration,
  validateTestimonial,
} from './validation'
import type { ApplicationInput, ContactInput, ProgramInput, RegistrationInput } from './types'
import { NOT_SURE_PROGRAM } from './types'

const app: ApplicationInput = {
  full_name: '  Aisha Mohammed ',
  email: 'aisha@example.com',
  phone: '+233 20 123 4567',
  country: ' Ghana ',
  age: '',
  program: '6f1d1c2e-0000-4000-8000-000000000001',
  level: 'Can read slowly with mistakes',
  tajweed_experience: '',
  additional_info: '',
}

describe('validateApplication', () => {
  it('accepts a complete application and normalises it', () => {
    const r = validateApplication(app)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value).toEqual({
      full_name: 'Aisha Mohammed',
      email: 'aisha@example.com',
      phone: '+233 20 123 4567',
      country: 'Ghana',
      age: null,
      program_id: app.program,
      level: 'Can read slowly with mistakes',
      tajweed_experience: null,
      additional_info: null,
    })
  })

  it.each(['full_name', 'email', 'phone', 'country', 'program', 'level'] as const)('requires %s', (key) => {
    const r = validateApplication({ ...app, [key]: '   ' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors[key]).toBeTruthy()
  })

  it('rejects malformed email', () => {
    for (const email of ['aisha', 'aisha@', '@example.com', 'aisha@example', 'a b@example.com']) {
      expect(validateApplication({ ...app, email }).ok).toBe(false)
    }
  })

  it('needs at least 7 digits of phone', () => {
    expect(validateApplication({ ...app, phone: '+23 456' }).ok).toBe(false)
    expect(validateApplication({ ...app, phone: '1234567' }).ok).toBe(true)
  })

  it('checks optional age range and integer', () => {
    expect(validateApplication({ ...app, age: '3' }).ok).toBe(false)
    expect(validateApplication({ ...app, age: '101' }).ok).toBe(false)
    expect(validateApplication({ ...app, age: '12.5' }).ok).toBe(false)
    expect(validateApplication({ ...app, age: 'ten' }).ok).toBe(false)
    const ok = validateApplication({ ...app, age: ' 5 ' })
    expect(ok.ok && ok.value.age).toBe(5)
    expect(validateApplication({ ...app, age: 100 }).ok).toBe(true)
  })

  it('maps "not sure" to no program id', () => {
    const r = validateApplication({ ...app, program: NOT_SURE_PROGRAM })
    expect(r.ok && r.value.program_id).toBeNull()
  })

  it('only accepts the listed levels and tajweed answers', () => {
    expect(validateApplication({ ...app, level: 'Expert' }).ok).toBe(false)
    expect(validateApplication({ ...app, tajweed_experience: 'Lots' }).ok).toBe(false)
    expect(validateApplication({ ...app, tajweed_experience: 'Formal Tajweed study' }).ok).toBe(true)
  })
})

const reg: RegistrationInput = {
  program_id: '6f1d1c2e-0000-4000-8000-000000000001',
  kind: 'register',
  full_name: 'Yusuf',
  email: 'yusuf@example.com',
  phone: '',
}

describe('validateRegistration', () => {
  it('accepts name and email with phone optional', () => {
    const r = validateRegistration(reg)
    expect(r.ok && r.value.phone).toBeNull()
  })

  it('requires name and a valid email', () => {
    const r = validateRegistration({ ...reg, full_name: ' ', email: 'nope' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(Object.keys(r.errors).sort()).toEqual(['email', 'full_name'])
  })

  it('rejects an unknown kind', () => {
    expect(validateRegistration({ ...reg, kind: 'join' as never }).ok).toBe(false)
  })
})

const contact: ContactInput = {
  subject: '',
  full_name: 'Aisha',
  email: 'aisha@example.com',
  phone: '',
  message: 'Assalamu alaikum, a question.',
}

describe('validateContact', () => {
  it('accepts an empty subject', () => {
    const r = validateContact(contact)
    expect(r.ok && r.value.subject).toBeNull()
  })

  it('requires a message from 10 to 1000 characters', () => {
    expect(validateContact({ ...contact, message: '  too short  ' }).ok).toBe(false)
    expect(validateContact({ ...contact, message: 'x'.repeat(1001) }).ok).toBe(false)
    expect(validateContact({ ...contact, message: 'x'.repeat(1000) }).ok).toBe(true)
  })

  it('only accepts known subjects', () => {
    expect(validateContact({ ...contact, subject: 'Partnership' }).ok).toBe(true)
    expect(validateContact({ ...contact, subject: 'Spam' }).ok).toBe(false)
  })
})

describe('validateTestimonial', () => {
  it('requires a quote of 10+ characters and a name', () => {
    expect(validateTestimonial({ quote: 'Too short', name: 'A', session: '' }).ok).toBe(false)
    expect(validateTestimonial({ quote: 'Long enough quote', name: ' ', session: '' }).ok).toBe(false)
    const r = validateTestimonial({ quote: ' Long enough quote ', name: 'Attendee', session: '' })
    expect(r.ok && r.value).toEqual({ quote: 'Long enough quote', name: 'Attendee', session: null })
  })
})

const program: ProgramInput = {
  type: 'workshop',
  title: 'Recitte Huruf Workshop',
  slug: 'recitte-huruf-workshop',
  description: 'A focused workshop on the Arabic letters.',
  about: '',
  highlights: 'Makharij\n\n  Sifat  \n',
  starts_on: '2026-11-14',
  ends_on: '',
  time: '',
  duration: '4 weeks · 2×/week',
  format: 'Live online',
  extra_details: [
    { label: 'Level', value: 'Level 1' },
    { label: ' ', value: ' ' },
  ],
  speaker: '',
  speaker_bio: '',
  speaker_photo_url: null,
  status: 'open',
  featured: false,
}

describe('validateProgram', () => {
  it('normalises optional fields to null and splits highlights', () => {
    const r = validateProgram(program)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.highlights).toEqual(['Makharij', 'Sifat'])
    expect(r.value.extra_details).toEqual([{ label: 'Level', value: 'Level 1' }])
    expect(r.value.about).toBeNull()
    expect(r.value.ends_on).toBeNull()
    expect(r.value.duration).toBe('4 weeks · 2×/week')
  })

  it('requires type, title, slug and description', () => {
    const r = validateProgram({ ...program, title: '', slug: '', description: '', type: 'class' as never })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(Object.keys(r.errors).sort()).toEqual(['description', 'slug', 'title', 'type'])
  })

  it('rejects a malformed slug', () => {
    expect(validateProgram({ ...program, slug: 'Huruf Workshop' }).ok).toBe(false)
  })

  it('requires ends_on on or after starts_on, and a start date with an end date', () => {
    expect(validateProgram({ ...program, ends_on: '2026-11-13' }).ok).toBe(false)
    expect(validateProgram({ ...program, ends_on: '2026-11-14' }).ok).toBe(true)
    expect(validateProgram({ ...program, starts_on: '', ends_on: '2026-11-14' }).ok).toBe(false)
  })

  it('rejects half-filled extra detail rows', () => {
    expect(validateProgram({ ...program, extra_details: [{ label: 'Entry', value: '' }] }).ok).toBe(false)
  })
})

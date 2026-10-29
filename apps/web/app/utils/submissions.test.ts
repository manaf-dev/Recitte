import { describe, expect, it, vi } from 'vitest'
import type { ApplicationInput, ContactInput, RegistrationInput } from '@recitte/shared'
import {
  registrationOutcome,
  submitApplication,
  submitContact,
  submitRegistration,
  type InsertClient,
} from './submissions'

const TODAY = '2026-11-14'

function client(error: { message: string; code?: string } | null = null) {
  const insert = vi.fn(async () => ({ error }))
  const from = vi.fn(() => ({ insert }))
  return { client: { from } as unknown as InsertClient, from, insert }
}

const open = { id: 'w1', type: 'workshop' as const, status: 'open' as const, starts_on: '2026-11-20', ends_on: null }
const past = { ...open, id: 'w2', starts_on: '2026-11-13' }
const closed = { ...open, id: 'w3', status: 'closed' as const }

const reg: RegistrationInput = { program_id: 'w1', kind: 'register', full_name: 'Yusuf', email: 'yusuf@example.com', phone: '' }

describe('submitRegistration', () => {
  it('stores a valid registration with the normalised row', async () => {
    const c = client()
    const r = await submitRegistration(c.client, reg, open, TODAY)
    expect(r.ok).toBe(true)
    expect(c.from).toHaveBeenCalledWith('registrations')
    expect(c.insert).toHaveBeenCalledWith({ program_id: 'w1', kind: 'register', full_name: 'Yusuf', email: 'yusuf@example.com', phone: null })
  })

  it('never calls the database for a past program', async () => {
    const c = client()
    expect(await submitRegistration(c.client, { ...reg, kind: 'interest' }, past, TODAY)).toEqual({ ok: false, reason: 'ended' })
    expect(c.insert).not.toHaveBeenCalled()
  })

  it('never calls the database for a closed program', async () => {
    const c = client()
    expect(await submitRegistration(c.client, reg, closed, TODAY)).toEqual({ ok: false, reason: 'closed' })
    expect(c.insert).not.toHaveBeenCalled()
  })

  it('returns field errors without inserting', async () => {
    const c = client()
    const r = await submitRegistration(c.client, { ...reg, email: 'nope' }, open, TODAY)
    expect(r).toMatchObject({ ok: false, reason: 'invalid' })
    expect(c.insert).not.toHaveBeenCalled()
  })

  it('reports a database refusal for an ended program as ended', async () => {
    const c = client({ code: '23514', message: 'Registration for this program has ended' })
    expect(await submitRegistration(c.client, reg, open, TODAY)).toEqual({ ok: false, reason: 'ended' })
  })

  it('reports any other database error as failed', async () => {
    const c = client({ message: 'network down' })
    expect(await submitRegistration(c.client, reg, open, TODAY)).toEqual({ ok: false, reason: 'failed' })
  })
})

const app: ApplicationInput = {
  full_name: 'Aisha',
  email: 'aisha@example.com',
  phone: '+233 20 123 4567',
  country: 'Ghana',
  age: '',
  program: 'w1',
  level: 'Can read slowly with mistakes',
  tajweed_experience: '',
  additional_info: '',
}

describe('submitApplication', () => {
  it('stores an application for an open program', async () => {
    const c = client()
    expect((await submitApplication(c.client, app, [open], TODAY)).ok).toBe(true)
    expect(c.from).toHaveBeenCalledWith('applications')
    expect(c.insert).toHaveBeenCalledWith(expect.objectContaining({ program_id: 'w1', age: null }))
  })

  it('stores a "not sure" application with no program', async () => {
    const c = client()
    await submitApplication(c.client, { ...app, program: 'Not sure, please advise' }, [], TODAY)
    expect(c.insert).toHaveBeenCalledWith(expect.objectContaining({ program_id: null }))
  })

  it('refuses a past program without inserting', async () => {
    const c = client()
    expect(await submitApplication(c.client, { ...app, program: 'w2' }, [past], TODAY)).toEqual({ ok: false, reason: 'ended' })
    expect(c.insert).not.toHaveBeenCalled()
  })
})

describe('submitContact', () => {
  const contact: ContactInput = { subject: 'General', full_name: 'Aisha', email: 'aisha@example.com', phone: '', message: 'Assalamu alaikum, a question.' }

  it('stores a valid message', async () => {
    const c = client()
    expect((await submitContact(c.client, contact)).ok).toBe(true)
    expect(c.from).toHaveBeenCalledWith('contacts')
  })

  it('reports a failed insert, so the form can say it was not received', async () => {
    const c = client({ message: 'down' })
    expect(await submitContact(c.client, contact)).toEqual({ ok: false, reason: 'failed' })
  })
})

describe('registrationOutcome', () => {
  const wa = 'https://wa.me/233540634141?text=hi'

  it('opens WhatsApp after a saved interest', () => {
    expect(registrationOutcome('interest', { ok: true }, wa)).toEqual({ stored: true, openWhatsApp: true, whatsappUrl: wa })
  })

  it('still offers WhatsApp when saving interest failed, without claiming it was stored', () => {
    expect(registrationOutcome('interest', { ok: false, reason: 'failed' }, wa)).toEqual({
      stored: false,
      openWhatsApp: false,
      whatsappUrl: wa,
    })
  })

  it('does not offer WhatsApp for an ended program', () => {
    expect(registrationOutcome('interest', { ok: false, reason: 'ended' }, wa).whatsappUrl).toBeNull()
  })

  it('never opens WhatsApp for notify or register', () => {
    for (const kind of ['notify', 'register'] as const) {
      expect(registrationOutcome(kind, { ok: true }, wa)).toEqual({ stored: true, openWhatsApp: false, whatsappUrl: null })
      expect(registrationOutcome(kind, { ok: false, reason: 'failed' }, wa).whatsappUrl).toBeNull()
    }
  })
})

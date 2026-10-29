import { describe, expect, it } from 'vitest'
import { programCta, programStatusLabel } from './cta'
import type { ProgramLike } from './cta'

const TODAY = '2026-11-14'
const base: ProgramLike = { type: 'workshop', status: 'open', starts_on: '2026-12-01', ends_on: null }
const cta = (p: Partial<ProgramLike>) => programCta({ ...base, ...p }, TODAY)

describe('programCta', () => {
  it('ends registration for a past program, whatever its status', () => {
    for (const status of ['open', 'soon', 'closed'] as const) {
      expect(cta({ status, starts_on: '2026-11-13' })).toEqual({ action: 'ended', label: 'Registration has ended' })
    }
  })

  it('closes a closed program that is not past', () => {
    expect(cta({ status: 'closed' })).toEqual({ action: 'closed', label: 'Registration closed' })
    expect(cta({ status: 'closed', type: 'community' })).toEqual({ action: 'closed', label: 'Registration closed' })
  })

  it('offers notify for soon programs', () => {
    for (const type of ['workshop', 'seminar', 'course', 'event', 'challenge'] as const) {
      expect(cta({ type, status: 'soon' })).toEqual({ action: 'notify', label: 'Notify me' })
    }
  })

  it('keeps community on the join dialog when soon', () => {
    expect(cta({ type: 'community', status: 'soon' })).toEqual({ action: 'join', label: 'Join on WhatsApp' })
  })

  it('maps open programs by type', () => {
    expect(cta({ type: 'workshop' })).toEqual({ action: 'interest', label: "I'm interested" })
    expect(cta({ type: 'seminar' })).toEqual({ action: 'interest', label: "I'm interested" })
    expect(cta({ type: 'course' })).toEqual({ action: 'apply', label: 'Apply now' })
    expect(cta({ type: 'event' })).toEqual({ action: 'register', label: 'Register to attend' })
    expect(cta({ type: 'challenge' })).toEqual({ action: 'register', label: 'Register to attend' })
    expect(cta({ type: 'community' })).toEqual({ action: 'join', label: 'Join on WhatsApp' })
  })

  it('treats an undated program as current', () => {
    expect(cta({ starts_on: null })).toEqual({ action: 'interest', label: "I'm interested" })
  })
})

describe('programStatusLabel', () => {
  it('labels past programs as ended', () => {
    expect(programStatusLabel({ ...base, starts_on: '2026-11-01' }, TODAY)).toBe('Registration ended')
  })

  it('labels by status otherwise', () => {
    expect(programStatusLabel(base, TODAY)).toBe('Registration open')
    expect(programStatusLabel({ ...base, status: 'soon' }, TODAY)).toBe('Coming soon')
    expect(programStatusLabel({ ...base, status: 'closed' }, TODAY)).toBe('Closed')
  })
})

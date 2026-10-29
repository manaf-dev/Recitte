import { describe, expect, it } from 'vitest'
import { isValidSlug, suggestSlug } from './slug'

describe('suggestSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(suggestSlug('Recitte Huruf Workshop')).toBe('recitte-huruf-workshop')
  })

  it('drops apostrophes and punctuation', () => {
    expect(suggestSlug("30-Day Qur'an Challenge")).toBe('30-day-quran-challenge')
    expect(suggestSlug('Living with the Qur’an: part 2!')).toBe('living-with-the-quran-part-2')
  })

  it('strips accents and trims stray hyphens', () => {
    expect(suggestSlug('  Tajwīd — Ésprit  ')).toBe('tajwid-esprit')
  })

  it('returns an empty string for a title with no letters or digits', () => {
    expect(suggestSlug('—')).toBe('')
  })
})

describe('isValidSlug', () => {
  it('accepts lowercase hyphenated slugs', () => {
    expect(isValidSlug('recitte-huruf-workshop')).toBe(true)
    expect(isValidSlug('30-day')).toBe(true)
  })

  it('rejects anything else', () => {
    for (const s of ['', 'Upper', 'two--hyphens', '-lead', 'trail-', 'with space', 'under_score']) {
      expect(isValidSlug(s)).toBe(false)
    }
  })
})

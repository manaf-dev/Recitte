import { describe, expect, it } from 'vitest'
import { describeDuration, formatClock, formatProgramFormat, formatTimeRange, shortBlurb } from './programText'

describe('formatClock', () => {
  it.each([
    ['00:00', '12:00 AM'],
    ['09:05', '9:05 AM'],
    ['12:00', '12:00 PM'],
    ['19:30', '7:30 PM'],
  ])('%s → %s', (input, out) => expect(formatClock(input)).toBe(out))
})

describe('formatTimeRange', () => {
  it('shows a range, a lone start, or nothing', () => {
    expect(formatTimeRange('19:00', '21:00')).toBe('7:00 PM – 9:00 PM GMT')
    expect(formatTimeRange('19:00', null)).toBe('7:00 PM GMT')
    expect(formatTimeRange(null, null)).toBeNull()
  })
})

describe('describeDuration', () => {
  it('is open-ended without an end date', () => expect(describeDuration('2026-11-14', null)).toBe('Open-ended'))
  it('is empty without a start date', () => expect(describeDuration(null, null)).toBeNull())
  it('counts both end days', () => {
    expect(describeDuration('2026-11-14', '2026-11-14')).toBe('1 day')
    expect(describeDuration('2026-11-14', '2026-11-20')).toBe('1 week')
    expect(describeDuration('2026-11-14', '2026-12-11')).toBe('4 weeks')
    expect(describeDuration('2026-11-14', '2026-11-23')).toBe('10 days')
  })
  it('handles month and year boundaries and DST-free math', () => {
    expect(describeDuration('2026-12-28', '2027-01-03')).toBe('1 week')
  })
})

describe('formatProgramFormat', () => {
  it('joins the kind and the place', () => {
    expect(formatProgramFormat('online', 'Zoom')).toBe('Online · Zoom')
    expect(formatProgramFormat('in_person', 'Accra Central Mosque')).toBe('In person · Accra Central Mosque')
    expect(formatProgramFormat('online', '')).toBe('Online')
    expect(formatProgramFormat('', 'Legacy text')).toBe('Legacy text')
    expect(formatProgramFormat('', null)).toBeNull()
  })
})

describe('shortBlurb', () => {
  it('leaves short text alone and flattens whitespace', () => {
    expect(shortBlurb('  A   short\n text. ')).toBe('A short text.')
  })
  it('cuts long text at a word under the limit, with an ellipsis', () => {
    const long = 'word '.repeat(2000)
    const out = shortBlurb(long, 160)
    expect(out.length).toBeLessThanOrEqual(160)
    expect(out.endsWith('word…')).toBe(true)
  })
  it('cuts a single huge word without failing', () => {
    expect(shortBlurb('x'.repeat(5000), 100)).toHaveLength(100)
  })
})

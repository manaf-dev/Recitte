import { describe, expect, it } from 'vitest'
import { formatProgramDate, formatProgramDateRange, isProgramPast, todayInAccra } from './dates'

const TODAY = '2026-11-14'

describe('todayInAccra', () => {
  it('returns the calendar date in Africa/Accra', () => {
    expect(todayInAccra(new Date('2026-11-14T23:59:00Z'))).toBe('2026-11-14')
    expect(todayInAccra(new Date('2026-11-15T00:01:00Z'))).toBe('2026-11-15')
  })
})

describe('isProgramPast', () => {
  it('is past when only starts_on is set and it was yesterday', () => {
    expect(isProgramPast({ starts_on: '2026-11-13', ends_on: null }, TODAY)).toBe(true)
  })

  it('is not past on the day itself', () => {
    expect(isProgramPast({ starts_on: TODAY, ends_on: null }, TODAY)).toBe(false)
  })

  it('is not past when ends_on is in the future', () => {
    expect(isProgramPast({ starts_on: '2026-11-01', ends_on: '2026-11-20' }, TODAY)).toBe(false)
  })

  it('is never past with no dates', () => {
    expect(isProgramPast({ starts_on: null, ends_on: null }, TODAY)).toBe(false)
  })

  it('lets ends_on win over a later starts_on', () => {
    expect(isProgramPast({ starts_on: '2026-12-01', ends_on: '2026-11-13' }, TODAY)).toBe(true)
  })

  it('is never past without starts_on, even if ends_on is set', () => {
    expect(isProgramPast({ starts_on: null, ends_on: '2026-11-13' }, TODAY)).toBe(false)
  })

  it('defaults to today in Accra', () => {
    expect(isProgramPast({ starts_on: '2000-01-01', ends_on: null })).toBe(true)
    expect(isProgramPast({ starts_on: '2999-01-01', ends_on: null })).toBe(false)
  })
})

describe('formatProgramDate', () => {
  it('formats as weekday day month year', () => {
    expect(formatProgramDate('2026-11-14')).toBe('Sat 14 Nov 2026')
    expect(formatProgramDate('2027-01-04')).toBe('Mon 4 Jan 2027')
  })
})

describe('formatProgramDateRange', () => {
  it('returns null with no start date', () => {
    expect(formatProgramDateRange(null, null)).toBeNull()
  })

  it('shows a single date when there is no end or the end is the same day', () => {
    expect(formatProgramDateRange('2026-11-14', null)).toBe('Sat 14 Nov 2026')
    expect(formatProgramDateRange('2026-11-14', '2026-11-14')).toBe('Sat 14 Nov 2026')
  })

  it('shows a range when ends_on is set', () => {
    expect(formatProgramDateRange('2026-11-14', '2026-12-05')).toBe('Sat 14 Nov – Sat 5 Dec 2026')
    expect(formatProgramDateRange('2026-12-28', '2027-01-04')).toBe('Mon 28 Dec 2026 – Mon 4 Jan 2027')
  })
})

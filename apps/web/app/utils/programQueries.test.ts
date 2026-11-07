import { describe, expect, it } from 'vitest'
import { NOT_SURE_PROGRAM, type Program, type ProgramTypeRow } from '@recitte/shared'
import {
  applicationProgramOptions,
  featuredForHome,
  forAcademy,
  forConnect,
  relatedPrograms,
  sortBySoonest,
} from './programQueries'

const TODAY = '2026-11-14'
let n = 0
function program(p: Partial<Program>): Program {
  n += 1
  return {
    id: `p${n}`,
    slug: `p${n}`,
    type: 'workshop',
    title: `Program ${n}`,
    description: 'd',
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
    is_draft: false,
    start_time: null,
    end_time: null,
    format_kind: null,
    location: null,
    featured: false,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    ...p,
  }
}

describe('sortBySoonest', () => {
  it('puts dated programs first, soonest first, then undated', () => {
    const a = program({ starts_on: '2026-12-01' })
    const b = program({ starts_on: null })
    const c = program({ starts_on: '2026-11-20' })
    expect(sortBySoonest([a, b, c]).map((p) => p.id)).toEqual([c.id, a.id, b.id])
  })
})

describe('featuredForHome', () => {
  it('never includes past or closed programs, or unfeatured ones', () => {
    const past = program({ featured: true, starts_on: '2026-11-13' })
    const closed = program({ featured: true, status: 'closed', starts_on: '2026-11-20' })
    const plain = program({ featured: false, starts_on: '2026-11-20' })
    const ok = program({ featured: true, status: 'soon', starts_on: '2026-11-20' })
    expect(featuredForHome([past, closed, plain, ok], TODAY)).toEqual([ok])
  })

  it('shows the three soonest, with undated after dated', () => {
    const list = [
      program({ featured: true }),
      program({ featured: true, starts_on: '2026-12-10' }),
      program({ featured: true, starts_on: '2026-11-15' }),
      program({ featured: true, starts_on: '2026-11-30' }),
    ]
    expect(featuredForHome(list, TODAY).map((p) => p.starts_on)).toEqual(['2026-11-15', '2026-11-30', '2026-12-10'])
  })

  it('keeps a program that started earlier but has not ended', () => {
    const running = program({ featured: true, starts_on: '2026-11-01', ends_on: '2026-11-14' })
    expect(featuredForHome([running], TODAY)).toEqual([running])
  })
})

describe('forConnect and forAcademy', () => {
  const community = program({ type: 'community' })
  const challenge = program({ type: 'challenge', starts_on: '2026-11-20' })
  const pastChallenge = program({ type: 'challenge', starts_on: '2026-11-01' })
  const closedEvent = program({ type: 'event', status: 'closed', starts_on: '2026-11-21' })
  const seminar = program({ type: 'seminar', starts_on: '2026-11-18' })
  const course = program({ type: 'course' })
  const pastWorkshop = program({ type: 'workshop', starts_on: '2026-10-01' })
  const all = [community, challenge, pastChallenge, closedEvent, seminar, course, pastWorkshop]

  it('lists community and challenge programs that are not past on Connect', () => {
    expect(forConnect(all, TODAY)).toEqual([challenge, community])
  })

  it('lists workshop, seminar, course and event programs that are not past on Academy, closed included', () => {
    expect(forAcademy(all, TODAY)).toEqual([seminar, closedEvent, course])
  })

  const custom: ProgramTypeRow[] = [
    { slug: 'halaqa', label: 'Halaqa', area: 'connect', builtin: false },
    { slug: 'intensive', label: 'Intensive', area: 'academy', builtin: false },
  ]

  it('lists a custom type under the area it was given', () => {
    const halaqa = program({ type: 'halaqa' })
    const intensive = program({ type: 'intensive' })
    expect(forConnect([halaqa, intensive], TODAY, custom)).toEqual([halaqa])
    expect(forAcademy([halaqa, intensive], TODAY, custom)).toEqual([intensive])
  })

  it('falls back to Academy for an unknown slug with no types list', () => {
    const mystery = program({ type: 'mystery' })
    expect(forAcademy([mystery], TODAY)).toEqual([mystery])
    expect(forConnect([mystery], TODAY)).toEqual([])
  })
})

describe('relatedPrograms', () => {
  it('excludes the current, past and closed programs and prefers the same type', () => {
    const current = program({ type: 'workshop', starts_on: '2026-11-20' })
    const sameType = program({ type: 'workshop', starts_on: '2026-12-20' })
    const otherSoon = program({ type: 'seminar', starts_on: '2026-11-16' })
    const otherLater = program({ type: 'event', starts_on: '2026-11-17' })
    const another = program({ type: 'course' })
    const closed = program({ type: 'workshop', status: 'closed' })
    const past = program({ type: 'workshop', starts_on: '2026-11-01' })
    const related = relatedPrograms(current, [current, sameType, otherSoon, otherLater, another, closed, past], TODAY)
    expect(related).toEqual([sameType, otherSoon, otherLater])
  })
})

describe('applicationProgramOptions', () => {
  it('offers open or soon workshops and courses that are not past, then "not sure"', () => {
    const workshop = program({ type: 'workshop', title: 'Huruf', starts_on: '2026-11-20' })
    const course = program({ type: 'course', title: 'Tajweed Essentials', status: 'soon' })
    const closedCourse = program({ type: 'course', status: 'closed' })
    const pastWorkshop = program({ type: 'workshop', starts_on: '2026-11-01' })
    const seminar = program({ type: 'seminar' })
    expect(applicationProgramOptions([course, closedCourse, pastWorkshop, seminar, workshop], TODAY)).toEqual([
      { value: workshop.id, label: 'Huruf' },
      { value: course.id, label: 'Tajweed Essentials' },
      { value: NOT_SURE_PROGRAM, label: NOT_SURE_PROGRAM },
    ])
  })
})

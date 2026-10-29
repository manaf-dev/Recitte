import { describe, expect, it } from 'vitest'
import { emptyProgramInput } from '@/composables/useProgramForm'
import { clearUnusedFields, PROGRAM_FIELDS } from './programFields'

function filled() {
  return {
    ...emptyProgramInput(),
    starts_on: '2026-11-14',
    ends_on: '2026-11-20',
    time: '7 PM',
    duration: '4 weeks',
    format: 'Online',
    speaker: 'Ustadh Yusuf',
    speaker_bio: 'Bio',
    speaker_photo_url: 'https://x/p.jpg',
  }
}

describe('clearUnusedFields', () => {
  it('keeps everything for a workshop', () => {
    const f = filled()
    clearUnusedFields(f)
    expect(f).toMatchObject({ ends_on: '2026-11-20', time: '7 PM', duration: '4 weeks', speaker: 'Ustadh Yusuf' })
  })

  it('drops dates, time, duration and speaker for community', () => {
    const f = { ...filled(), type: 'community' as const }
    clearUnusedFields(f)
    expect(f).toMatchObject({ starts_on: '', ends_on: '', time: '', duration: '', speaker: '', speaker_bio: '', speaker_photo_url: null })
    expect(f.format).toBe('Online')
  })

  it('keeps one date and no duration for a seminar', () => {
    const f = { ...filled(), type: 'seminar' as const }
    clearUnusedFields(f)
    expect(f).toMatchObject({ starts_on: '2026-11-14', ends_on: '', duration: '', time: '7 PM', speaker: 'Ustadh Yusuf' })
  })

  it('has no speaker for a challenge', () => {
    const f = { ...filled(), type: 'challenge' as const }
    clearUnusedFields(f)
    expect(f.speaker).toBe('')
    expect(PROGRAM_FIELDS.challenge.person).toBeNull()
  })
})

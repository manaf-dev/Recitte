import { describe, expect, it } from 'vitest'
import { emptyProgramInput } from '@/composables/useProgramForm'
import { clearUnusedFields, fieldsFor } from './programFields'

function filled() {
  return {
    ...emptyProgramInput(),
    starts_on: '2026-11-14',
    ends_on: '2026-11-20',
    start_time: '19:00',
    end_time: '21:00',
    format_kind: 'online' as const,
    location: 'Zoom',
    speaker: 'Ustadh Yusuf',
    speaker_bio: 'Bio',
    speaker_photo_url: 'https://x/p.jpg',
  }
}

describe('clearUnusedFields', () => {
  it('keeps everything for a workshop', () => {
    const f = filled()
    clearUnusedFields(f)
    expect(f).toMatchObject({ ends_on: '2026-11-20', start_time: '19:00', end_time: '21:00', speaker: 'Ustadh Yusuf' })
  })

  it('drops dates, time, duration and speaker for community', () => {
    const f = { ...filled(), type: 'community' as const }
    clearUnusedFields(f)
    expect(f).toMatchObject({ starts_on: '', ends_on: '', start_time: '', end_time: '', speaker: '', speaker_bio: '', speaker_photo_url: null })
    expect(f.location).toBe('Zoom')
  })

  it('keeps one date and no duration for a seminar', () => {
    const f = { ...filled(), type: 'seminar' as const }
    clearUnusedFields(f)
    expect(f).toMatchObject({ starts_on: '2026-11-14', ends_on: '', start_time: '19:00', speaker: 'Ustadh Yusuf' })
  })

  it('gives types staff added the general layout', () => {
    expect(fieldsFor('fireside')).toMatchObject({ dates: 'range', time: true, person: 'Speaker' })
  })

  it('has no speaker for a challenge', () => {
    const f = { ...filled(), type: 'challenge' as const }
    clearUnusedFields(f)
    expect(f.speaker).toBe('')
    expect(fieldsFor('challenge').person).toBeNull()
  })
})

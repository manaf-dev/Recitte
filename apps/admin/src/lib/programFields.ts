import type { ProgramInput, ProgramType } from '@recitte/shared'

/** Which optional program fields make sense for each type. */
export interface ProgramFieldConfig {
  /** One-line explanation shown under the type picker. */
  blurb: string
  /** 'none': ongoing, no dates. 'single': one day. 'range': start and optional end. */
  dates: 'none' | 'single' | 'range'
  time: boolean
  duration: boolean
  /** null hides the speaker block entirely. */
  person: 'Teacher' | 'Speaker' | null
  highlightsLabel: string
  placeholders: { time?: string; duration?: string; format: string }
}

export const PROGRAM_FIELDS: Record<ProgramType, ProgramFieldConfig> = {
  workshop: {
    blurb: 'A short run of sessions on one skill.',
    dates: 'range',
    time: true,
    duration: true,
    person: 'Teacher',
    highlightsLabel: "What you'll learn",
    placeholders: { time: '7:00 PM GMT', duration: '4 weeks · 2×/week', format: 'Live online' },
  },
  course: {
    blurb: 'A level-based course people apply to.',
    dates: 'range',
    time: true,
    duration: true,
    person: 'Teacher',
    highlightsLabel: "What you'll learn",
    placeholders: { time: 'Saturdays, 9:00 AM GMT', duration: '10 weeks', format: 'Live online' },
  },
  seminar: {
    blurb: 'A single talk, usually monthly.',
    dates: 'single',
    time: true,
    duration: false,
    person: 'Speaker',
    highlightsLabel: 'What to expect',
    placeholders: { time: '7:00 PM GMT', format: 'Hybrid · Accra & online' },
  },
  event: {
    blurb: 'A gathering people register to attend.',
    dates: 'range',
    time: true,
    duration: false,
    person: 'Speaker',
    highlightsLabel: 'What to expect',
    placeholders: { time: '10:00 AM GMT', format: 'Accra Central Mosque' },
  },
  challenge: {
    blurb: 'A community challenge over several days.',
    dates: 'range',
    time: false,
    duration: true,
    person: null,
    highlightsLabel: 'What to expect',
    placeholders: { duration: '30 days', format: 'WhatsApp group' },
  },
  community: {
    blurb: 'An ongoing space people join on WhatsApp.',
    dates: 'none',
    time: false,
    duration: false,
    person: null,
    highlightsLabel: 'What to expect',
    placeholders: { format: 'WhatsApp channel' },
  },
}

/**
 * Clears fields the chosen type does not use, so values typed before the
 * type was changed are not published on a page that has no place for them.
 */
export function clearUnusedFields(form: ProgramInput): void {
  const cfg = PROGRAM_FIELDS[form.type]
  if (cfg.dates === 'none') {
    form.starts_on = ''
    form.ends_on = ''
  }
  if (cfg.dates === 'single') form.ends_on = ''
  if (!cfg.time) form.time = ''
  if (!cfg.duration) form.duration = ''
  if (!cfg.person) {
    form.speaker = ''
    form.speaker_bio = ''
    form.speaker_photo_url = null
  }
}

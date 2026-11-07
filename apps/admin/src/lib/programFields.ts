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
}

const BUILTIN_FIELDS: Record<string, ProgramFieldConfig> = {
  workshop: {
    blurb: 'A short run of sessions on one skill.',
    dates: 'range',
    time: true,
    duration: true,
    person: 'Teacher',
    highlightsLabel: "What you'll learn",
  },
  course: {
    blurb: 'A level-based course people apply to.',
    dates: 'range',
    time: true,
    duration: true,
    person: 'Teacher',
    highlightsLabel: "What you'll learn",
  },
  seminar: {
    blurb: 'A single talk, usually monthly.',
    dates: 'single',
    time: true,
    duration: false,
    person: 'Speaker',
    highlightsLabel: 'What to expect',
  },
  event: {
    blurb: 'A gathering people register to attend.',
    dates: 'range',
    time: true,
    duration: false,
    person: 'Speaker',
    highlightsLabel: 'What to expect',
  },
  challenge: {
    blurb: 'A community challenge over several days.',
    dates: 'range',
    time: false,
    duration: true,
    person: null,
    highlightsLabel: 'What to expect',
  },
  community: {
    blurb: 'An ongoing space people join on WhatsApp.',
    dates: 'none',
    time: false,
    duration: false,
    person: null,
    highlightsLabel: 'What to expect',
  },
}

/** Types staff add themselves get the general-purpose layout. */
const CUSTOM_FIELDS: ProgramFieldConfig = {
  blurb: 'A program of your own: dates, time and a speaker are all optional.',
  dates: 'range',
  time: true,
  duration: true,
  person: 'Speaker',
  highlightsLabel: 'What to expect',
}

export function fieldsFor(type: ProgramType): ProgramFieldConfig {
  return Object.hasOwn(BUILTIN_FIELDS, type) ? BUILTIN_FIELDS[type]! : CUSTOM_FIELDS
}

/**
 * Clears fields the chosen type does not use, so values typed before the
 * type was changed are not published on a page that has no place for them.
 */
export function clearUnusedFields(form: ProgramInput): void {
  const cfg = fieldsFor(form.type)
  if (cfg.dates === 'none') {
    form.starts_on = ''
    form.ends_on = ''
  }
  if (cfg.dates === 'single') form.ends_on = ''
  if (!cfg.duration) form.duration_custom = ''
  if (!cfg.time) {
    form.start_time = ''
    form.end_time = ''
    form.legacy_time = ''
  }
  if (!cfg.person) {
    form.speaker = ''
    form.speaker_bio = ''
    form.speaker_photo_url = null
  }
}

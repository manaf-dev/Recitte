import { CONNECT_TYPES, formatProgramDateRange, type Program, type ProgramDetail, type ProgramType } from '@recitte/shared'

export function isConnectProgram(type: ProgramType): boolean {
  return CONNECT_TYPES.includes(type)
}

/** "Teacher" for courses and workshops, otherwise "Speaker". */
export function speakerRole(type: ProgramType): string {
  return type === 'course' || type === 'workshop' ? 'Teacher' : 'Speaker'
}

export function highlightsTitle(type: ProgramType): string {
  return type === 'course' || type === 'workshop' ? "What you'll learn" : 'What to expect'
}

/** Initials for a speaker without a photo, ignoring honorifics. */
export function speakerInitials(name: string): string {
  return name
    .replace(/^(Ustadh|Ustadha|Shaykh|Sheikh|Dr\.?)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** The Details sidebar rows that are filled in: Date, Time, Duration, Format, then extras. */
export function programDetails(p: Program): ProgramDetail[] {
  const rows: (ProgramDetail | null)[] = [
    p.starts_on ? { label: 'Date', value: formatProgramDateRange(p.starts_on, p.ends_on)! } : null,
    p.time ? { label: 'Time', value: p.time } : null,
    p.duration ? { label: 'Duration', value: p.duration } : null,
    p.format ? { label: 'Format', value: p.format } : null,
    ...p.extra_details,
  ]
  return rows.filter((r): r is ProgramDetail => !!r && !!r.label && !!r.value)
}

/** The short line under a card's description: the first two non-date details. */
export function cardMeta(p: Program): string {
  return [p.time, p.duration, p.format, ...p.extra_details.map((d) => d.value)]
    .filter((v): v is string => !!v)
    .slice(0, 2)
    .join('  ·  ')
}

export function cardTheme(type: ProgramType) {
  const dark = type === 'seminar' || type === 'event' || type === 'challenge'
  return {
    headBg: dark ? '#202545' : type === 'community' ? '#F2ECB6' : '#E5E3DE',
    headFg: dark ? '#fff' : '#202545',
    headSub: dark ? '#B29B72' : '#6b5a3a',
  }
}

export const TYPE_ACCENT: Record<ProgramType, string> = {
  workshop: '#B29B72',
  seminar: '#202545',
  course: '#B29B72',
  community: '#F2ECB6',
  challenge: '#343434',
  event: '#202545',
}

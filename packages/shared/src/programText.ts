import type { ProgramFormatKind } from './types'
import { PROGRAM_FORMAT_LABELS } from './types'

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** `19:00` → `7:00 PM`. */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number) as [number, number]
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`
}

/** The Time row: `7:00 PM – 9:00 PM GMT`, or `7:00 PM GMT` with no end. Accra is GMT all year. */
export function formatTimeRange(start: string | null, end: string | null): string | null {
  if (!start) return null
  return `${formatClock(start)}${end ? ` – ${formatClock(end)}` : ''} GMT`
}

const DAY_MS = 86_400_000

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return Date.UTC(y, m - 1, d) / DAY_MS
}

/**
 * The Duration row, worked out from the dates: whole weeks when the span is a
 * multiple of seven days, otherwise days. A start with no end is open-ended.
 * No start date means no duration.
 */
export function describeDuration(startsOn: string | null, endsOn: string | null): string | null {
  if (!startsOn) return null
  if (!endsOn) return 'Open-ended'
  const days = dayNumber(endsOn) - dayNumber(startsOn) + 1
  if (days < 1) return null
  if (days === 1) return '1 day'
  if (days % 7 === 0) {
    const weeks = days / 7
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
  }
  return `${days} days`
}

/** The Format row: `Online · Zoom`, `In person · Accra Central Mosque`. */
export function formatProgramFormat(kind: ProgramFormatKind | '' | null, location: string | null): string | null {
  const place = (location ?? '').trim()
  const label = kind ? PROGRAM_FORMAT_LABELS[kind] : ''
  const text = [label, place].filter(Boolean).join(' · ')
  return text || null
}

/** A one-paragraph preview for search results and link cards, cut at a word. */
export function shortBlurb(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-–]+$/, '')}…`
}

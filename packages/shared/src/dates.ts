export const TIME_ZONE = 'Africa/Accra'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Today's calendar date in Africa/Accra, as `YYYY-MM-DD`. */
export function todayInAccra(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export interface DatedProgram {
  starts_on: string | null
  ends_on: string | null
}

/**
 * A program is past when its last day (`ends_on`, else `starts_on`) is before
 * today in Accra. A program with no `starts_on` is never past.
 */
export function isProgramPast(program: DatedProgram, today: string = todayInAccra()): boolean {
  if (!program.starts_on) return false
  const lastDay = program.ends_on ?? program.starts_on
  return lastDay < today
}

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return { y, m, d, weekday }
}

/** `2026-11-14` → `Sat 14 Nov 2026`. */
export function formatProgramDate(iso: string): string {
  const { y, m, d, weekday } = parts(iso)
  return `${WEEKDAYS[weekday]} ${d} ${MONTHS[m - 1]} ${y}`
}

/** The Date row: a single date, or a range when `ends_on` is a later day. */
export function formatProgramDateRange(startsOn: string | null, endsOn: string | null): string | null {
  if (!startsOn) return null
  if (!endsOn || endsOn === startsOn) return formatProgramDate(startsOn)
  const a = parts(startsOn)
  const b = parts(endsOn)
  if (a.y === b.y) {
    return `${WEEKDAYS[a.weekday]} ${a.d} ${MONTHS[a.m - 1]} – ${formatProgramDate(endsOn)}`
  }
  return `${formatProgramDate(startsOn)} – ${formatProgramDate(endsOn)}`
}

/** Day number and short month for the program card badge. */
export function dateBadge(iso: string): { day: string; month: string } {
  const { d, m } = parts(iso)
  return { day: String(d), month: MONTHS[m - 1] ?? '' }
}

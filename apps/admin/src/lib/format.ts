import { TIME_ZONE } from '@recitte/shared'

const dateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const dateOnly = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** `2026-10-29T14:05:00Z` → `29 Oct 2026, 14:05` (Accra time). */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

/** `2026-10-29T14:05:00Z` → `29 Oct 2026` (Accra time). */
export function formatDate(iso: string): string {
  return dateOnly.format(new Date(iso))
}

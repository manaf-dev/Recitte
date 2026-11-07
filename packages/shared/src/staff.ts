import type { Staff } from './types'

/** Same limit invite-staff enforces, counted after trimming. */
export const STAFF_NAME_MAX = 80

type NamePart = 'first' | 'last'

/** The message for a first or last name that invite-staff would reject, or null when it is fine. */
export function staffNameError(value: string, part: NamePart): string | null {
  const name = value.trim()
  const label = part === 'first' ? 'first name' : 'last name'
  if (!name) return `Enter a ${label}.`
  if (name.length > STAFF_NAME_MAX) return `Keep the ${label} to ${STAFF_NAME_MAX} characters or fewer.`
  return null
}

/** "First Last" for a staff row, or the email when no name was saved (older invites). */
export function staffDisplayName(row: Pick<Staff, 'email' | 'first_name' | 'last_name'>): string {
  const name = [row.first_name, row.last_name]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
  return name || row.email
}

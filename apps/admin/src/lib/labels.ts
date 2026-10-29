import type { RegistrationKind, SubmissionStatus } from '@recitte/shared'

export const REGISTRATION_KIND_LABELS: Record<RegistrationKind, string> = {
  register: 'Registered to attend',
  notify: 'Notify me',
  interest: "I'm interested",
}

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  new: 'New',
  handled: 'Handled',
}

/** First `max` characters of a text on one line, with an ellipsis when cut. */
export function excerpt(text: string, max = 80): string {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line
}

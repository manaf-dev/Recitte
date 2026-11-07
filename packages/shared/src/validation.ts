import { describeDuration, formatProgramFormat, formatTimeRange, TIME_RE } from './programText'
import { isValidSlug } from './slug'
import {
  CONTACT_SUBJECTS,
  NOT_SURE_PROGRAM,
  PROGRAM_STATUSES,
  PROGRAM_FORMAT_KINDS,
  RECITATION_LEVELS,
  REGISTRATION_KINDS,
  TAJWEED_EXPERIENCE,
} from './types'
import type {
  ApplicationInput,
  ApplicationInsert,
  ContactInput,
  ContactInsert,
  ContactSubject,
  ProgramInput,
  ProgramWrite,
  RecitationLevel,
  RegistrationInput,
  RegistrationInsert,
  TajweedExperience,
  TestimonialInput,
  TestimonialWrite,
} from './types'

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> }

/** Same rule as the database: a name, an `@`, and a dot in the domain. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const MESSAGE_MIN = 10
export const MESSAGE_MAX = 1000
export const QUOTE_MIN = 10

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

export function phoneDigitCount(phone: string): number {
  return phone.replace(/\D/g, '').length
}

const orNull = (s: string | null | undefined) => {
  const t = (s ?? '').trim()
  return t === '' ? null : t
}

const includes = <T extends string>(list: readonly T[], v: string): v is T => (list as readonly string[]).includes(v)

function result<T>(errors: Record<string, string>, value: () => T): ValidationResult<T> {
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: value() }
}

function checkPerson(input: { full_name: string; email: string }, errors: Record<string, string>) {
  if (!input.full_name.trim()) errors.full_name = 'Please enter your full name.'
  if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address.'
}

function parseAge(age: ApplicationInput['age']): number | null | 'invalid' {
  if (age === null || age === undefined) return null
  const raw = String(age).trim()
  if (raw === '') return null
  if (!/^\d+$/.test(raw)) return 'invalid'
  const n = Number(raw)
  return n >= 5 && n <= 100 ? n : 'invalid'
}

export function validateApplication(input: ApplicationInput): ValidationResult<ApplicationInsert> {
  const errors: Record<string, string> = {}
  checkPerson(input, errors)
  if (phoneDigitCount(input.phone) < 7) errors.phone = 'Enter a valid phone / WhatsApp number.'
  if (!input.country.trim()) errors.country = 'Country is required.'
  const age = parseAge(input.age)
  if (age === 'invalid') errors.age = 'Enter an age between 5 and 100.'
  if (!input.program.trim()) errors.program = 'Choose a program.'
  if (!includes(RECITATION_LEVELS, input.level)) errors.level = 'Select your current level.'
  const tajweed = orNull(input.tajweed_experience)
  if (tajweed !== null && !includes(TAJWEED_EXPERIENCE, tajweed)) {
    errors.tajweed_experience = 'Choose one of the options.'
  }
  return result(errors, () => ({
    full_name: input.full_name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    country: input.country.trim(),
    age: age as number | null,
    program_id: input.program === NOT_SURE_PROGRAM ? null : input.program.trim(),
    level: input.level as RecitationLevel,
    tajweed_experience: tajweed as TajweedExperience | null,
    additional_info: orNull(input.additional_info),
  }))
}

export function validateRegistration(input: RegistrationInput): ValidationResult<RegistrationInsert> {
  const errors: Record<string, string> = {}
  checkPerson(input, errors)
  if (!includes(REGISTRATION_KINDS, input.kind)) errors.kind = 'Unknown registration kind.'
  if (!input.program_id) errors.program_id = 'Missing program.'
  return result(errors, () => ({
    program_id: input.program_id,
    kind: input.kind,
    full_name: input.full_name.trim(),
    email: input.email.trim(),
    phone: orNull(input.phone),
  }))
}

export function validateContact(input: ContactInput): ValidationResult<ContactInsert> {
  const errors: Record<string, string> = {}
  checkPerson(input, errors)
  const subject = orNull(input.subject)
  if (subject !== null && !includes(CONTACT_SUBJECTS, subject)) errors.subject = 'Choose one of the topics.'
  const message = input.message.trim()
  if (message.length < MESSAGE_MIN) errors.message = `Message should be at least ${MESSAGE_MIN} characters.`
  else if (message.length > MESSAGE_MAX) errors.message = `Message should be at most ${MESSAGE_MAX} characters.`
  return result(errors, () => ({
    subject: subject as ContactSubject | null,
    full_name: input.full_name.trim(),
    email: input.email.trim(),
    phone: orNull(input.phone),
    message,
  }))
}

export function validateTestimonial(input: TestimonialInput): ValidationResult<TestimonialWrite> {
  const errors: Record<string, string> = {}
  if (input.quote.trim().length < QUOTE_MIN) errors.quote = `Add the quote (at least ${QUOTE_MIN} characters).`
  if (!input.name.trim()) errors.name = 'Add who said it.'
  return result(errors, () => ({
    quote: input.quote.trim(),
    name: input.name.trim(),
    session: orNull(input.session),
  }))
}

/**
 * Validates a program form. A draft only needs a title and a link, so staff
 * can save half-finished work; publishing needs the full set.
 */
export function validateProgram(input: ProgramInput, opts: { draft?: boolean } = {}): ValidationResult<ProgramWrite> {
  const draft = opts.draft ?? false
  const errors: Record<string, string> = {}
  if (!input.type.trim()) errors.type = 'Choose a type.'
  if (!input.title.trim()) errors.title = 'Title is required.'
  const slug = input.slug.trim()
  if (!slug) errors.slug = 'Link is required.'
  else if (!isValidSlug(slug)) errors.slug = 'Use lowercase letters, digits and single hyphens.'
  const description = input.description.trim()
  if (!draft && !description) errors.description = 'Add a description before publishing.'
  if (description.length > 5000) errors.description = 'Keep the description under 5000 characters.'
  if (!includes(PROGRAM_STATUSES, input.status)) errors.status = 'Choose a status.'

  const startsOn = orNull(input.starts_on)
  const endsOn = orNull(input.ends_on)
  if (startsOn && !DATE_RE.test(startsOn)) errors.starts_on = 'Use a valid date.'
  if (endsOn && !DATE_RE.test(endsOn)) errors.ends_on = 'Use a valid date.'
  else if (endsOn && !startsOn) errors.ends_on = 'Set a start date before an end date.'
  else if (endsOn && startsOn && endsOn < startsOn) errors.ends_on = 'End date must be on or after the start date.'

  const startTime = orNull(input.start_time)
  const endTime = orNull(input.end_time)
  if (startTime && !TIME_RE.test(startTime)) errors.start_time = 'Use a valid time.'
  if (endTime && !TIME_RE.test(endTime)) errors.end_time = 'Use a valid time.'
  else if (endTime && !startTime) errors.end_time = 'Set a start time before an end time.'
  else if (endTime && startTime && endTime <= startTime) errors.end_time = 'End time must be after the start time.'

  if (input.format_kind && !includes(PROGRAM_FORMAT_KINDS, input.format_kind)) errors.format_kind = 'Choose a format.'
  const location = orNull(input.location)
  if (!draft && !location) {
    if (input.format_kind === 'in_person') errors.location = 'Add where it takes place.'
    if (input.format_kind === 'online') errors.location = 'Choose the online platform.'
  }

  const extra = input.extra_details
    .map((d) => ({ label: d.label.trim(), value: d.value.trim() }))
    .filter((d) => d.label || d.value)
  if (extra.some((d) => !d.label || !d.value)) errors.extra_details = 'Each extra detail needs a label and a value.'

  return result(errors, () => ({
    type: input.type.trim(),
    title: input.title.trim(),
    slug,
    description,
    highlights: input.highlights.map((l) => l.trim()).filter(Boolean),
    starts_on: startsOn,
    ends_on: endsOn,
    start_time: startTime,
    end_time: endTime,
    time: startTime ? formatTimeRange(startTime, endTime) : orNull(input.legacy_time),
    duration: describeDuration(startsOn, endsOn),
    format: formatProgramFormat(input.format_kind, location),
    format_kind: input.format_kind || null,
    location,
    extra_details: extra,
    speaker: orNull(input.speaker),
    speaker_bio: orNull(input.speaker_bio),
    speaker_photo_url: orNull(input.speaker_photo_url),
    status: input.status,
    featured: draft ? false : input.featured,
    is_draft: draft,
  }))
}

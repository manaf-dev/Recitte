/** A program type's slug. Built-in types are fixed; staff can add more. */
export type ProgramType = string

/** Where a type is listed on the public site. */
export const PROGRAM_AREAS = ['academy', 'connect'] as const
export type ProgramArea = (typeof PROGRAM_AREAS)[number]

/** A row of `program_types`. */
export interface ProgramTypeRow {
  slug: ProgramType
  label: string
  area: ProgramArea
  builtin: boolean
}

/** The types every database ships with, so labels work before the list loads. */
export const BUILTIN_PROGRAM_TYPES: readonly ProgramTypeRow[] = [
  { slug: 'workshop', label: 'Workshop', area: 'academy', builtin: true },
  { slug: 'seminar', label: 'Monthly seminar', area: 'academy', builtin: true },
  { slug: 'course', label: 'Academy course', area: 'academy', builtin: true },
  { slug: 'event', label: 'Event', area: 'academy', builtin: true },
  { slug: 'community', label: 'Community', area: 'connect', builtin: true },
  { slug: 'challenge', label: "Qur'an challenge", area: 'connect', builtin: true },
]

/** Looks a type up in the fetched list, then the built-ins. */
export function findProgramType(slug: string, types: readonly ProgramTypeRow[] = []): ProgramTypeRow | undefined {
  return types.find((t) => t.slug === slug) ?? BUILTIN_PROGRAM_TYPES.find((t) => t.slug === slug)
}

/** The display name; an unknown slug falls back to the slug itself. */
export function programTypeLabel(slug: string, types: readonly ProgramTypeRow[] = []): string {
  return findProgramType(slug, types)?.label ?? slug
}

/** Unknown types are listed under Academy. */
export function programTypeArea(slug: string, types: readonly ProgramTypeRow[] = []): ProgramArea {
  return findProgramType(slug, types)?.area ?? 'academy'
}

/** Types a visitor can choose in the Academy application. */
export const APPLICATION_TYPES: readonly ProgramType[] = ['workshop', 'course']

export const PROGRAM_STATUSES = ['open', 'soon', 'closed'] as const
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number]

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  open: 'Registration open',
  soon: 'Coming soon',
  closed: 'Closed',
}

export const REGISTRATION_KINDS = ['register', 'notify', 'interest'] as const
export type RegistrationKind = (typeof REGISTRATION_KINDS)[number]

export const SUBMISSION_STATUSES = ['new', 'handled'] as const
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

export const STAFF_ROLES = ['super_admin', 'staff'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export const SOCIAL_PLATFORMS = ['whatsapp', 'instagram', 'facebook', 'tiktok', 'youtube', 'x', 'telegram'] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X',
  telegram: 'Telegram',
}

export const CONTACT_SUBJECTS = ['General', 'Recitte Academy', 'Community', 'Partnership'] as const
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number]

export const RECITATION_LEVELS = [
  'Beginner, cannot yet read Arabic',
  'Can read slowly with mistakes',
  'Read fluently, learning Tajweed',
  'Advanced, seeking ijazah',
] as const
export type RecitationLevel = (typeof RECITATION_LEVELS)[number]

export const TAJWEED_EXPERIENCE = ['None', 'Some informal learning', 'Formal Tajweed study'] as const
export type TajweedExperience = (typeof TAJWEED_EXPERIENCE)[number]

export const NOT_SURE_PROGRAM = 'Not sure, please advise'

export const APPLICATION_REPLY_DAYS = 3
export const CONTACT_REPLY_DAYS = 2

export const PROGRAM_FORMAT_KINDS = ['online', 'in_person'] as const
export type ProgramFormatKind = (typeof PROGRAM_FORMAT_KINDS)[number]

export const PROGRAM_FORMAT_LABELS: Record<ProgramFormatKind, string> = {
  online: 'Online',
  in_person: 'In person',
}

/** Where an online program meets. "Other" is typed in. */
export const ONLINE_PLATFORMS = ['Zoom', 'Google Meet', 'Microsoft Teams', 'WhatsApp', 'YouTube Live'] as const

export interface ProgramDetail {
  label: string
  value: string
}

/** A row of `programs`. Dates are `YYYY-MM-DD` calendar dates in Africa/Accra. */
export interface Program {
  id: string
  slug: string
  type: ProgramType
  title: string
  /** The one description: shown on cards, the page header and "About this program". */
  description: string
  highlights: string[]
  starts_on: string | null
  ends_on: string | null
  /** `HH:MM` wall-clock times in Africa/Accra. */
  start_time: string | null
  end_time: string | null
  /** Display text written from the dates and times; the public site shows these. */
  time: string | null
  duration: string | null
  format: string | null
  format_kind: ProgramFormatKind | null
  /** The venue, or the platform for an online program. */
  location: string | null
  extra_details: ProgramDetail[]
  speaker: string | null
  speaker_bio: string | null
  speaker_photo_url: string | null
  status: ProgramStatus
  featured: boolean
  /** Drafts are hidden from visitors. */
  is_draft: boolean
  created_at: string
  updated_at: string
}

export interface Testimonial {
  id: string
  quote: string
  name: string
  /** Admin-only note of which session the quote came from. Not shown publicly. */
  session: string | null
  created_at: string
}

/** The single `settings` row. Empty strings mean "not set". */
export interface Settings {
  hero_title: string
  hero_intro: string
  email: string
  phone: string
  whatsapp: string
  community_link: string
  updated_at: string
}

export interface SocialLink {
  platform: SocialPlatform
  url: string
  active: boolean
  sort_order: number
}

interface SubmissionBase {
  id: string
  created_at: string
  status: SubmissionStatus
  full_name: string
  email: string
}

export interface Application extends SubmissionBase {
  phone: string
  country: string
  age: number | null
  program_id: string | null
  /** Snapshot of the program title at submission, or NOT_SURE_PROGRAM. */
  program_title: string
  level: RecitationLevel
  tajweed_experience: TajweedExperience | null
  additional_info: string | null
}

export interface Registration extends SubmissionBase {
  program_id: string | null
  program_title: string
  kind: RegistrationKind
  phone: string | null
}

export interface Contact extends SubmissionBase {
  subject: ContactSubject | null
  phone: string | null
  message: string
}

export interface Staff {
  user_id: string
  email: string
  /** Null for people invited before names were collected. */
  first_name: string | null
  last_name: string | null
  role: StaffRole
  created_at: string
}

/* Form payloads, as typed by a visitor or staff member before validation. */

export interface ApplicationInput {
  full_name: string
  email: string
  phone: string
  country: string
  age: string | number | null
  /** A program id, or NOT_SURE_PROGRAM. */
  program: string
  level: string
  tajweed_experience: string
  additional_info: string
}

export interface RegistrationInput {
  program_id: string
  kind: RegistrationKind
  full_name: string
  email: string
  phone: string
}

export interface ContactInput {
  subject: string
  full_name: string
  email: string
  phone: string
  message: string
}

export interface TestimonialInput {
  quote: string
  name: string
  session: string
}

export interface ProgramInput {
  type: ProgramType
  title: string
  slug: string
  description: string
  highlights: string[]
  starts_on: string
  ends_on: string
  start_time: string
  end_time: string
  /** Duration text that replaces the one worked out from the dates. Empty means automatic. */
  duration_custom: string
  /** A time typed before times were structured; kept until the staff clear it. */
  legacy_time: string
  /** Empty for programs saved before formats were structured. */
  format_kind: ProgramFormatKind | ''
  location: string
  extra_details: ProgramDetail[]
  speaker: string
  speaker_bio: string
  speaker_photo_url: string | null
  status: ProgramStatus
  featured: boolean
}

/* Normalised rows ready to insert or update. */

export type ApplicationInsert = Pick<
  Application,
  'full_name' | 'email' | 'phone' | 'country' | 'age' | 'program_id' | 'level' | 'tajweed_experience' | 'additional_info'
>
export type RegistrationInsert = Pick<Registration, 'program_id' | 'kind' | 'full_name' | 'email' | 'phone'> & {
  program_id: string
}
export type ContactInsert = Pick<Contact, 'subject' | 'full_name' | 'email' | 'phone' | 'message'>
export type TestimonialWrite = Pick<Testimonial, 'quote' | 'name' | 'session'>
export type ProgramWrite = Omit<Program, 'id' | 'created_at' | 'updated_at'>

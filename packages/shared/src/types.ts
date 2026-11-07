export const PROGRAM_TYPES = ['workshop', 'seminar', 'course', 'community', 'challenge', 'event'] as const
export type ProgramType = (typeof PROGRAM_TYPES)[number]

export const PROGRAM_TYPE_LABELS: Record<ProgramType, string> = {
  workshop: 'Workshop',
  seminar: 'Monthly seminar',
  course: 'Academy course',
  community: 'Community',
  challenge: "Qur'an challenge",
  event: 'Event',
}

/** Types listed on Connect; everything else belongs to Academy. */
export const CONNECT_TYPES: readonly ProgramType[] = ['community', 'challenge']
export const ACADEMY_TYPES: readonly ProgramType[] = ['workshop', 'seminar', 'course', 'event']
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
  description: string
  about: string | null
  highlights: string[]
  starts_on: string | null
  ends_on: string | null
  time: string | null
  duration: string | null
  format: string | null
  extra_details: ProgramDetail[]
  speaker: string | null
  speaker_bio: string | null
  speaker_photo_url: string | null
  status: ProgramStatus
  featured: boolean
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
  about: string
  /** One highlight per line. */
  highlights: string
  starts_on: string
  ends_on: string
  time: string
  duration: string
  format: string
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

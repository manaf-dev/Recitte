// Subjects and plain-text bodies for submission emails. The acknowledgement
// repeats the reply window promised on the form; it never replaces the reply.

export type Inbox = 'applications' | 'registrations' | 'contacts'

export interface ApplicationRow {
  full_name: string
  email: string
  phone: string
  country: string
  age: number | null
  program_title: string
  level: string
  tajweed_experience: string | null
  additional_info: string | null
}

export interface RegistrationRow {
  full_name: string
  email: string
  phone: string | null
  program_title: string
  kind: 'register' | 'notify' | 'interest'
}

export interface ContactRow {
  full_name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
}

export type SubmissionRow =
  | { inbox: 'applications'; row: ApplicationRow }
  | { inbox: 'registrations'; row: RegistrationRow }
  | { inbox: 'contacts'; row: ContactRow }

export interface Email {
  subject: string
  text: string
}

export const APPLICATION_REPLY_DAYS = 3
export const CONTACT_REPLY_DAYS = 2

const KIND_LABEL = { register: 'Registration', notify: 'Notify request', interest: 'Interest' } as const

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

const lines = (pairs: [string, string | number | null | undefined][]) =>
  pairs
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

const SIGN_OFF = '\n\nThis is an automatic confirmation. A member of the Recitte team will reply to you personally.\n\nThe Recitte team'

/** The notice to the staff address in settings. */
export function staffNotice(s: SubmissionRow, adminUrl: string): Email {
  const link = adminUrl ? `\n\nOpen the admin: ${adminUrl.replace(/\/$/, '')}/${s.inbox === 'contacts' ? 'messages' : s.inbox}` : ''
  switch (s.inbox) {
    case 'applications': {
      const r = s.row
      return {
        subject: `New Academy application: ${r.full_name} · ${r.program_title}`,
        text:
          `A new application arrived in Applications.\n\n` +
          lines([
            ['Name', r.full_name],
            ['Program', r.program_title],
            ['Email', r.email],
            ['Phone / WhatsApp', r.phone],
            ['Country', r.country],
            ['Age', r.age],
            ['Recitation level', r.level],
            ['Tajweed experience', r.tajweed_experience],
            ['Additional information', r.additional_info],
          ]) +
          link,
      }
    }
    case 'registrations': {
      const r = s.row
      return {
        subject: `New ${KIND_LABEL[r.kind].toLowerCase()}: ${r.full_name} · ${r.program_title}`,
        text:
          `A new ${KIND_LABEL[r.kind].toLowerCase()} arrived in Registrations.\n\n` +
          lines([
            ['Name', r.full_name],
            ['Program', r.program_title],
            ['Type', KIND_LABEL[r.kind]],
            ['Email', r.email],
            ['Phone / WhatsApp', r.phone],
          ]) +
          link,
      }
    }
    case 'contacts': {
      const r = s.row
      return {
        subject: `New message: ${r.full_name} · ${r.subject ?? 'No subject'}`,
        text:
          `A new message arrived in Messages.\n\n` +
          lines([
            ['Name', r.full_name],
            ['Subject', r.subject ?? 'No subject'],
            ['Email', r.email],
            ['Phone / WhatsApp', r.phone],
          ]) +
          `\n\n${r.message}` +
          link,
      }
    }
  }
}

/** The short acknowledgement to the person who wrote in. */
export function acknowledgement(s: SubmissionRow): Email {
  const greeting = `Assalamu alaikum ${firstName(s.row.full_name)},\n\n`
  switch (s.inbox) {
    case 'applications':
      return {
        subject: 'We received your Recitte Academy application',
        text:
          greeting +
          `Thank you for applying to Recitte Academy for ${s.row.program_title}. ` +
          `Our team reviews every application and will reply within ${APPLICATION_REPLY_DAYS} working days, in shā' Allāh.` +
          SIGN_OFF,
      }
    case 'registrations': {
      const r = s.row
      if (r.kind === 'notify') {
        return {
          subject: `We'll let you know about ${r.program_title}`,
          text: greeting + `We've noted your request. We'll write to you when registration opens for ${r.program_title}.` + SIGN_OFF,
        }
      }
      return {
        subject: `Your place for ${r.program_title} is saved`,
        text: greeting + `We've saved your place for ${r.program_title}. Joining details will follow from the team.` + SIGN_OFF,
      }
    }
    case 'contacts':
      return {
        subject: 'We received your message',
        text:
          greeting +
          `Your message${s.row.subject ? ` about ${s.row.subject}` : ''} is with the Recitte team. ` +
          `We'll reply within ${CONTACT_REPLY_DAYS} working days, in shā' Allāh.` +
          SIGN_OFF,
      }
  }
}

import { json } from '../_shared/cors.ts'
import { acknowledgement, type Inbox, staffNotice, type SubmissionRow } from './email.ts'

const INBOXES: Inbox[] = ['applications', 'registrations', 'contacts']

export interface OutgoingEmail {
  from: string
  to: string
  replyTo?: string
  subject: string
  text: string
}

export interface NotifyDeps {
  /** Shared secret the database trigger sends in `x-notify-secret`. */
  webhookSecret: string
  resendApiKey: string
  resendFrom: string
  adminUrl: string
  loadSubmission(inbox: Inbox, id: string): Promise<SubmissionRow | null>
  loadStaffEmail(): Promise<string | null>
  send(email: OutgoingEmail): Promise<{ error?: string }>
  log(message: string, detail?: unknown): void
}

/**
 * Sends the staff notice and the visitor acknowledgement for one submission.
 * Runs after the row is committed, so nothing here can lose a submission:
 * missing configuration or a failed send is logged and the row stays.
 */
export function createNotifyHandler(deps: NotifyDeps) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
    if (!deps.webhookSecret || req.headers.get('x-notify-secret') !== deps.webhookSecret) {
      return json({ error: 'Unauthorized.' }, 401)
    }

    let body: { table?: unknown; id?: unknown }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Expected JSON.' }, 400)
    }
    const inbox = body.table as Inbox
    const id = typeof body.id === 'string' ? body.id : ''
    if (!INBOXES.includes(inbox) || !id) return json({ error: 'Expected { table, id }.' }, 400)

    if (!deps.resendApiKey || !deps.resendFrom) {
      deps.log(`Email is not configured (RESEND_API_KEY / RESEND_FROM); ${inbox} ${id} saved without email.`)
      return json({ skipped: 'email not configured' })
    }

    const submission = await deps.loadSubmission(inbox, id)
    if (!submission) {
      deps.log(`No ${inbox} row ${id}; it may have been deleted.`)
      return json({ skipped: 'row not found' })
    }

    const sent: string[] = []
    const failed: string[] = []
    const attempt = async (label: string, email: OutgoingEmail) => {
      try {
        const result = await deps.send(email)
        if (result.error) throw new Error(result.error)
        sent.push(label)
      } catch (error) {
        failed.push(label)
        deps.log(`Sending the ${label} email for ${inbox} ${id} failed`, error instanceof Error ? error.message : error)
      }
    }

    const staffEmail = await deps.loadStaffEmail()
    if (staffEmail) {
      await attempt('staff', {
        from: deps.resendFrom,
        to: staffEmail,
        replyTo: submission.row.email,
        ...staffNotice(submission, deps.adminUrl),
      })
    } else {
      deps.log('settings.email is empty; no staff notice sent.')
    }

    await attempt('acknowledgement', {
      from: deps.resendFrom,
      to: submission.row.email,
      replyTo: staffEmail ?? undefined,
      ...acknowledgement(submission),
    })

    return json({ sent, failed })
  }
}

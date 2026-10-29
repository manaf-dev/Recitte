import { serviceClient } from '../_shared/supabase.ts'
import type { Inbox, SubmissionRow } from './email.ts'
import { createNotifyHandler } from './handler.ts'

const admin = serviceClient()
const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''

Deno.serve(
  createNotifyHandler({
    webhookSecret: Deno.env.get('NOTIFY_WEBHOOK_SECRET') ?? '',
    resendApiKey,
    resendFrom: Deno.env.get('RESEND_FROM') ?? '',
    adminUrl: Deno.env.get('ADMIN_URL') ?? '',
    async loadSubmission(inbox: Inbox, id: string) {
      const { data } = await admin.from(inbox).select('*').eq('id', id).maybeSingle()
      return data ? ({ inbox, row: data } as SubmissionRow) : null
    },
    async loadStaffEmail() {
      const { data } = await admin.from('settings').select('email').eq('id', true).maybeSingle()
      return data?.email?.trim() || null
    },
    async send(email) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: email.from,
          to: [email.to],
          reply_to: email.replyTo,
          subject: email.subject,
          text: email.text,
        }),
      })
      if (res.ok) return {}
      return { error: `Resend ${res.status}: ${await res.text()}` }
    },
    log(message, detail) {
      console.error(`[notify-submission] ${message}`, detail ?? '')
    },
  }),
)

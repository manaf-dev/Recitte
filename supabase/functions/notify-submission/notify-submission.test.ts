import { describe, expect, it, vi } from 'vitest'
import { acknowledgement, type SubmissionRow } from './email.ts'
import { createNotifyHandler, type NotifyDeps } from './handler.ts'

const contact: SubmissionRow = {
  inbox: 'contacts',
  row: { full_name: 'Aisha Mohammed', email: 'aisha@example.com', phone: null, subject: 'Partnership', message: 'Assalamu alaikum, a question.' },
}
const application: SubmissionRow = {
  inbox: 'applications',
  row: {
    full_name: 'Bilal Osei',
    email: 'bilal@example.com',
    phone: '+233 20 123 4567',
    country: 'Ghana',
    age: null,
    program_title: 'Tajweed Essentials',
    level: 'Can read slowly with mistakes',
    tajweed_experience: null,
    additional_info: null,
  },
}
const registration = (kind: 'register' | 'notify' | 'interest'): SubmissionRow => ({
  inbox: 'registrations',
  row: { full_name: 'Yusuf', email: 'yusuf@example.com', phone: null, program_title: 'Monthly Seminar', kind },
})

function setup(overrides: Partial<NotifyDeps> = {}, row: SubmissionRow = contact) {
  const deps: NotifyDeps = {
    webhookSecret: 'shh',
    resendApiKey: 're_test',
    resendFrom: 'Recitte <hello@recitte.org>',
    adminUrl: 'https://admin.recitte.org',
    loadSubmission: vi.fn(async () => row),
    loadStaffEmail: vi.fn(async () => 'salman@recitte.org'),
    send: vi.fn(async () => ({})),
    log: vi.fn(),
    ...overrides,
  }
  return { deps, handle: createNotifyHandler(deps) }
}

const call = (body: unknown, secret = 'shh') =>
  new Request('http://localhost/notify-submission', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-notify-secret': secret },
    body: JSON.stringify(body),
  })

describe('notify-submission', () => {
  it('exits cleanly without sending when Resend is not configured', async () => {
    const { deps, handle } = setup({ resendApiKey: '' })
    const res = await handle(call({ table: 'contacts', id: 'c1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ skipped: 'email not configured' })
    expect(deps.send).not.toHaveBeenCalled()
    expect(deps.log).toHaveBeenCalled()
  })

  it('also skips without a from-address', async () => {
    const { deps, handle } = setup({ resendFrom: '' })
    expect((await handle(call({ table: 'contacts', id: 'c1' }))).status).toBe(200)
    expect(deps.send).not.toHaveBeenCalled()
  })

  it('sends a staff notice and an acknowledgement for a contact', async () => {
    const { deps, handle } = setup()
    const res = await handle(call({ table: 'contacts', id: 'c1' }))
    expect(await res.json()).toEqual({ sent: ['staff', 'acknowledgement'], failed: [] })
    expect(deps.send).toHaveBeenCalledTimes(2)
    const [staff, ack] = vi.mocked(deps.send).mock.calls.map((c) => c[0])
    expect(staff).toMatchObject({ to: 'salman@recitte.org', replyTo: 'aisha@example.com' })
    expect(staff!.subject).toContain('Aisha Mohammed')
    expect(staff!.subject).toContain('Partnership')
    expect(staff!.text).toContain('Messages')
    expect(ack).toMatchObject({ to: 'aisha@example.com', replyTo: 'salman@recitte.org' })
  })

  it('rejects a call without the shared secret', async () => {
    const { deps, handle } = setup()
    expect((await handle(call({ table: 'contacts', id: 'c1' }, 'wrong'))).status).toBe(401)
    expect(deps.loadSubmission).not.toHaveBeenCalled()
  })

  it('rejects an unknown table', async () => {
    const { handle } = setup()
    expect((await handle(call({ table: 'staff', id: 'x' }))).status).toBe(400)
  })

  it('logs a failed send and still answers 200 so nothing retries into duplicates', async () => {
    const send = vi.fn(async (e: { to: string }) => (e.to === 'salman@recitte.org' ? { error: 'Resend 500' } : {}))
    const { deps, handle } = setup({ send })
    const res = await handle(call({ table: 'contacts', id: 'c1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sent: ['acknowledgement'], failed: ['staff'] })
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining('staff'), 'Resend 500')
  })

  it('survives a send that throws', async () => {
    const { handle } = setup({ send: vi.fn(async () => Promise.reject(new Error('network'))) })
    expect(await (await handle(call({ table: 'contacts', id: 'c1' }))).json()).toEqual({
      sent: [],
      failed: ['staff', 'acknowledgement'],
    })
  })

  it('still acknowledges when the staff email is empty', async () => {
    const { deps, handle } = setup({ loadStaffEmail: vi.fn(async () => null) })
    await handle(call({ table: 'contacts', id: 'c1' }))
    expect(deps.send).toHaveBeenCalledTimes(1)
  })

  it('skips a row that no longer exists', async () => {
    const { deps, handle } = setup({ loadSubmission: vi.fn(async () => null) })
    expect(await (await handle(call({ table: 'contacts', id: 'gone' }))).json()).toEqual({ skipped: 'row not found' })
    expect(deps.send).not.toHaveBeenCalled()
  })
})

describe('acknowledgement copy', () => {
  it('promises 3 working days for an application and names the program', () => {
    const ack = acknowledgement(application)
    expect(ack.text).toContain('Assalamu alaikum Bilal')
    expect(ack.text).toContain('Tajweed Essentials')
    expect(ack.text).toContain('within 3 working days')
  })

  it('promises 2 working days for a contact message', () => {
    expect(acknowledgement(contact).text).toContain('within 2 working days')
  })

  it('confirms a registration without inventing a day count', () => {
    for (const kind of ['register', 'interest', 'notify'] as const) {
      const ack = acknowledgement(registration(kind))
      expect(ack.text).toContain('Monthly Seminar')
      expect(ack.text).not.toMatch(/working days/)
    }
    expect(acknowledgement(registration('notify')).text).toContain('when registration opens')
    expect(acknowledgement(registration('register')).text).toContain('saved your place')
  })

  it('says a person will still reply', () => {
    expect(acknowledgement(contact).text).toContain('will reply to you personally')
  })
})

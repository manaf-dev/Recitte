import {
  acceptsSignups,
  isProgramPast,
  validateApplication,
  validateContact,
  validateRegistration,
  type ApplicationInput,
  type ApplicationInsert,
  type ContactInput,
  type Program,
  type RegistrationInput,
} from '@recitte/shared'

/** The slice of the Supabase client the forms use. */
export interface InsertClient {
  from(table: 'applications' | 'registrations' | 'contacts'): {
    insert(row: object): PromiseLike<{ error: { message: string; code?: string } | null }>
  }
}

export type SubmitResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'invalid'; errors: Record<string, string> }
  | { ok: false; reason: 'ended' | 'closed' }
  | { ok: false; reason: 'failed' }

type Signup = Pick<Program, 'id' | 'type' | 'status' | 'starts_on' | 'ends_on'>

function refusal(program: Signup, today?: string): { ok: false; reason: 'ended' | 'closed' } | null {
  if (acceptsSignups(program, today)) return null
  return { ok: false, reason: isProgramPast(program, today) ? 'ended' : 'closed' }
}

async function insert<T extends object>(client: InsertClient, table: Parameters<InsertClient['from']>[0], row: T) {
  const { error } = await client.from(table).insert(row)
  if (!error) return { ok: true as const, value: row }
  console.error(`Saving to ${table} failed`, error.code, error.message)
  if (/has ended/i.test(error.message)) return { ok: false as const, reason: 'ended' as const }
  if (/is closed/i.test(error.message)) return { ok: false as const, reason: 'closed' as const }
  return { ok: false as const, reason: 'failed' as const }
}

/** Validates and stores an Academy application with status `new`. */
export async function submitApplication(
  client: InsertClient,
  input: ApplicationInput,
  programs: readonly Signup[],
  today?: string,
): Promise<SubmitResult<ApplicationInsert>> {
  const checked = validateApplication(input)
  if (!checked.ok) return { ok: false, reason: 'invalid', errors: checked.errors }
  const programId = checked.value.program_id
  if (programId) {
    const program = programs.find((p) => p.id === programId)
    if (!program) return { ok: false, reason: 'closed' }
    const refused = refusal(program, today)
    if (refused) return refused
  }
  return insert(client, 'applications', checked.value)
}

/** Validates and stores a registration (register, notify or interest). */
export async function submitRegistration(
  client: InsertClient,
  input: RegistrationInput,
  program: Signup,
  today?: string,
) {
  const refused = refusal(program, today)
  if (refused) return refused
  const checked = validateRegistration(input)
  if (!checked.ok) return { ok: false as const, reason: 'invalid' as const, errors: checked.errors }
  return insert(client, 'registrations', checked.value)
}

export async function submitContact(client: InsertClient, input: ContactInput) {
  const checked = validateContact(input)
  if (!checked.ok) return { ok: false as const, reason: 'invalid' as const, errors: checked.errors }
  return insert(client, 'contacts', checked.value)
}

export interface RegistrationOutcome {
  /** Whether the registration is stored. Never true unless the insert succeeded. */
  stored: boolean
  /** Open WhatsApp now (interest only, and only after a successful save). */
  openWhatsApp: boolean
  /** A WhatsApp link to offer on screen (interest only, saved or not). */
  whatsappUrl: string | null
}

/**
 * What the registration dialog does after a submit. Interest opens WhatsApp
 * once saved; if saving failed it still offers WhatsApp without claiming the
 * interest was stored. Notify and register never open WhatsApp.
 */
export function registrationOutcome(
  kind: RegistrationInput['kind'],
  result: { ok: boolean; reason?: string },
  whatsappUrl: string,
): RegistrationOutcome {
  const interest = kind === 'interest'
  if (result.ok) return { stored: true, openWhatsApp: interest, whatsappUrl: interest ? whatsappUrl : null }
  const offer = interest && result.reason === 'failed'
  return { stored: false, openWhatsApp: false, whatsappUrl: offer ? whatsappUrl : null }
}

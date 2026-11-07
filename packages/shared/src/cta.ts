import { isProgramPast } from './dates'
import type { DatedProgram } from './dates'
import { PROGRAM_STATUS_LABELS } from './types'
import type { ProgramStatus, ProgramType } from './types'

export type CtaAction = 'interest' | 'apply' | 'register' | 'notify' | 'join' | 'ended' | 'closed'

export interface ProgramLike extends DatedProgram {
  type: ProgramType
  status: ProgramStatus
}

export interface ProgramCta {
  action: CtaAction
  label: string
}

const REGISTER_CTA: ProgramCta = { action: 'register', label: 'Register to attend' }
const JOIN_CTA: ProgramCta = { action: 'join', label: 'Join on WhatsApp' }

const OPEN_CTA: Record<string, ProgramCta> = {
  workshop: { action: 'interest', label: "I'm interested" },
  seminar: { action: 'interest', label: "I'm interested" },
  course: { action: 'apply', label: 'Apply now' },
  event: REGISTER_CTA,
  challenge: REGISTER_CTA,
  community: JOIN_CTA,
}

/** The call to action for a program, per the design's past/status/type tables. */
export function programCta(program: ProgramLike, today?: string): ProgramCta {
  if (isProgramPast(program, today)) return { action: 'ended', label: 'Registration has ended' }
  if (program.status === 'closed') return { action: 'closed', label: 'Registration closed' }
  if (program.type === 'community') return JOIN_CTA
  if (program.status === 'soon') return { action: 'notify', label: 'Notify me' }
  // Types staff add themselves take registrations.
  return OPEN_CTA[program.type] ?? REGISTER_CTA
}

/** Whether a program can still take an application, registration or interest. */
export function acceptsSignups(program: ProgramLike, today?: string): boolean {
  return !isProgramPast(program, today) && program.status !== 'closed'
}

export function programStatusLabel(program: ProgramLike, today?: string): string {
  if (isProgramPast(program, today)) return 'Registration ended'
  return PROGRAM_STATUS_LABELS[program.status]
}

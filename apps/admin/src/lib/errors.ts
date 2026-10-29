/** The shape of a PostgREST / Storage error as returned by supabase-js. */
export interface DbError {
  code?: string
  message: string
  details?: string | null
}

/** Codes from Postgres and PostgREST mapped to sentences staff can act on. */
const DEFAULT_MESSAGES: Record<string, string> = {
  '23505': 'That value is already used.',
  '23514': 'The database rejected one of the values. Check the form and try again.',
  '42501': "You don't have permission to do that.",
  PGRST301: 'Your session has expired. Sign in again.',
  PGRST303: 'Your session has expired. Sign in again.',
}

/**
 * A human message for a failed query. `overrides` lets a screen say something
 * specific, such as "That slug is already used" for a unique violation.
 */
export function dbErrorMessage(error: DbError | null | undefined, overrides: Record<string, string> = {}): string {
  if (!error) return 'Something went wrong. Try again.'
  if (error.code && overrides[error.code]) return overrides[error.code]!
  if (error.code && DEFAULT_MESSAGES[error.code]) return DEFAULT_MESSAGES[error.code]!
  if (/failed to fetch|network|load failed/i.test(error.message)) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return error.message || 'Something went wrong. Try again.'
}

/** A human message for something thrown (usually a network failure). */
export function errorText(e: unknown): string {
  if (e instanceof Error) return dbErrorMessage({ message: e.message })
  return 'Something went wrong. Try again.'
}

/**
 * Edge Function errors from supabase-js: a FunctionsHttpError carries the
 * Response in `context`, and our functions answer `{ error: string }`.
 */
export async function functionErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: unknown }
      if (typeof body?.error === 'string' && body.error) return body.error
    } catch {
      // Not JSON: fall through to the generic message.
    }
  }
  if (error instanceof Error && error.message) {
    if (/failed to send a request|failed to fetch/i.test(error.message)) {
      return 'Could not reach the server. Check your connection and try again.'
    }
    return error.message
  }
  return 'Something went wrong. Try again.'
}

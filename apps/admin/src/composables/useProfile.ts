import { computed, ref } from 'vue'
import { isValidEmail, staffNameError } from '@recitte/shared'
import { supabase } from '@/lib/supabase'
import { dbErrorMessage, errorText, functionErrorMessage } from '@/lib/errors'
import { refreshAuthSession } from './useAuth'
import { updateStaffProfile, useStaffProfile } from './useStaffProfile'

export type NameField = 'first_name' | 'last_name'
export type EmailField = 'email' | 'current_password'

export type NameOutcome = { ok: true } | { ok: false; error: string; field?: NameField }

/**
 * `session`: the server no longer accepts the caller (401/403), so the view
 * signs them out. `uncertain`: the change may have half-happened, so the view
 * shows a page-level alert instead of a field error.
 */
export type EmailFailureReason = 'session' | 'uncertain'

export type EmailOutcome =
  | { ok: true; email: string }
  | { ok: false; error: string; field: EmailField; reason?: undefined }
  | { ok: false; error: string; reason: EmailFailureReason; field?: undefined }

type EmailFailure = Exclude<EmailOutcome, { ok: true }>

function errorStatus(error: unknown): number | undefined {
  const context = (error as { context?: unknown } | null)?.context
  return context instanceof Response ? context.status : undefined
}

/** Maps an update-email failure by status first, then by message. */
function emailFailure(status: number | undefined, message: string): EmailFailure {
  if (status === 401 || status === 403) return { ok: false, error: message, reason: 'session' }
  // Password throttling and auth rate limits both ask the person to wait before retyping the password.
  if (status === 429) return { ok: false, error: message, field: 'current_password' }
  if (status !== undefined && status >= 500 && /may have changed/i.test(message)) {
    return { ok: false, error: message, reason: 'uncertain' }
  }
  if ((status === 400 || status === 409) && /password/i.test(message)) {
    return { ok: false, error: message, field: 'current_password' }
  }
  return { ok: false, error: message, field: 'email' }
}

/**
 * The signed-in staff member's own profile: their name (written straight to
 * their `staff` row, which RLS allows for their own row only) and their sign-in
 * email (changed through the update-email Edge Function, which checks the
 * current password). Both update the cached profile so the header follows.
 */
export function useProfile() {
  const { profile } = useStaffProfile()

  const firstName = ref(profile.value?.first_name ?? '')
  const lastName = ref(profile.value?.last_name ?? '')
  const newEmail = ref('')
  const currentPassword = ref('')

  const nameChanged = computed(
    () =>
      firstName.value.trim() !== (profile.value?.first_name ?? '').trim() ||
      lastName.value.trim() !== (profile.value?.last_name ?? '').trim(),
  )

  async function saveName(): Promise<NameOutcome> {
    const userId = profile.value?.user_id
    if (!userId) return { ok: false, error: 'Your session has expired. Sign in again.' }
    const first = firstName.value.trim()
    const last = lastName.value.trim()
    const firstError = staffNameError(first, 'first')
    if (firstError) return { ok: false, error: firstError, field: 'first_name' }
    const lastError = staffNameError(last, 'last')
    if (lastError) return { ok: false, error: lastError, field: 'last_name' }
    try {
      const { data, error } = await supabase
        .from('staff')
        .update({ first_name: first, last_name: last })
        .eq('user_id', userId)
        .select('user_id')
      if (error) return { ok: false, error: dbErrorMessage(error) }
      // RLS filters out rows the caller may not change, so no row means nothing was saved.
      if (!Array.isArray(data) || data.length === 0) {
        return { ok: false, error: "You don't have permission to do that." }
      }
    } catch (e) {
      return { ok: false, error: errorText(e) }
    }
    firstName.value = first
    lastName.value = last
    updateStaffProfile({ first_name: first, last_name: last })
    return { ok: true }
  }

  async function changeEmail(): Promise<EmailOutcome> {
    const address = newEmail.value.trim().toLowerCase()
    const password = currentPassword.value
    if (!isValidEmail(address)) return { ok: false, error: 'Enter a valid email address.', field: 'email' }
    if (address === profile.value?.email.trim().toLowerCase()) {
      return { ok: false, error: 'That is already your email.', field: 'email' }
    }
    if (!password) return { ok: false, error: 'Enter your current password.', field: 'current_password' }
    let saved = address
    try {
      const { data, error } = await supabase.functions.invoke('update-email', {
        body: { email: address, current_password: password },
      })
      if (error) return emailFailure(errorStatus(error), await functionErrorMessage(error))
      const body = data as { email?: unknown } | null
      if (typeof body?.email === 'string' && body.email) saved = body.email
    } catch (e) {
      const message = await functionErrorMessage(e)
      return { ok: false, error: message, field: 'email' }
    }
    currentPassword.value = ''
    newEmail.value = ''
    updateStaffProfile({ email: saved })
    await refreshAuthSession()
    return { ok: true, email: saved }
  }

  return { profile, firstName, lastName, newEmail, currentPassword, nameChanged, saveName, changeEmail }
}

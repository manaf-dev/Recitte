import { ref, shallowRef } from 'vue'
import { isValidEmail, STAFF_ROLES, staffNameError, type Staff, type StaffRole } from '@recitte/shared'
import { supabase } from '@/lib/supabase'
import { dbErrorMessage, errorText, functionErrorMessage } from '@/lib/errors'

type Outcome = { ok: true } | { ok: false; error: string }

/** What invite-staff answers with. No email goes out: the super admin shares `invite_url`. */
export interface InviteResult {
  user_id: string
  email: string
  role: StaffRole
  first_name: string
  last_name: string
  invite_url: string
}

/** The invite form field an error belongs to, when it was caught before calling the server. */
export type InviteField = 'first_name' | 'last_name' | 'email' | 'role'

type InviteOutcome = { ok: true; invite: InviteResult } | { ok: false; error: string; field?: InviteField }

/** Points a name error from invite-staff (e.g. "Enter a first name.") at its field. */
function serverErrorField(message: string): InviteField | undefined {
  const text = message.toLowerCase()
  if (text.includes('first name')) return 'first_name'
  if (text.includes('last name')) return 'last_name'
  return undefined
}

/**
 * The super admin's staff screen. Reads go through RLS (only a super admin can
 * list every row); invites and removals go through the Edge Functions, which
 * check the caller's role again and hold the service role.
 */
export function useStaffAdmin() {
  const staff = shallowRef<Staff[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const { data, error: err } = await supabase
        .from('staff')
        .select('user_id, email, first_name, last_name, role, created_at')
        .order('created_at', { ascending: true })
      if (err) {
        error.value = dbErrorMessage(err)
        return
      }
      staff.value = (data ?? []) as Staff[]
      loaded.value = true
    } catch (e) {
      error.value = errorText(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Creates the invite and returns its one-time link. The link is only handed
   * back to the caller; nothing here stores it.
   */
  async function invite(email: string, role: StaffRole, firstName: string, lastName: string): Promise<InviteOutcome> {
    const first = firstName.trim()
    const last = lastName.trim()
    const address = email.trim().toLowerCase()
    const firstError = staffNameError(first, 'first')
    if (firstError) return { ok: false, error: firstError, field: 'first_name' }
    const lastError = staffNameError(last, 'last')
    if (lastError) return { ok: false, error: lastError, field: 'last_name' }
    if (!isValidEmail(address)) return { ok: false, error: 'Enter a valid email address.', field: 'email' }
    if (!STAFF_ROLES.includes(role)) return { ok: false, error: 'Choose a role.', field: 'role' }
    let result: InviteResult
    try {
      const { data, error: err } = await supabase.functions.invoke('invite-staff', {
        body: { email: address, role, first_name: first, last_name: last },
      })
      if (err) {
        const message = await functionErrorMessage(err)
        return { ok: false, error: message, field: serverErrorField(message) }
      }
      const body = data as Partial<InviteResult> | null
      if (!body || typeof body.invite_url !== 'string' || !body.invite_url) {
        return { ok: false, error: 'The server did not send back an invite link. Try again.' }
      }
      result = {
        user_id: String(body.user_id ?? ''),
        email: typeof body.email === 'string' ? body.email : address,
        role: body.role && STAFF_ROLES.includes(body.role) ? body.role : role,
        first_name: typeof body.first_name === 'string' && body.first_name ? body.first_name : first,
        last_name: typeof body.last_name === 'string' && body.last_name ? body.last_name : last,
        invite_url: body.invite_url,
      }
    } catch (e) {
      return { ok: false, error: await functionErrorMessage(e) }
    }
    await load()
    return { ok: true, invite: result }
  }

  /** Removes an invited person. The caller asks for confirmation first. */
  async function remove(member: Staff): Promise<Outcome> {
    try {
      const { error: err } = await supabase.functions.invoke('remove-staff', { body: { user_id: member.user_id } })
      if (err) return { ok: false, error: await functionErrorMessage(err) }
    } catch (e) {
      return { ok: false, error: await functionErrorMessage(e) }
    }
    staff.value = staff.value.filter((s) => s.user_id !== member.user_id)
    return { ok: true }
  }

  return { staff, loading, loaded, error, load, invite, remove }
}

import { ref, shallowRef } from 'vue'
import { isValidEmail, type Staff } from '@recitte/shared'
import { supabase } from '@/lib/supabase'
import { dbErrorMessage, errorText, functionErrorMessage } from '@/lib/errors'

type Outcome = { ok: true } | { ok: false; error: string }

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
        .select('user_id, email, role, created_at')
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

  async function invite(email: string): Promise<Outcome> {
    const address = email.trim().toLowerCase()
    if (!isValidEmail(address)) return { ok: false, error: 'Enter a valid email address.' }
    try {
      const { error: err } = await supabase.functions.invoke('invite-staff', { body: { email: address } })
      if (err) return { ok: false, error: await functionErrorMessage(err) }
    } catch (e) {
      return { ok: false, error: await functionErrorMessage(e) }
    }
    await load()
    return { ok: true }
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

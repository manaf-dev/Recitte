import { computed, readonly, shallowRef } from 'vue'
import type { Staff } from '@recitte/shared'
import { supabase } from '@/lib/supabase'
import { dbErrorMessage } from '@/lib/errors'

export interface StaffProfileResult {
  profile: Staff | null
  /** Set when the lookup itself failed, as opposed to "no staff row". */
  error: string | null
}

const profile = shallowRef<Staff | null>(null)
let loadedFor: string | null = null
let pending: { userId: string; promise: Promise<StaffProfileResult> } | null = null

/**
 * Loads the signed-in user's own `staff` row (RLS lets everyone read their own).
 * Cached per user so route changes do not refetch it.
 */
export function loadStaffProfile(userId: string): Promise<StaffProfileResult> {
  if (loadedFor === userId && profile.value) return Promise.resolve({ profile: profile.value, error: null })
  if (pending?.userId === userId) return pending.promise

  const promise = (async (): Promise<StaffProfileResult> => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('user_id, email, first_name, last_name, role, created_at')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) return { profile: null, error: dbErrorMessage(error) }
      profile.value = (data as Staff | null) ?? null
      loadedFor = profile.value ? userId : null
      return { profile: profile.value, error: null }
    } catch (e) {
      return { profile: null, error: e instanceof Error ? e.message : 'Could not check your access.' }
    } finally {
      pending = null
    }
  })()
  pending = { userId, promise }
  return promise
}

/**
 * Applies a change the signed-in user just saved (their name or email) to the
 * cached row, so the header and account menu update without a reload.
 */
export function updateStaffProfile(patch: Partial<Pick<Staff, 'email' | 'first_name' | 'last_name'>>) {
  if (!profile.value) return
  profile.value = { ...profile.value, ...patch }
}

export function clearStaffProfile() {
  profile.value = null
  loadedFor = null
  pending = null
}

export function useStaffProfile() {
  return {
    profile: readonly(profile),
    isSuperAdmin: computed(() => profile.value?.role === 'super_admin'),
  }
}

import { computed, ref, shallowRef, type Ref } from 'vue'
import type { Application, Contact, Registration, SubmissionStatus } from '@recitte/shared'
import { supabase } from '@/lib/supabase'
import { dbErrorMessage, errorText } from '@/lib/errors'

export type SubmissionTable = 'applications' | 'registrations' | 'contacts'
export type Submission = Application | Registration | Contact
export type StatusFilter = SubmissionStatus | 'all'

/** How a page turns one row into a heading and labelled fields. */
export interface SubmissionField {
  label: string
  value: string | number | null | undefined
  /** mailto:, tel: … */
  href?: string
  /** Long text that gets its own full-width line. */
  wide?: boolean
}

export interface SubmissionView {
  heading: string
  subheading?: string
  fields: SubmissionField[]
}

type Outcome = { ok: true } | { ok: false; error: string }

/** One inbox: newest first, with status changes and deletes. */
export function useSubmissions<T extends Submission>(table: SubmissionTable) {
  const rows = shallowRef<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  const filter = ref<StatusFilter>('all')
  const busy = ref(new Set<string>())

  const counts = computed(() => ({
    all: rows.value.length,
    new: rows.value.filter((r) => r.status === 'new').length,
    handled: rows.value.filter((r) => r.status === 'handled').length,
  }))

  const visible = computed(() =>
    filter.value === 'all' ? rows.value : rows.value.filter((r) => r.status === filter.value),
  )

  async function withBusy(id: string, fn: () => Promise<Outcome>): Promise<Outcome> {
    busy.value = new Set(busy.value).add(id)
    try {
      return await fn()
    } catch (e) {
      return { ok: false, error: errorText(e) }
    } finally {
      const next = new Set(busy.value)
      next.delete(id)
      busy.value = next
    }
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const { data, error: err } = await supabase.from(table).select('*').order('created_at', { ascending: false })
      if (err) {
        error.value = dbErrorMessage(err)
        return
      }
      rows.value = (data ?? []) as T[]
      loaded.value = true
    } catch (e) {
      error.value = errorText(e)
    } finally {
      loading.value = false
    }
  }

  function setStatus(row: T, status: SubmissionStatus): Promise<Outcome> {
    return withBusy(row.id, async () => {
      // `.single()` makes "no row changed" (deleted elsewhere, access lost) an error.
      const { error: err } = await supabase.from(table).update({ status }).eq('id', row.id).select('id').single()
      if (err) return { ok: false, error: dbErrorMessage(err) }
      rows.value = rows.value.map((r) => (r.id === row.id ? { ...r, status } : r))
      return { ok: true }
    })
  }

  /** new ↔ handled. */
  function toggleStatus(row: T): Promise<Outcome> {
    return setStatus(row, row.status === 'new' ? 'handled' : 'new')
  }

  /** Deletes the row. The caller asks for confirmation first. */
  function remove(row: T): Promise<Outcome> {
    return withBusy(row.id, async () => {
      const { error: err } = await supabase.from(table).delete().eq('id', row.id)
      if (err) return { ok: false, error: dbErrorMessage(err) }
      rows.value = rows.value.filter((r) => r.id !== row.id)
      return { ok: true }
    })
  }

  return { rows, visible, counts, filter, loading, loaded, error, busy, load, setStatus, toggleStatus, remove }
}

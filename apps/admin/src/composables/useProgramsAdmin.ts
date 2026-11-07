import { ref, shallowRef } from 'vue'
import {
  isProgramPast,
  todayInAccra,
  validateProgram,
  type Program,
  type ProgramStatus,
  type ProgramWrite,
} from '@recitte/shared'
import { supabase } from '@/lib/supabase'
import { dbErrorMessage, errorText, type DbError } from '@/lib/errors'
import { programToInput } from './useProgramForm'
import { removeSpeakerPhoto, uploadSpeakerPhoto } from './useSpeakerUpload'

export const NEXT_STATUS: Record<ProgramStatus, ProgramStatus> = {
  open: 'soon',
  soon: 'closed',
  closed: 'open',
}

/** Messages specific to programs, on top of the generic database ones. */
export const PROGRAM_ERRORS = { '23505': 'That slug is already used. Choose another.' }

export type Outcome<T = void> = { ok: true; value: T } | { ok: false; error: string; code?: string }

/**
 * Current and upcoming programs first (soonest date first, undated after
 * dated), then past programs, most recent first.
 */
export function sortProgramsForAdmin(programs: Program[], today = todayInAccra()): Program[] {
  const upcoming = programs.filter((p) => !isProgramPast(p, today))
  const past = programs.filter((p) => isProgramPast(p, today))
  upcoming.sort((a, b) => {
    if (a.starts_on && b.starts_on) return a.starts_on.localeCompare(b.starts_on)
    if (a.starts_on) return -1
    if (b.starts_on) return 1
    return b.created_at.localeCompare(a.created_at)
  })
  past.sort((a, b) => (b.ends_on ?? b.starts_on ?? '').localeCompare(a.ends_on ?? a.starts_on ?? ''))
  return [...upcoming, ...past]
}

function fail<T>(error: DbError): Outcome<T> {
  return { ok: false, error: dbErrorMessage(error, PROGRAM_ERRORS), code: error.code }
}

export async function fetchProgram(id: string): Promise<Outcome<Program | null>> {
  try {
    const { data, error } = await supabase.from('programs').select('*').eq('id', id).maybeSingle()
    if (error) return fail(error)
    return { ok: true, value: (data as Program | null) ?? null }
  } catch (e) {
    return { ok: false, error: errorText(e) }
  }
}

export async function createProgram(write: ProgramWrite): Promise<Outcome<Program>> {
  try {
    const { data, error } = await supabase.from('programs').insert(write).select('*').single()
    if (error) return fail(error)
    return { ok: true, value: data as Program }
  } catch (e) {
    return { ok: false, error: errorText(e) }
  }
}

export async function updateProgram(id: string, patch: Partial<ProgramWrite>): Promise<Outcome<Program>> {
  try {
    const { data, error } = await supabase.from('programs').update(patch).eq('id', id).select('*').single()
    if (error) return fail(error)
    return { ok: true, value: data as Program }
  } catch (e) {
    return { ok: false, error: errorText(e) }
  }
}

export function useProgramsAdmin() {
  const programs = shallowRef<Program[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  /** Ids of rows with a request in flight, so their buttons can be disabled. */
  const busy = ref(new Set<string>())

  function replace(row: Program) {
    programs.value = programs.value.map((p) => (p.id === row.id ? row : p))
  }

  async function withBusy<T>(id: string, fn: () => Promise<T>): Promise<T> {
    busy.value = new Set(busy.value).add(id)
    try {
      return await fn()
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
      const { data, error: err } = await supabase.from('programs').select('*')
      if (err) {
        error.value = dbErrorMessage(err)
        return
      }
      programs.value = sortProgramsForAdmin((data ?? []) as Program[])
      loaded.value = true
    } catch (e) {
      error.value = errorText(e)
    } finally {
      loading.value = false
    }
  }

  async function patch(program: Program, change: Partial<ProgramWrite>): Promise<Outcome> {
    return withBusy(program.id, async () => {
      const result = await updateProgram(program.id, change)
      if (!result.ok) return result
      replace(result.value)
      return { ok: true, value: undefined }
    })
  }

  function cycleStatus(program: Program) {
    return patch(program, { status: NEXT_STATUS[program.status] })
  }

  /** Publishing runs the same checks as the form, so a half-finished draft cannot go live. */
  async function publish(program: Program): Promise<Outcome> {
    const checked = validateProgram(programToInput(program))
    if (!checked.ok) {
      const first = Object.values(checked.errors)[0] ?? 'It is not complete.'
      return { ok: false, error: `“${program.title}” cannot be published yet. ${first} Open it to finish.` }
    }
    return patch(program, { is_draft: false })
  }

  function toggleFeatured(program: Program) {
    return patch(program, { featured: !program.featured })
  }

  async function replacePhoto(program: Program, file: File): Promise<Outcome> {
    return withBusy(program.id, async () => {
      let url: string
      try {
        url = await uploadSpeakerPhoto(file, program.id)
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'The photo could not be uploaded.' }
      }
      const result = await updateProgram(program.id, { speaker_photo_url: url })
      if (!result.ok) {
        await removeSpeakerPhoto(url)
        return result
      }
      replace(result.value)
      await removeSpeakerPhoto(program.speaker_photo_url)
      return { ok: true, value: undefined }
    })
  }

  /** Deletes the program. The caller asks for confirmation first. */
  async function remove(program: Program): Promise<Outcome> {
    return withBusy(program.id, async () => {
      try {
        const { error: err } = await supabase.from('programs').delete().eq('id', program.id)
        if (err) return fail(err)
      } catch (e) {
        return { ok: false, error: errorText(e) }
      }
      programs.value = programs.value.filter((p) => p.id !== program.id)
      await removeSpeakerPhoto(program.speaker_photo_url)
      return { ok: true, value: undefined }
    })
  }

  return { programs, loading, loaded, error, busy, load, cycleStatus, toggleFeatured, publish, replacePhoto, remove }
}

import { computed, ref } from 'vue'
import { BUILTIN_PROGRAM_TYPES, suggestSlug, type ProgramArea, type ProgramTypeRow } from '@recitte/shared'
import { supabase } from '@/lib/supabase'
import { dbErrorMessage, errorText } from '@/lib/errors'
import type { Outcome } from './useProgramsAdmin'

/**
 * The program types staff can pick from: the built-ins plus any they added.
 * Adding one writes a row to `program_types`; the public site picks it up
 * with the area (Academy or Connect) chosen here.
 */
export function useProgramTypes() {
  const custom = ref<ProgramTypeRow[]>([])
  const loadError = ref('')

  /** Built-ins first, then custom types by name. */
  const types = computed<ProgramTypeRow[]>(() => [
    ...BUILTIN_PROGRAM_TYPES,
    ...[...custom.value].sort((a, b) => a.label.localeCompare(b.label)),
  ])

  async function load() {
    loadError.value = ''
    try {
      const { data, error } = await supabase.from('program_types').select('slug, label, area, builtin')
      if (error) {
        loadError.value = dbErrorMessage(error)
        return
      }
      custom.value = ((data ?? []) as ProgramTypeRow[]).filter((t) => !t.builtin)
    } catch (e) {
      loadError.value = errorText(e)
    }
  }

  async function add(label: string, area: ProgramArea): Promise<Outcome<ProgramTypeRow>> {
    const name = label.trim().replace(/\s+/g, ' ')
    if (!name) return { ok: false, error: 'Give the type a name.' }
    if (types.value.some((t) => t.label.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: 'There is already a type with that name.' }
    }
    const slug = suggestSlug(name).slice(0, 60).replace(/-+$/, '')
    if (!slug) return { ok: false, error: 'Use letters or digits in the name.' }
    if (types.value.some((t) => t.slug === slug)) {
      return { ok: false, error: 'There is already a type with a very similar name.' }
    }
    try {
      const { data, error } = await supabase
        .from('program_types')
        .insert({ slug, label: name, area })
        .select('slug, label, area, builtin')
        .single()
      if (error) return { ok: false, error: dbErrorMessage(error), code: error.code }
      const row = data as ProgramTypeRow
      custom.value = [...custom.value, row]
      return { ok: true, value: row }
    } catch (e) {
      return { ok: false, error: errorText(e) }
    }
  }

  return { types, loadError, load, add }
}

import { computed, ref } from 'vue'
import { BUILTIN_PROGRAM_TYPES, suggestSlug, type ProgramArea, type ProgramTypeRow } from '@recitte/shared'
import { supabase } from '@/lib/supabase'
import { dbErrorMessage, errorText } from '@/lib/errors'
import type { Outcome } from './useProgramsAdmin'

const TYPE_ERRORS = {
  '23503': 'Programs still use this type. Move them to another type first.',
  '23505': 'There is already a type with that name.',
}

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

  /** A slug from the name; names with no Latin letters (Arabic, say) get a generated one. */
  function slugFor(name: string): string {
    const base = suggestSlug(name).slice(0, 56).replace(/-+$/, '') || `type-${Math.random().toString(36).slice(2, 8)}`
    let slug = base
    for (let n = 2; types.value.some((t) => t.slug === slug); n++) slug = `${base}-${n}`
    return slug
  }

  async function add(label: string, area: ProgramArea): Promise<Outcome<ProgramTypeRow>> {
    const name = label.trim().replace(/\s+/g, ' ')
    if (!name) return { ok: false, error: 'Give the type a name.' }
    if (types.value.some((t) => t.label.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: 'There is already a type with that name.' }
    }
    const slug = slugFor(name)
    try {
      const { data, error } = await supabase
        .from('program_types')
        .insert({ slug, label: name, area })
        .select('slug, label, area, builtin')
        .single()
      if (error) return { ok: false, error: dbErrorMessage(error, TYPE_ERRORS), code: error.code }
      const row = data as ProgramTypeRow
      custom.value = [...custom.value, row]
      return { ok: true, value: row }
    } catch (e) {
      return { ok: false, error: errorText(e) }
    }
  }

  /** Renames a custom type or moves it between Academy and Connect. The link name never changes. */
  async function update(slug: string, label: string, area: ProgramArea): Promise<Outcome<ProgramTypeRow>> {
    const name = label.trim().replace(/\s+/g, ' ')
    if (!name) return { ok: false, error: 'Give the type a name.' }
    try {
      const { data, error } = await supabase
        .from('program_types')
        .update({ label: name, area })
        .eq('slug', slug)
        .select('slug, label, area, builtin')
        .maybeSingle()
      if (error) return { ok: false, error: dbErrorMessage(error, TYPE_ERRORS), code: error.code }
      if (!data) return { ok: false, error: 'That type could not be changed.' }
      const row = data as ProgramTypeRow
      custom.value = custom.value.map((t) => (t.slug === slug ? row : t))
      return { ok: true, value: row }
    } catch (e) {
      return { ok: false, error: errorText(e) }
    }
  }

  /** Deletes a custom type that no program uses. The caller asks for confirmation first. */
  async function remove(slug: string): Promise<Outcome> {
    try {
      const { data, error } = await supabase.from('program_types').delete().eq('slug', slug).select('slug')
      if (error) return { ok: false, error: dbErrorMessage(error, TYPE_ERRORS), code: error.code }
      if (!data?.length) return { ok: false, error: 'That type could not be deleted.' }
      custom.value = custom.value.filter((t) => t.slug !== slug)
      return { ok: true, value: undefined }
    } catch (e) {
      return { ok: false, error: errorText(e) }
    }
  }

  return { types, loadError, load, add, update, remove }
}

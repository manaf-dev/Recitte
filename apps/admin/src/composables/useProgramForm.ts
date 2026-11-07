import { computed, reactive, ref, watch } from 'vue'
import { describeDuration, suggestSlug, validateProgram, type Program, type ProgramInput, type ProgramWrite } from '@recitte/shared'

import { fieldsFor } from '@/lib/programFields'

export function emptyProgramInput(): ProgramInput {
  return {
    type: 'workshop',
    title: '',
    slug: '',
    description: '',
    highlights: [''],
    starts_on: '',
    ends_on: '',
    start_time: '',
    end_time: '',
    legacy_time: '',
    format_kind: '',
    location: '',
    extra_details: [],
    speaker: '',
    speaker_bio: '',
    speaker_photo_url: null,
    status: 'open',
    // New programs are not featured until staff choose to.
    featured: false,
  }
}

export function programToInput(p: Program): ProgramInput {
  return {
    type: p.type,
    title: p.title,
    slug: p.slug,
    description: p.description,
    highlights: p.highlights.length ? [...p.highlights] : [''],
    starts_on: p.starts_on ?? '',
    ends_on: p.ends_on ?? '',
    start_time: (p.start_time ?? '').slice(0, 5),
    end_time: (p.end_time ?? '').slice(0, 5),
    legacy_time: p.start_time ? '' : (p.time ?? ''),
    format_kind: p.format_kind ?? '',
    location: p.location ?? '',
    extra_details: p.extra_details.map((d) => ({ ...d })),
    speaker: p.speaker ?? '',
    speaker_bio: p.speaker_bio ?? '',
    speaker_photo_url: p.speaker_photo_url,
    status: p.status,
    featured: p.featured,
  }
}

/**
 * Form state for adding or editing a program.
 *
 * For a new program the slug follows the title (via `suggestSlug`) until the
 * staff member types in the slug field. For an existing program the slug never
 * follows the title, so a published link does not change by accident.
 */
export function useProgramForm(existing?: Program | null) {
  const form = reactive<ProgramInput>(existing ? programToInput(existing) : emptyProgramInput())
  const slugEdited = ref(Boolean(existing))
  const errors = ref<Record<string, string>>({})

  watch(
    () => form.title,
    (title) => {
      if (!slugEdited.value) form.slug = suggestSlug(title)
    },
    { flush: 'sync' },
  )

  /** Call from the slug field's input event. */
  function editSlug(value: string) {
    slugEdited.value = true
    form.slug = value
  }

  /** Worked out from the dates: nothing to type. */
  const duration = computed(() => describeDuration(form.starts_on || null, form.ends_on || null))

  function addHighlight() {
    form.highlights.push('')
  }

  function removeHighlight(index: number) {
    form.highlights.splice(index, 1)
    if (!form.highlights.length) form.highlights.push('')
  }

  function addDetail() {
    form.extra_details.push({ label: '', value: '' })
  }

  function removeDetail(index: number) {
    form.extra_details.splice(index, 1)
  }

  /**
   * Validates with the shared rules; on success returns the row to write.
   * A draft only needs a title and link.
   */
  function validate(opts: { draft?: boolean } = {}): ProgramWrite | null {
    const result = validateProgram(form, opts)
    if (!result.ok) {
      errors.value = result.errors
      return null
    }
    errors.value = {}
    // Only types with a duration row show one.
    if (!fieldsFor(form.type).duration) result.value.duration = null
    return result.value
  }

  return { form, slugEdited, errors, duration, editSlug, addHighlight, removeHighlight, addDetail, removeDetail, validate }
}

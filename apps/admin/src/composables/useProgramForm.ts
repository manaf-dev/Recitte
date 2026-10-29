import { reactive, ref, watch } from 'vue'
import { suggestSlug, validateProgram, type Program, type ProgramInput, type ProgramWrite } from '@recitte/shared'

export function emptyProgramInput(): ProgramInput {
  return {
    type: 'workshop',
    title: '',
    slug: '',
    description: '',
    about: '',
    highlights: '',
    starts_on: '',
    ends_on: '',
    time: '',
    duration: '',
    format: '',
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
    about: p.about ?? '',
    highlights: p.highlights.join('\n'),
    starts_on: p.starts_on ?? '',
    ends_on: p.ends_on ?? '',
    time: p.time ?? '',
    duration: p.duration ?? '',
    format: p.format ?? '',
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

  function addDetail() {
    form.extra_details.push({ label: '', value: '' })
  }

  function removeDetail(index: number) {
    form.extra_details.splice(index, 1)
  }

  /** Validates with the shared rules; on success returns the row to write. */
  function validate(): ProgramWrite | null {
    const result = validateProgram(form)
    if (!result.ok) {
      errors.value = result.errors
      return null
    }
    errors.value = {}
    return result.value
  }

  return { form, slugEdited, errors, editSlug, addDetail, removeDetail, validate }
}

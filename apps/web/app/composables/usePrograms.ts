import { todayInAccra, type Program, type ProgramTypeRow } from '@recitte/shared'

/** Every program, loaded once per request and shared by all pages. */
export function usePrograms() {
  const asyncData = useAsyncData(
    'programs',
    async () => {
      const { data, error } = await useSupabaseClient().from('programs').select('*').eq('is_draft', false).returns<Program[]>()
      if (error) throw createError({ statusCode: 503, statusMessage: 'Programs are unavailable right now.' })
      return data ?? []
    },
    { default: () => [] as Program[] },
  )
  const typesData = useAsyncData(
    'program-types',
    async () => {
      const { data, error } = await useSupabaseClient().from('program_types').select('slug,label,area,builtin').returns<ProgramTypeRow[]>()
      // Without the types, custom Connect types would be filed under Academy.
      if (error) throw createError({ statusCode: 503, statusMessage: 'Programs are unavailable right now.' })
      return data ?? []
    },
    { default: () => [] as ProgramTypeRow[] },
  )
  const { data, status } = asyncData
  return {
    programs: computed(() => data.value ?? []),
    types: computed(() => typesData.data.value ?? []),
    error: computed(() => asyncData.error.value ?? typesData.error.value),
    status,
    /** Today in Africa/Accra, the reference for "past". */
    today: todayInAccra(),
    /** Resolves once the list has loaded (or failed). */
    ready: Promise.all([asyncData, typesData]).then(() => undefined),
  }
}

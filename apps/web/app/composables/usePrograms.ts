import { todayInAccra, type Program } from '@recitte/shared'

/** Every program, loaded once per request and shared by all pages. */
export function usePrograms() {
  const asyncData = useAsyncData(
    'programs',
    async () => {
      const { data, error } = await useSupabaseClient().from('programs').select('*').returns<Program[]>()
      if (error) throw createError({ statusCode: 503, statusMessage: 'Programs are unavailable right now.' })
      return data ?? []
    },
    { default: () => [] as Program[] },
  )
  const { data, error, status } = asyncData
  return {
    programs: computed(() => data.value ?? []),
    error,
    status,
    /** Today in Africa/Accra, the reference for "past". */
    today: todayInAccra(),
    /** Resolves once the list has loaded (or failed). */
    ready: asyncData.then(() => undefined),
  }
}

import type { Testimonial } from '@recitte/shared'

export function useTestimonials() {
  const { data } = useAsyncData(
    'testimonials',
    async () => {
      const { data, error } = await useSupabaseClient()
        .from('testimonials')
        .select('id, quote, name')
        .order('created_at')
        .returns<Pick<Testimonial, 'id' | 'quote' | 'name'>[]>()
      if (error) console.error('Loading testimonials failed', error.message)
      return data ?? []
    },
    { default: () => [] as Pick<Testimonial, 'id' | 'quote' | 'name'>[] },
  )
  return { testimonials: computed(() => data.value ?? []) }
}

import { ref, shallowRef } from 'vue'
import { validateTestimonial, type Testimonial, type TestimonialInput } from '@recitte/shared'
import { supabase } from '@/lib/supabase'
import { dbErrorMessage, errorText } from '@/lib/errors'

export type SaveOutcome = { ok: true; value: Testimonial } | { ok: false; error?: string; errors?: Record<string, string> }

export function useTestimonials() {
  const testimonials = shallowRef<Testimonial[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const { data, error: err } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) {
        error.value = dbErrorMessage(err)
        return
      }
      testimonials.value = (data ?? []) as Testimonial[]
      loaded.value = true
    } catch (e) {
      error.value = errorText(e)
    } finally {
      loading.value = false
    }
  }

  /** Validates with the shared rules, then inserts (no id) or updates. */
  async function save(input: TestimonialInput, id?: string | null): Promise<SaveOutcome> {
    const valid = validateTestimonial(input)
    if (!valid.ok) return { ok: false, errors: valid.errors }
    try {
      const query = id
        ? supabase.from('testimonials').update(valid.value).eq('id', id).select('*').single()
        : supabase.from('testimonials').insert(valid.value).select('*').single()
      const { data, error: err } = await query
      if (err) return { ok: false, error: dbErrorMessage(err) }
      const row = data as Testimonial
      testimonials.value = id
        ? testimonials.value.map((t) => (t.id === id ? row : t))
        : [row, ...testimonials.value]
      return { ok: true, value: row }
    } catch (e) {
      return { ok: false, error: errorText(e) }
    }
  }

  /** Deletes a testimonial. The caller asks for confirmation first. */
  async function remove(t: Testimonial): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const { error: err } = await supabase.from('testimonials').delete().eq('id', t.id)
      if (err) return { ok: false, error: dbErrorMessage(err) }
      testimonials.value = testimonials.value.filter((x) => x.id !== t.id)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: errorText(e) }
    }
  }

  return { testimonials, loading, loaded, error, load, save, remove }
}

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import type { Testimonial } from '@recitte/shared'
import FormField from '@/components/FormField.vue'
import { useTestimonials } from '@/composables/useTestimonials'
import { confirmAction } from '@/lib/confirm'
import { excerpt } from '@/lib/labels'

const { testimonials, loading, loaded, error, load, save, remove } = useTestimonials()

const form = reactive({ quote: '', name: '', session: '' })
const editingId = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const notice = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)
const formError = ref('')
const formCard = ref<HTMLElement | null>(null)

function resetForm() {
  Object.assign(form, { quote: '', name: '', session: '' })
  editingId.value = null
  errors.value = {}
  formError.value = ''
}

async function startEdit(t: Testimonial) {
  Object.assign(form, { quote: t.quote, name: t.name, session: t.session ?? '' })
  editingId.value = t.id
  errors.value = {}
  formError.value = ''
  await nextTick()
  formCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  formCard.value?.querySelector<HTMLElement>('#t-quote')?.focus()
}

async function submit() {
  formError.value = ''
  saving.value = true
  const wasEditing = Boolean(editingId.value)
  const result = await save({ ...form }, editingId.value)
  saving.value = false
  if (!result.ok) {
    errors.value = result.errors ?? {}
    formError.value = result.error ? `Not saved. ${result.error}` : 'Some fields need attention.'
    return
  }
  resetForm()
  notice.value = { kind: 'ok', text: wasEditing ? 'Testimonial updated.' : 'Testimonial published.' }
}

async function onRemove(t: Testimonial) {
  if (!confirmAction(`Remove the testimonial from ${t.name}?\n\n“${excerpt(t.quote, 100)}”`)) return
  const result = await remove(t)
  notice.value = result.ok ? { kind: 'ok', text: 'Testimonial removed.' } : { kind: 'error', text: result.error }
  if (result.ok && editingId.value === t.id) resetForm()
}

onMounted(load)
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-3">
    <h1 class="page-title">Testimonials</h1>
    <p class="m-0 text-[14px] text-muted">Shown on the homepage as quote and name. Only add real feedback.</p>
  </div>

  <p v-if="notice" class="notice" :class="notice.kind === 'ok' ? 'notice-ok' : 'notice-error'" role="status">
    {{ notice.text }}
  </p>
  <div v-if="error" class="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
    <span>Could not load testimonials. {{ error }}</span>
    <button type="button" class="btn btn-secondary btn-small" @click="load">Try again</button>
  </div>

  <section class="card" aria-label="Testimonials" :aria-busy="loading">
    <p v-if="loading && !loaded" class="m-0 p-7 text-[14px] text-muted">Loading…</p>
    <p v-else-if="loaded && !testimonials.length" class="m-0 p-7 text-[14px] text-muted">
      No testimonials yet. The homepage hides the section until there is at least one.
    </p>
    <ul v-else class="m-0 list-none p-0">
      <li
        v-for="t in testimonials"
        :key="t.id"
        class="flex flex-col gap-3 border-b border-rule px-5 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
        :class="{ 'bg-[#faf8f2]': editingId === t.id }"
      >
        <div class="flex min-w-0 flex-col gap-1">
          <span class="text-[15px] leading-normal text-ink">“{{ t.quote }}”</span>
          <span class="text-[13px] text-muted">
            {{ t.name }}<template v-if="t.session"> · <span class="text-label">Session (admin only): {{ t.session }}</span></template>
          </span>
        </div>
        <div class="flex shrink-0 gap-3">
          <button type="button" class="btn-link" @click="startEdit(t)">Edit<span class="sr-only"> testimonial from {{ t.name }}</span></button>
          <button type="button" class="btn-link btn-danger" @click="onRemove(t)">
            Remove<span class="sr-only"> testimonial from {{ t.name }}</span>
          </button>
        </div>
      </li>
    </ul>
  </section>

  <section ref="formCard" class="card scroll-mt-6 p-7" aria-labelledby="t-form-title">
    <form class="flex flex-col gap-5" novalidate @submit.prevent="submit">
      <h2 id="t-form-title" class="card-title">{{ editingId ? 'Edit testimonial' : 'Add a testimonial' }}</h2>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField id="t-quote" label="What they said" required :error="errors.quote" hint="At least 10 characters." class="md:col-span-2">
          <template #default="{ id, describedBy, invalid }">
            <textarea :id="id" v-model="form.quote" class="input" rows="3" maxlength="1000" :aria-describedby="describedBy" :aria-invalid="invalid" />
          </template>
        </FormField>
        <FormField id="t-name" label="Name" required :error="errors.name" hint="First name, or for example “Seminar attendee”.">
          <template #default="{ id, describedBy, invalid }">
            <input :id="id" v-model="form.name" class="input" maxlength="200" :aria-describedby="describedBy" :aria-invalid="invalid" />
          </template>
        </FormField>
        <FormField id="t-session" label="Session" hint="Optional. For the team only; not shown on the site.">
          <template #default="{ id, describedBy }">
            <input :id="id" v-model="form.session" class="input" maxlength="200" :aria-describedby="describedBy" />
          </template>
        </FormField>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Publish testimonial' }}
        </button>
        <button v-if="editingId" type="button" class="btn btn-secondary" @click="resetForm">Cancel</button>
        <span v-if="formError" class="field-error" role="alert">{{ formError }}</span>
      </div>
    </form>
  </section>
</template>

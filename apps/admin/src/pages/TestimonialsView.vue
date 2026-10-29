<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { Testimonial } from '@recitte/shared'
import AppModal from '@/components/AppModal.vue'
import FormField from '@/components/FormField.vue'
import { useTestimonials } from '@/composables/useTestimonials'
import { confirmAction } from '@/lib/confirm'
import { excerpt } from '@/lib/labels'

const { testimonials, loading, loaded, error, load, save, remove } = useTestimonials()

const form = reactive({ quote: '', name: '', session: '' })
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const notice = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)
const formError = ref('')

function openForm(t: Testimonial | null = null) {
  Object.assign(form, { quote: t?.quote ?? '', name: t?.name ?? '', session: t?.session ?? '' })
  editingId.value = t?.id ?? null
  errors.value = {}
  formError.value = ''
  modalOpen.value = true
}

function closeForm() {
  if (!saving.value) modalOpen.value = false
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
  modalOpen.value = false
  notice.value = { kind: 'ok', text: wasEditing ? 'Testimonial updated.' : 'Testimonial published.' }
}

async function onRemove(t: Testimonial) {
  const ok = await confirmAction({
    title: 'Delete this testimonial?',
    message: `The quote from ${t.name} will be removed from the homepage.\n\n“${excerpt(t.quote, 100)}”`,
  })
  if (!ok) return
  const result = await remove(t)
  notice.value = result.ok ? { kind: 'ok', text: 'Testimonial removed.' } : { kind: 'error', text: result.error }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div class="flex flex-col gap-1">
      <h1 class="page-title">Testimonials</h1>
      <p class="m-0 text-[14px] text-muted">Shown on the homepage as quote and name. Only add real feedback.</p>
    </div>
    <button type="button" class="btn btn-primary" @click="openForm()">+ Add testimonial</button>
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
      >
        <div class="flex min-w-0 flex-col gap-1">
          <span class="text-[15px] leading-normal text-ink">“{{ t.quote }}”</span>
          <span class="text-[13px] text-muted">
            {{ t.name }}<template v-if="t.session"> · <span class="text-label">Session (admin only): {{ t.session }}</span></template>
          </span>
        </div>
        <div class="flex shrink-0 gap-3">
          <button type="button" class="btn-link" @click="openForm(t)">Edit<span class="sr-only"> testimonial from {{ t.name }}</span></button>
          <button type="button" class="btn-link btn-danger" @click="onRemove(t)">
            Remove<span class="sr-only"> testimonial from {{ t.name }}</span>
          </button>
        </div>
      </li>
    </ul>
  </section>

  <AppModal :open="modalOpen" :title="editingId ? 'Edit testimonial' : 'Add a testimonial'" @close="closeForm">
    <form id="testimonial-form" class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <FormField id="t-quote" label="What they said" required :error="errors.quote" hint="At least 10 characters.">
        <template #default="{ id, describedBy, invalid }">
          <textarea :id="id" v-model="form.quote" class="input" rows="4" maxlength="1000" :aria-describedby="describedBy" :aria-invalid="invalid" />
        </template>
      </FormField>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="t-name" label="Name" required :error="errors.name" hint="First name, or “Seminar attendee”.">
          <template #default="{ id, describedBy, invalid }">
            <input :id="id" v-model="form.name" class="input" maxlength="200" :aria-describedby="describedBy" :aria-invalid="invalid" />
          </template>
        </FormField>
        <FormField id="t-session" label="Session" hint="Optional. Team only, not shown.">
          <template #default="{ id, describedBy }">
            <input :id="id" v-model="form.session" class="input" maxlength="200" :aria-describedby="describedBy" />
          </template>
        </FormField>
      </div>
      <span v-if="formError" class="field-error" role="alert">{{ formError }}</span>
    </form>
    <template #footer>
      <button type="button" class="btn btn-secondary" :disabled="saving" @click="closeForm">Cancel</button>
      <button type="submit" form="testimonial-form" class="btn btn-primary" :disabled="saving">
        {{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Publish testimonial' }}
      </button>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { PROGRAM_STATUS_LABELS, PROGRAM_STATUSES, PROGRAM_TYPE_LABELS, PROGRAM_TYPES, type Program } from '@recitte/shared'
import FormField from './FormField.vue'
import { useProgramForm } from '@/composables/useProgramForm'
import { createProgram, updateProgram } from '@/composables/useProgramsAdmin'
import { removeSpeakerPhoto, useSpeakerUpload } from '@/composables/useSpeakerUpload'
import { clearUnusedFields, PROGRAM_FIELDS } from '@/lib/programFields'

const props = defineProps<{ program?: Program | null }>()
const emit = defineEmits<{ saved: [program: Program]; cancel: [] }>()

const original = props.program ?? null
const isNew = !original
const { form, errors, editSlug, addDetail, removeDetail, validate } = useProgramForm(original)
const { uploading: photoUploading, error: photoError, upload: uploadPhoto } = useSpeakerUpload()

const saving = ref(false)
const formError = ref('')
const formEl = ref<HTMLFormElement | null>(null)

/** Photos uploaded while this form was open; unused ones are cleaned up. */
const uploaded: string[] = []
let saved = false

const cfg = computed(() => PROGRAM_FIELDS[form.type])

const slugHint = computed(() =>
  isNew
    ? 'Suggested from the title until you edit it.'
    : 'Changing it breaks links already shared; old links do not redirect.',
)

/** Optional extras start open only when the program already uses them. */
const extrasOpen = ref(Boolean(form.about || form.highlights || form.extra_details.length))

const FIELD_ORDER = ['title', 'slug', 'description', 'starts_on', 'ends_on', 'extra_details', 'type', 'status']

async function focusFirstError() {
  await nextTick()
  const first = FIELD_ORDER.find((key) => errors.value[key])
  if (first === 'extra_details') extrasOpen.value = true
  await nextTick()
  const el = first ? formEl.value?.querySelector<HTMLElement>(`[data-field="${first}"]`) : null
  el?.focus()
}

async function onPhotoChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const url = await uploadPhoto(file, original?.id)
  if (url) {
    uploaded.push(url)
    form.speaker_photo_url = url
  }
}

function removePhoto() {
  form.speaker_photo_url = null
}

async function submit() {
  formError.value = ''
  clearUnusedFields(form)
  const write = validate()
  if (!write) {
    formError.value = 'Some fields need attention.'
    await focusFirstError()
    return
  }
  saving.value = true
  const result = original ? await updateProgram(original.id, write) : await createProgram(write)
  saving.value = false
  if (!result.ok) {
    if (result.code === '23505') {
      errors.value = { ...errors.value, slug: result.error }
      formError.value = 'Some fields need attention.'
      await focusFirstError()
    } else {
      formError.value = `The program was not saved. ${result.error}`
    }
    return
  }
  saved = true
  const finalUrl = result.value.speaker_photo_url
  const stale = uploaded.filter((u) => u !== finalUrl)
  if (original?.speaker_photo_url && original.speaker_photo_url !== finalUrl) stale.push(original.speaker_photo_url)
  await Promise.all(stale.map(removeSpeakerPhoto))
  emit('saved', result.value)
}

onBeforeUnmount(() => {
  // Leaving without saving: drop photos uploaded for this draft.
  if (!saved) for (const url of uploaded) void removeSpeakerPhoto(url)
})
</script>

<template>
  <form ref="formEl" class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]" novalidate @submit.prevent="submit">
    <div class="flex min-w-0 flex-col gap-6">
      <section class="card flex flex-col gap-4 p-6" aria-labelledby="pf-basics">
        <h2 id="pf-basics" class="section-title">Basics</h2>
        <FormField id="pf-title" label="Title" required :error="errors.title">
          <template #default="{ id, describedBy, invalid }">
            <input :id="id" v-model="form.title" data-field="title" class="input" maxlength="200" autocomplete="off" :aria-describedby="describedBy" :aria-invalid="invalid" />
          </template>
        </FormField>
        <FormField id="pf-slug" label="Link" required :error="errors.slug" :hint="slugHint">
          <template #default="{ id, describedBy, invalid }">
            <div class="flex items-stretch overflow-hidden rounded-[10px] border border-field focus-within:border-gold focus-within:outline-2 focus-within:outline-gold" :class="{ '!border-danger': invalid }">
              <span class="flex items-center bg-ground px-3 font-mono text-[13px] text-muted">/programs/</span>
              <input
                :id="id"
                :value="form.slug"
                data-field="slug"
                class="min-w-0 flex-1 border-0 bg-white px-3 py-2.5 font-mono text-[14px] outline-none"
                maxlength="120"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                :aria-describedby="describedBy"
                :aria-invalid="invalid"
                @input="editSlug(($event.target as HTMLInputElement).value)"
              />
            </div>
          </template>
        </FormField>
        <FormField id="pf-description" label="Short description" required hint="Shown under the title and on cards." :error="errors.description">
          <template #default="{ id, describedBy, invalid }">
            <textarea :id="id" v-model="form.description" data-field="description" class="input" rows="2" maxlength="1000" :aria-describedby="describedBy" :aria-invalid="invalid" />
          </template>
        </FormField>
      </section>

      <section class="card flex flex-col gap-4 p-6" aria-labelledby="pf-when">
        <div class="flex flex-col gap-1">
          <h2 id="pf-when" class="section-title">{{ cfg.dates === 'none' ? 'Where' : 'When and where' }}</h2>
          <p v-if="cfg.dates === 'none'" class="m-0 text-[13px] text-muted">Ongoing: no dates, it is always listed while open.</p>
          <p v-else class="m-0 text-[13px] text-muted">
            Signups stop after {{ cfg.dates === 'range' ? 'the end date (or the start date if there is none)' : 'this date' }}, Accra time.
            Leave empty if it has no fixed date.
          </p>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField v-if="cfg.dates !== 'none'" id="pf-starts" :label="cfg.dates === 'single' ? 'Date' : 'Starts on'" :error="errors.starts_on">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.starts_on" data-field="starts_on" type="date" class="input" :aria-describedby="describedBy" :aria-invalid="invalid" />
            </template>
          </FormField>
          <FormField v-if="cfg.dates === 'range'" id="pf-ends" label="Ends on" hint="Optional." :error="errors.ends_on">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.ends_on" data-field="ends_on" type="date" class="input" :min="form.starts_on || undefined" :aria-describedby="describedBy" :aria-invalid="invalid" />
            </template>
          </FormField>
          <FormField v-if="cfg.time" id="pf-time" label="Time">
            <template #default="{ id }">
              <input :id="id" v-model="form.time" class="input" maxlength="200" :placeholder="cfg.placeholders.time" />
            </template>
          </FormField>
          <FormField v-if="cfg.duration" id="pf-duration" label="Duration">
            <template #default="{ id }">
              <input :id="id" v-model="form.duration" class="input" maxlength="200" :placeholder="cfg.placeholders.duration" />
            </template>
          </FormField>
          <FormField id="pf-format" label="Format / location" class="sm:col-span-2">
            <template #default="{ id }">
              <input :id="id" v-model="form.format" class="input" maxlength="200" :placeholder="cfg.placeholders.format" />
            </template>
          </FormField>
        </div>
      </section>

      <section v-if="cfg.person" class="card flex flex-col gap-4 p-6" aria-labelledby="pf-speaker">
        <div class="flex flex-col gap-1">
          <h2 id="pf-speaker" class="section-title">{{ cfg.person }}</h2>
          <p class="m-0 text-[13px] text-muted">Optional. Shown on the page only when a name is set.</p>
        </div>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div class="flex shrink-0 flex-col items-center gap-2">
            <label
              class="group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-gold bg-ground text-[12px] font-semibold text-gold-deep focus-within:outline-2 focus-within:outline-gold"
              :class="{ 'pointer-events-none opacity-60': photoUploading }"
            >
              <img v-if="form.speaker_photo_url" :src="form.speaker_photo_url" :alt="`Photo of ${form.speaker || cfg.person}`" class="h-full w-full object-cover" width="80" height="80" />
              <span v-else>{{ photoUploading ? '…' : '+ Photo' }}</span>
              <span class="sr-only">{{ form.speaker_photo_url ? 'Replace photo' : 'Upload photo' }}</span>
              <input type="file" accept="image/*" class="sr-only" aria-describedby="pf-photo-hint" :disabled="photoUploading" @change="onPhotoChosen" />
            </label>
            <button v-if="form.speaker_photo_url" type="button" class="btn-link btn-danger !min-h-0 !p-0 text-[12px]" @click="removePhoto">Remove</button>
            <span id="pf-photo-hint" class="sr-only">Cropped to a square, 320 by 320. Shown publicly.</span>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-4">
            <FormField id="pf-speaker-name" label="Name">
              <template #default="{ id }">
                <input :id="id" v-model="form.speaker" class="input" maxlength="200" />
              </template>
            </FormField>
            <FormField v-if="form.speaker" id="pf-bio" label="Short bio">
              <template #default="{ id }">
                <textarea :id="id" v-model="form.speaker_bio" class="input" rows="3" maxlength="5000" />
              </template>
            </FormField>
          </div>
        </div>
        <span v-if="photoError" class="field-error" role="alert">{{ photoError }}</span>
      </section>

      <details class="card group" :open="extrasOpen" @toggle="extrasOpen = ($event.target as HTMLDetailsElement).open">
        <summary class="flex cursor-pointer list-none items-center justify-between gap-3 p-6 [&::-webkit-details-marker]:hidden">
          <span class="flex flex-col gap-1">
            <span class="section-title">More details</span>
            <span class="text-[13px] text-muted">Optional: longer text, {{ cfg.highlightsLabel.toLowerCase() }}, extra rows.</span>
          </span>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div class="flex flex-col gap-4 border-t border-rule p-6">
          <FormField id="pf-about" label="About" hint="When empty, the page uses the short description.">
            <template #default="{ id, describedBy }">
              <textarea :id="id" v-model="form.about" class="input" rows="4" maxlength="10000" :aria-describedby="describedBy" />
            </template>
          </FormField>
          <FormField id="pf-highlights" :label="cfg.highlightsLabel" hint="One per line.">
            <template #default="{ id, describedBy }">
              <textarea :id="id" v-model="form.highlights" class="input" rows="3" :aria-describedby="describedBy" />
            </template>
          </FormField>
          <fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
            <legend class="field-label mb-1 p-0">Extra detail rows</legend>
            <span class="field-hint -mt-1">Shown in the Details box, such as Entry: Free · RSVP, or Level: 2.</span>
            <div v-for="(detail, index) in form.extra_details" :key="index" class="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] items-center gap-2">
              <input
                v-model="detail.label"
                :data-field="index === 0 ? 'extra_details' : undefined"
                class="input"
                maxlength="100"
                placeholder="Label"
                :aria-label="`Detail ${index + 1} label`"
              />
              <input v-model="detail.value" class="input" maxlength="300" placeholder="Value" :aria-label="`Detail ${index + 1} value`" />
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-full text-[18px] text-muted hover:bg-ground hover:text-danger"
                :aria-label="`Remove detail ${detail.label || index + 1}`"
                @click="removeDetail(index)"
              >
                ×
              </button>
            </div>
            <span v-if="errors.extra_details" class="field-error">{{ errors.extra_details }}</span>
            <div><button type="button" class="btn-link" @click="addDetail">+ Add a row</button></div>
          </fieldset>
        </div>
      </details>
    </div>

    <aside class="flex flex-col gap-6 lg:sticky lg:top-24">
      <section class="card flex flex-col gap-4 p-6" aria-labelledby="pf-type-title">
        <h2 id="pf-type-title" class="section-title">Type</h2>
        <fieldset class="m-0 border-0 p-0">
          <legend class="sr-only">Program type</legend>
          <div class="grid grid-cols-2 gap-2" data-field="type" tabindex="-1">
            <label
              v-for="t in PROGRAM_TYPES"
              :key="t"
              class="flex cursor-pointer items-center justify-center rounded-[10px] border px-2 py-2 text-center text-[13px] font-semibold transition-colors focus-within:outline-2 focus-within:outline-gold"
              :class="form.type === t ? 'border-ink bg-ink text-white' : 'border-field bg-white text-ink hover:border-gold'"
            >
              <input v-model="form.type" type="radio" name="pf-type" :value="t" class="sr-only" />
              {{ PROGRAM_TYPE_LABELS[t] }}
            </label>
          </div>
        </fieldset>
        <p class="m-0 text-[13px] text-muted">{{ cfg.blurb }}</p>
        <span v-if="errors.type" class="field-error">{{ errors.type }}</span>
      </section>

      <section class="card flex flex-col gap-4 p-6" aria-labelledby="pf-publish">
        <h2 id="pf-publish" class="section-title">Publishing</h2>
        <FormField id="pf-status" label="Registration" required :error="errors.status">
          <template #default="{ id, describedBy, invalid }">
            <select :id="id" v-model="form.status" data-field="status" class="input" :aria-describedby="describedBy" :aria-invalid="invalid">
              <option v-for="st in PROGRAM_STATUSES" :key="st" :value="st">{{ PROGRAM_STATUS_LABELS[st] }}</option>
            </select>
          </template>
        </FormField>
        <label class="flex items-start gap-3">
          <input v-model="form.featured" type="checkbox" class="mt-0.5 h-[18px] w-[18px] accent-ink" aria-describedby="pf-featured-hint" />
          <span class="flex flex-col">
            <span class="field-label">Feature on homepage</span>
            <span id="pf-featured-hint" class="field-hint">Up to three show in “What's happening now”.</span>
          </span>
        </label>
        <div class="flex flex-col gap-2 border-t border-rule pt-4">
          <button type="submit" class="btn btn-primary w-full" :disabled="saving || photoUploading">
            {{ saving ? 'Saving…' : isNew ? 'Publish program' : 'Save changes' }}
          </button>
          <button type="button" class="btn btn-secondary w-full" :disabled="saving" @click="emit('cancel')">Cancel</button>
          <span v-if="formError" class="field-error text-center" role="alert">{{ formError }}</span>
        </div>
      </section>
    </aside>
  </form>
</template>

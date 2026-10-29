<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { PROGRAM_STATUS_LABELS, PROGRAM_STATUSES, PROGRAM_TYPE_LABELS, PROGRAM_TYPES, type Program } from '@recitte/shared'
import FormField from './FormField.vue'
import { useProgramForm } from '@/composables/useProgramForm'
import { createProgram, updateProgram } from '@/composables/useProgramsAdmin'
import { removeSpeakerPhoto, useSpeakerUpload } from '@/composables/useSpeakerUpload'

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

const slugHint = computed(() =>
  isNew
    ? `The program's address: /programs/${form.slug || 'your-slug'}. Suggested from the title until you edit it.`
    : `The program's address: /programs/${form.slug || '…'}. Changing it breaks links already shared; old links do not redirect.`,
)

const FIELD_ORDER = ['type', 'title', 'slug', 'description', 'status', 'starts_on', 'ends_on', 'extra_details']

async function focusFirstError() {
  await nextTick()
  const first = FIELD_ORDER.find((key) => errors.value[key])
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
  <form ref="formEl" class="flex flex-col gap-6" novalidate @submit.prevent="submit">
    <section class="card flex flex-col gap-5 p-7" aria-labelledby="pf-basics">
      <h2 id="pf-basics" class="card-title">The program</h2>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField id="pf-type" label="Type" required :error="errors.type">
          <template #default="{ id, describedBy, invalid }">
            <select :id="id" v-model="form.type" data-field="type" class="input" :aria-describedby="describedBy" :aria-invalid="invalid">
              <option v-for="t in PROGRAM_TYPES" :key="t" :value="t">{{ PROGRAM_TYPE_LABELS[t] }}</option>
            </select>
          </template>
        </FormField>
        <FormField id="pf-status" label="Registration status" required :error="errors.status">
          <template #default="{ id, describedBy, invalid }">
            <select :id="id" v-model="form.status" data-field="status" class="input" :aria-describedby="describedBy" :aria-invalid="invalid">
              <option v-for="s in PROGRAM_STATUSES" :key="s" :value="s">{{ PROGRAM_STATUS_LABELS[s] }}</option>
            </select>
          </template>
        </FormField>
        <FormField id="pf-title" label="Title" required :error="errors.title" class="md:col-span-2">
          <template #default="{ id, describedBy, invalid }">
            <input
              :id="id"
              v-model="form.title"
              data-field="title"
              class="input"
              maxlength="200"
              autocomplete="off"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            />
          </template>
        </FormField>
        <FormField id="pf-slug" label="Slug" required :error="errors.slug" :hint="slugHint" class="md:col-span-2">
          <template #default="{ id, describedBy, invalid }">
            <input
              :id="id"
              :value="form.slug"
              data-field="slug"
              class="input font-mono"
              maxlength="120"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
              @input="editSlug(($event.target as HTMLInputElement).value)"
            />
          </template>
        </FormField>
        <FormField
          id="pf-description"
          label="Description"
          required
          hint="The short text under the title at the top of the page."
          :error="errors.description"
          class="md:col-span-2"
        >
          <template #default="{ id, describedBy, invalid }">
            <textarea
              :id="id"
              v-model="form.description"
              data-field="description"
              class="input"
              rows="2"
              maxlength="1000"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            />
          </template>
        </FormField>
        <FormField
          id="pf-about"
          label="About"
          hint="Optional longer text. When empty, the page uses the description."
          class="md:col-span-2"
        >
          <template #default="{ id, describedBy }">
            <textarea :id="id" v-model="form.about" class="input" rows="5" maxlength="10000" :aria-describedby="describedBy" />
          </template>
        </FormField>
        <FormField
          id="pf-highlights"
          label="Highlights"
          hint="Optional. One per line. Shown as “What you'll learn” for courses and workshops, otherwise “What to expect”."
          class="md:col-span-2"
        >
          <template #default="{ id, describedBy }">
            <textarea :id="id" v-model="form.highlights" class="input" rows="4" :aria-describedby="describedBy" />
          </template>
        </FormField>
      </div>
    </section>

    <section class="card flex flex-col gap-5 p-7" aria-labelledby="pf-when">
      <h2 id="pf-when" class="card-title">When and where</h2>
      <p class="m-0 text-[14px] text-muted">
        A program is over after its end date (or its start date when there is no end date), in Accra time. Past
        programs keep their page but stop taking signups. Leave the dates empty for an ongoing program.
      </p>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField id="pf-starts" label="Starts on" :error="errors.starts_on">
          <template #default="{ id, describedBy, invalid }">
            <input :id="id" v-model="form.starts_on" data-field="starts_on" type="date" class="input" :aria-describedby="describedBy" :aria-invalid="invalid" />
          </template>
        </FormField>
        <FormField id="pf-ends" label="Ends on" hint="Optional. On or after the start date." :error="errors.ends_on">
          <template #default="{ id, describedBy, invalid }">
            <input
              :id="id"
              v-model="form.ends_on"
              data-field="ends_on"
              type="date"
              class="input"
              :min="form.starts_on || undefined"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            />
          </template>
        </FormField>
        <FormField id="pf-time" label="Time" hint="For example: 7:00 PM GMT">
          <template #default="{ id, describedBy }">
            <input :id="id" v-model="form.time" class="input" maxlength="200" :aria-describedby="describedBy" />
          </template>
        </FormField>
        <FormField id="pf-duration" label="Duration" hint="For example: 4 weeks · 2×/week">
          <template #default="{ id, describedBy }">
            <input :id="id" v-model="form.duration" class="input" maxlength="200" :aria-describedby="describedBy" />
          </template>
        </FormField>
        <FormField id="pf-format" label="Format / location" class="md:col-span-2">
          <template #default="{ id }">
            <input :id="id" v-model="form.format" class="input" maxlength="200" />
          </template>
        </FormField>
      </div>

      <fieldset class="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby="pf-extra-hint">
        <legend class="field-label mb-1 p-0">Extra details</legend>
        <span id="pf-extra-hint" class="field-hint -mt-2">
          Optional rows shown in the Details box after Date, Time, Duration and Format, such as Entry or Level.
        </span>
        <div
          v-for="(detail, index) in form.extra_details"
          :key="index"
          class="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
        >
          <div class="field">
            <label :for="`pf-extra-label-${index}`" class="field-label">Label</label>
            <input
              :id="`pf-extra-label-${index}`"
              v-model="detail.label"
              :data-field="index === 0 ? 'extra_details' : undefined"
              class="input"
              maxlength="100"
            />
          </div>
          <div class="field">
            <label :for="`pf-extra-value-${index}`" class="field-label">Value</label>
            <input :id="`pf-extra-value-${index}`" v-model="detail.value" class="input" maxlength="300" />
          </div>
          <button
            type="button"
            class="btn-link btn-danger justify-self-start"
            :aria-label="`Remove detail ${detail.label || index + 1}`"
            @click="removeDetail(index)"
          >
            Remove
          </button>
        </div>
        <span v-if="errors.extra_details" class="field-error">{{ errors.extra_details }}</span>
        <div>
          <button type="button" class="btn btn-secondary btn-small" @click="addDetail">+ Add a detail</button>
        </div>
      </fieldset>
    </section>

    <section class="card flex flex-col gap-5 p-7" aria-labelledby="pf-speaker">
      <h2 id="pf-speaker" class="card-title">Speaker or teacher</h2>
      <p class="m-0 text-[14px] text-muted">Optional. The speaker block shows on the page only when a name is set.</p>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField id="pf-speaker-name" label="Name">
          <template #default="{ id }">
            <input :id="id" v-model="form.speaker" class="input" maxlength="200" />
          </template>
        </FormField>
        <div class="field">
          <span id="pf-photo-label" class="field-label">Photo</span>
          <div class="flex flex-wrap items-center gap-4">
            <img
              v-if="form.speaker_photo_url"
              :src="form.speaker_photo_url"
              alt="Current speaker photo"
              class="h-16 w-16 rounded-full border border-line object-cover"
              width="64"
              height="64"
            />
            <label
              class="btn btn-secondary btn-small cursor-pointer border-dashed border-gold focus-within:outline-2 focus-within:outline-gold"
              :class="{ 'pointer-events-none opacity-60': photoUploading }"
            >
              {{ photoUploading ? 'Uploading…' : form.speaker_photo_url ? 'Replace photo' : 'Upload photo' }}
              <input
                type="file"
                accept="image/*"
                class="sr-only"
                aria-describedby="pf-photo-hint"
                :disabled="photoUploading"
                @change="onPhotoChosen"
              />
            </label>
            <button v-if="form.speaker_photo_url" type="button" class="btn-link btn-danger" @click="removePhoto">
              Remove photo
            </button>
          </div>
          <span id="pf-photo-hint" class="field-hint">Cropped to a square, 320 × 320. Shown publicly.</span>
          <span v-if="photoError" class="field-error" role="alert">{{ photoError }}</span>
        </div>
        <FormField id="pf-bio" label="Bio" class="md:col-span-2">
          <template #default="{ id }">
            <textarea :id="id" v-model="form.speaker_bio" class="input" rows="4" maxlength="5000" />
          </template>
        </FormField>
      </div>
    </section>

    <section class="card flex flex-col gap-3 p-7">
      <label class="flex items-start gap-3">
        <input v-model="form.featured" type="checkbox" class="mt-1 h-5 w-5 accent-ink" aria-describedby="pf-featured-hint" />
        <span class="flex flex-col">
          <span class="field-label">Feature on the homepage</span>
          <span id="pf-featured-hint" class="field-hint">
            “What's happening now” shows up to three featured programs that are not past and not closed.
          </span>
        </span>
      </label>
    </section>

    <div class="flex flex-wrap items-center gap-4">
      <button type="submit" class="btn btn-primary" :disabled="saving || photoUploading">
        {{ saving ? 'Saving…' : isNew ? 'Publish program' : 'Save changes' }}
      </button>
      <button type="button" class="btn btn-secondary" :disabled="saving" @click="emit('cancel')">Cancel</button>
      <span v-if="formError" class="field-error" role="alert">{{ formError }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ONLINE_PLATFORMS,
  PROGRAM_FORMAT_KINDS,
  PROGRAM_FORMAT_LABELS,
  PROGRAM_STATUS_LABELS,
  PROGRAM_STATUSES,
  type Program,
  type ProgramArea,
} from '@recitte/shared'
import FormField from './FormField.vue'
import { useProgramForm } from '@/composables/useProgramForm'
import { createProgram, updateProgram } from '@/composables/useProgramsAdmin'
import { useProgramTypes } from '@/composables/useProgramTypes'
import { removeSpeakerPhoto, useSpeakerUpload } from '@/composables/useSpeakerUpload'
import { confirmAction } from '@/lib/confirm'
import { clearUnusedFields, fieldsFor } from '@/lib/programFields'

const props = defineProps<{ program?: Program | null }>()
const emit = defineEmits<{ saved: [program: Program]; cancel: [] }>()

const original = props.program ?? null
const isNew = !original
const wasDraft = original?.is_draft ?? false
const { form, errors, editSlug, duration, customiseDuration, useAutomaticDuration, addHighlight, removeHighlight, addDetail, removeDetail, validate } =
  useProgramForm(original)
const { types, loadError: typesError, load: loadTypes, add: addType, update: updateType, remove: removeType } =
  useProgramTypes()
const { uploading: photoUploading, error: photoError, upload: uploadPhoto } = useSpeakerUpload()

const saving = ref<'publish' | 'draft' | null>(null)
const formError = ref('')
const formEl = ref<HTMLFormElement | null>(null)

/** Photos uploaded while this form was open; unused ones are cleaned up. */
const uploaded: string[] = []
let saved = false

const cfg = computed(() => fieldsFor(form.type))

const slugHint = computed(() =>
  isNew
    ? 'Suggested from the title until you edit it.'
    : 'Changing it breaks links already shared; old links do not redirect.',
)

const academyTypes = computed(() => types.value.filter((t) => t.area === 'academy'))
const connectTypes = computed(() => types.value.filter((t) => t.area === 'connect'))
const customTypes = computed(() => types.value.filter((t) => !t.builtin))
/** The program's own type when the list failed to load or it was removed elsewhere. */
const unlistedType = computed(() => (types.value.some((t) => t.slug === form.type) ? '' : form.type))

/* ---- Program type: a dropdown with "add new" ---- */

const NEW_TYPE = '__new__'
const typeChoice = computed({
  get: () => form.type,
  set: (value: string) => {
    if (value === NEW_TYPE) {
      addingType.value = true
      void nextTick(() => {
        // The select would keep showing "Add a new type" because form.type did not change.
        const select = formEl.value?.querySelector<HTMLSelectElement>('#pf-type')
        if (select) select.value = form.type
        formEl.value?.querySelector<HTMLInputElement>('#pf-new-type')?.focus()
      })
      return
    }
    form.type = value
  },
})
const addingType = ref(false)
const newTypeName = ref('')
const newTypeArea = ref<ProgramArea>('academy')
const newTypeError = ref('')
const newTypeBusy = ref(false)

async function submitNewType() {
  newTypeError.value = ''
  newTypeBusy.value = true
  const result = await addType(newTypeName.value, newTypeArea.value)
  newTypeBusy.value = false
  if (!result.ok) {
    newTypeError.value = result.error
    return
  }
  form.type = result.value.slug
  cancelNewType()
}

/* ---- Fixing custom types ---- */

const editingSlug = ref('')
const editLabel = ref('')
const editArea = ref<ProgramArea>('academy')
const manageError = ref('')
const manageBusy = ref(false)

function startEdit(slug: string) {
  const t = types.value.find((x) => x.slug === slug)
  if (!t) return
  manageError.value = ''
  editingSlug.value = slug
  editLabel.value = t.label
  editArea.value = t.area
}

async function saveEdit() {
  manageError.value = ''
  manageBusy.value = true
  const result = await updateType(editingSlug.value, editLabel.value, editArea.value)
  manageBusy.value = false
  if (!result.ok) {
    manageError.value = result.error
    return
  }
  editingSlug.value = ''
}

async function onRemoveType(slug: string, label: string) {
  manageError.value = ''
  const ok = await confirmAction({
    title: 'Delete this type?',
    message: `“${label}” will be removed from the list. This only works when no program uses it.`,
  })
  if (!ok) return
  manageBusy.value = true
  const result = await removeType(slug)
  manageBusy.value = false
  if (!result.ok) {
    manageError.value = result.error
    return
  }
  if (form.type === slug) form.type = 'workshop'
}

function cancelNewType() {
  addingType.value = false
  newTypeName.value = ''
  newTypeError.value = ''
}

/* ---- Where: online platform or in-person location ---- */

const OTHER = 'Other'
const platformChoice = ref<string>(
  form.format_kind === 'online' && form.location && !(ONLINE_PLATFORMS as readonly string[]).includes(form.location)
    ? OTHER
    : form.format_kind === 'online'
      ? form.location
      : '',
)

function onFormatChange() {
  // Each format keeps its own kind of place, so clear the other's.
  form.location = ''
  platformChoice.value = ''
}

function onPlatformChange() {
  form.location = platformChoice.value === OTHER ? '' : platformChoice.value
  if (platformChoice.value === OTHER) {
    void nextTick(() => formEl.value?.querySelector<HTMLInputElement>('#pf-platform-other')?.focus())
  }
}

/* ---- Dates: no end date means open-ended; the end can never precede the start ---- */

const durationText = computed(() => (cfg.value.duration ? duration.value : null))

/* ---- Highlights ---- */

const highlightEls = ref<HTMLInputElement[]>([])

async function addHighlightAndFocus() {
  addHighlight()
  await nextTick()
  highlightEls.value[form.highlights.length - 1]?.focus()
}

function onHighlightEnter(index: number) {
  if (!form.highlights[index]?.trim()) return
  if (index === form.highlights.length - 1) void addHighlightAndFocus()
  else highlightEls.value[index + 1]?.focus()
}

async function onRemoveHighlight(index: number) {
  removeHighlight(index)
  await nextTick()
  highlightEls.value[Math.min(index, form.highlights.length - 1)]?.focus()
}

/** Optional extras start open only when the program already uses them. */
const extrasOpen = ref(Boolean(form.extra_details.length))

const FIELD_ORDER = [
  'type',
  'title',
  'slug',
  'description',
  'starts_on',
  'ends_on',
  'start_time',
  'end_time',
  'duration_custom',
  'location',
  'extra_details',
  'status',
]

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

async function submit(mode: 'publish' | 'draft') {
  if (saving.value) return
  formError.value = ''
  clearUnusedFields(form)
  const write = validate({ draft: mode === 'draft' })
  if (!write) {
    const needsBasics = Boolean(errors.value.title || errors.value.slug)
    formError.value =
      mode === 'publish'
        ? 'Some fields need attention before this can be published.'
        : needsBasics
          ? 'A draft needs a title and a link.'
          : 'Some fields need attention.'
    await focusFirstError()
    return
  }
  saving.value = mode
  const result = original ? await updateProgram(original.id, write) : await createProgram(write)
  saving.value = null
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

const primaryLabel = computed(() => {
  if (saving.value === 'publish') return 'Publishing…'
  return isNew || wasDraft ? 'Publish program' : 'Save changes'
})
const draftLabel = computed(() => {
  if (saving.value === 'draft') return 'Saving…'
  return !isNew && !wasDraft ? 'Unpublish as draft' : 'Save as draft'
})

onMounted(loadTypes)

onBeforeUnmount(() => {
  // Leaving without saving: drop photos uploaded for this draft.
  if (!saved) for (const url of uploaded) void removeSpeakerPhoto(url)
})
</script>

<template>
  <form
    ref="formEl"
    class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
    novalidate
    @submit.prevent="submit('publish')"
  >
    <div class="flex min-w-0 flex-col gap-6">
      <!-- 1. Basics -->
      <section class="card flex flex-col gap-5 p-6" aria-labelledby="pf-basics">
        <h2 id="pf-basics" class="section-title">Basics</h2>

        <div class="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <FormField id="pf-title" label="Title" required :error="errors.title">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.title" data-field="title" class="input" maxlength="200" autocomplete="off" :aria-describedby="describedBy" :aria-invalid="invalid" />
            </template>
          </FormField>

          <FormField id="pf-type" label="Type" required :hint="addingType ? undefined : cfg.blurb" :error="errors.type">
            <template #default="{ id, describedBy, invalid }">
              <select :id="id" v-model="typeChoice" data-field="type" class="input" :aria-describedby="describedBy" :aria-invalid="invalid">
                <optgroup label="Academy">
                  <option v-for="t in academyTypes" :key="t.slug" :value="t.slug">{{ t.label }}</option>
                </optgroup>
                <optgroup label="Connect">
                  <option v-for="t in connectTypes" :key="t.slug" :value="t.slug">{{ t.label }}</option>
                </optgroup>
                <optgroup v-if="unlistedType" label="Not in the list">
                  <option :value="unlistedType">{{ unlistedType }}</option>
                </optgroup>
                <option :value="NEW_TYPE">+ Add a new type…</option>
              </select>
            </template>
          </FormField>
        </div>

        <p v-if="typesError" class="notice notice-error m-0 flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>Could not load your custom types, so only the built-in ones are listed. {{ typesError }}</span>
          <button type="button" class="btn btn-secondary btn-small" @click="loadTypes">Try again</button>
        </p>

        <div v-if="addingType" class="flex flex-col gap-4 rounded-[14px] bg-ground p-4" role="group" aria-labelledby="pf-new-type-title">
          <p id="pf-new-type-title" class="m-0 text-[14px] font-bold text-ink">New program type</p>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <FormField id="pf-new-type" label="Name">
              <template #default="{ id, describedBy }">
                <input
                  :id="id"
                  v-model="newTypeName"
                  class="input"
                  maxlength="60"
                  autocomplete="off"
                  placeholder="For example, Fireside chat"
                  :aria-describedby="[describedBy, newTypeError && 'pf-new-type-error'].filter(Boolean).join(' ') || undefined"
                  :aria-invalid="newTypeError ? 'true' : undefined"
                  @keydown.enter.prevent="submitNewType"
                />
              </template>
            </FormField>
            <fieldset class="m-0 flex flex-col gap-1.5 border-0 p-0">
              <legend class="field-label mb-1.5 p-0">Listed under</legend>
              <div class="flex gap-2">
                <label
                  v-for="area in ['academy', 'connect'] as const"
                  :key="area"
                  class="flex min-h-[44px] cursor-pointer items-center rounded-[10px] border px-4 text-[14px] font-semibold capitalize focus-within:outline-2 focus-within:outline-gold"
                  :class="newTypeArea === area ? 'border-ink bg-ink text-white' : 'border-field bg-white text-ink'"
                >
                  <input v-model="newTypeArea" type="radio" name="pf-new-type-area" :value="area" class="sr-only" />
                  {{ area }}
                </label>
              </div>
            </fieldset>
          </div>
          <p v-if="newTypeError" id="pf-new-type-error" class="field-error m-0" role="alert">{{ newTypeError }}</p>
          <div class="flex gap-2">
            <button type="button" class="btn btn-primary btn-small" :disabled="newTypeBusy" @click="submitNewType">
              {{ newTypeBusy ? 'Adding…' : 'Add type' }}
            </button>
            <button type="button" class="btn btn-secondary btn-small" :disabled="newTypeBusy" @click="cancelNewType">Cancel</button>
          </div>
        </div>

        <details v-if="customTypes.length" class="text-[13px]">
          <summary class="cursor-pointer font-semibold text-gold-deep">Manage your types</summary>
          <ul class="m-0 mt-3 flex list-none flex-col gap-2 p-0">
            <li v-for="t in customTypes" :key="t.slug" class="flex flex-wrap items-center gap-2 rounded-[10px] bg-ground px-3 py-2">
              <template v-if="editingSlug === t.slug">
                <input v-model="editLabel" class="input !min-h-[36px] min-w-0 flex-1" maxlength="60" :aria-label="`New name for ${t.label}`" @keydown.enter.prevent="saveEdit" />
                <select v-model="editArea" class="input !min-h-[36px] w-auto" :aria-label="`Where ${t.label} is listed`">
                  <option value="academy">Academy</option>
                  <option value="connect">Connect</option>
                </select>
                <button type="button" class="btn btn-primary btn-small" :disabled="manageBusy" @click="saveEdit">Save</button>
                <button type="button" class="btn btn-secondary btn-small" :disabled="manageBusy" @click="editingSlug = ''">Cancel</button>
              </template>
              <template v-else>
                <span class="min-w-0 flex-1 font-semibold text-ink">{{ t.label }} <span class="font-normal text-muted capitalize">· {{ t.area }}</span></span>
                <button type="button" class="btn-link !min-h-0 !p-0 text-[13px]" @click="startEdit(t.slug)">Rename<span class="sr-only"> {{ t.label }}</span></button>
                <button type="button" class="btn-link btn-danger !min-h-0 !p-0 text-[13px]" :disabled="manageBusy" @click="onRemoveType(t.slug, t.label)">Delete<span class="sr-only"> {{ t.label }}</span></button>
              </template>
            </li>
          </ul>
          <p v-if="manageError" class="field-error mt-2 mb-0" role="alert">{{ manageError }}</p>
        </details>

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
      </section>

      <!-- 2. About + learning points -->
      <section class="card flex flex-col gap-5 p-6" aria-labelledby="pf-about">
        <h2 id="pf-about" class="section-title">About this program</h2>
        <FormField id="pf-description" label="Description" required hint="Shown on the program page and, shortened, on cards." :error="errors.description">
          <template #default="{ id, describedBy, invalid }">
            <textarea :id="id" v-model="form.description" data-field="description" class="input" rows="6" maxlength="5000" :aria-describedby="describedBy" :aria-invalid="invalid" />
          </template>
        </FormField>

        <fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
          <legend class="field-label mb-1 p-0">{{ cfg.highlightsLabel }}</legend>
          <span class="field-hint -mt-1">One point per line. Press Enter to add the next.</span>
          <ul class="m-0 flex list-none flex-col gap-2 p-0">
            <li v-for="(_, index) in form.highlights" :key="index" class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
              <input
                :ref="(el) => (highlightEls[index] = el as HTMLInputElement)"
                v-model="form.highlights[index]"
                class="input"
                maxlength="200"
                autocomplete="off"
                :placeholder="index === 0 ? 'For example, Correct pronunciation of every letter' : ''"
                :aria-label="`${cfg.highlightsLabel}, point ${index + 1}`"
                @keydown.enter.prevent="onHighlightEnter(index)"
              />
              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[18px] text-muted hover:bg-ground hover:text-danger"
                :aria-label="`Remove point ${index + 1}`"
                @click="onRemoveHighlight(index)"
              >
                ×
              </button>
            </li>
          </ul>
          <div>
            <button type="button" class="btn btn-secondary btn-small" @click="addHighlightAndFocus">
              <span aria-hidden="true">+</span> Add a point
            </button>
          </div>
        </fieldset>
      </section>

      <!-- 3. Schedule -->
      <section class="card flex flex-col gap-5 p-6" aria-labelledby="pf-when">
        <div class="flex flex-col gap-1">
          <h2 id="pf-when" class="section-title">{{ cfg.dates === 'none' ? 'Where' : 'When and where' }}</h2>
          <p v-if="cfg.dates === 'none'" class="m-0 text-[13px] text-muted">Ongoing: no dates, it is always listed while open.</p>
          <p v-else class="m-0 text-[13px] text-muted">
            Signups stop after {{ cfg.dates === 'range' ? 'the end date (or the start date if there is none)' : 'this date' }}, Accra time.
            Leave empty if it has no fixed date.
          </p>
        </div>

        <div v-if="cfg.dates !== 'none'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="pf-starts" :label="cfg.dates === 'single' ? 'Date' : 'Starts on'" :error="errors.starts_on">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.starts_on" data-field="starts_on" type="date" class="input" :aria-describedby="describedBy" :aria-invalid="invalid" />
            </template>
          </FormField>
          <FormField v-if="cfg.dates === 'range'" id="pf-ends" label="Ends on" hint="Leave empty if it has no end." :error="errors.ends_on">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.ends_on" data-field="ends_on" type="date" class="input" :min="form.starts_on || undefined" :disabled="!form.starts_on" :aria-describedby="describedBy" :aria-invalid="invalid" />
            </template>
          </FormField>
          <div v-if="cfg.duration && form.duration_custom" class="flex flex-col gap-1.5 sm:col-span-2">
            <FormField id="pf-duration" label="Duration" :error="errors.duration_custom">
              <template #default="{ id, describedBy, invalid }">
                <input :id="id" v-model="form.duration_custom" data-field="duration_custom" class="input" maxlength="200" autocomplete="off" :aria-describedby="describedBy" :aria-invalid="invalid" />
              </template>
            </FormField>
            <button type="button" class="btn-link !min-h-0 self-start !p-0 text-[13px]" @click="useAutomaticDuration">
              Use the automatic duration{{ duration ? ` (${duration})` : '' }}
            </button>
          </div>
          <p
            v-else-if="durationText"
            class="m-0 flex flex-wrap items-center gap-2 rounded-[10px] bg-ground px-4 py-2.5 text-[14px] sm:col-span-2"
            role="status"
          >
            <span class="text-muted">Duration</span>
            <strong class="text-ink">{{ durationText }}</strong>
            <span v-if="durationText === 'Open-ended'" class="text-muted">· no end date</span>
            <button type="button" class="btn-link ml-auto !min-h-0 !p-0 text-[13px]" @click="customiseDuration">Edit text</button>
          </p>
        </div>

        <div v-if="cfg.time" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="pf-start-time" label="Starts at" hint="Accra time (GMT)." :error="errors.start_time">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.start_time" data-field="start_time" type="time" step="300" class="input" :aria-describedby="describedBy" :aria-invalid="invalid" />
            </template>
          </FormField>
          <FormField id="pf-end-time" label="Ends at" hint="Optional." :error="errors.end_time">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.end_time" data-field="end_time" type="time" step="300" class="input" :min="form.start_time || undefined" :disabled="!form.start_time" :aria-describedby="describedBy" :aria-invalid="invalid" />
            </template>
          </FormField>
          <p v-if="form.legacy_time && !form.start_time" class="m-0 flex flex-wrap items-center gap-2 text-[13px] text-muted sm:col-span-2">
            Currently shown as “{{ form.legacy_time }}”. Pick a start time to replace it.
            <button type="button" class="btn-link !min-h-0 !p-0 text-[13px]" @click="form.legacy_time = ''">Clear</button>
          </p>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="pf-format" label="Format" :error="errors.format_kind">
            <template #default="{ id }">
              <select :id="id" v-model="form.format_kind" class="input" @change="onFormatChange">
                <option value="">Not set</option>
                <option v-for="k in PROGRAM_FORMAT_KINDS" :key="k" :value="k">{{ PROGRAM_FORMAT_LABELS[k] }}</option>
              </select>
            </template>
          </FormField>

          <FormField v-if="form.format_kind === 'online'" id="pf-platform" label="Platform" required :error="errors.location">
            <template #default="{ id, describedBy, invalid }">
              <select :id="id" v-model="platformChoice" data-field="location" class="input" :aria-describedby="describedBy" :aria-invalid="invalid" @change="onPlatformChange">
                <option value="">Choose a platform</option>
                <option v-for="p in ONLINE_PLATFORMS" :key="p" :value="p">{{ p }}</option>
                <option :value="OTHER">Other…</option>
              </select>
            </template>
          </FormField>
          <FormField v-else-if="form.format_kind === 'in_person'" id="pf-location" label="Location" required :error="errors.location">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.location" data-field="location" class="input" maxlength="150" autocomplete="off" placeholder="For example, Accra Central Mosque" :aria-describedby="describedBy" :aria-invalid="invalid" />
            </template>
          </FormField>
          <FormField v-else-if="form.location" id="pf-location-legacy" label="Shown as">
            <template #default="{ id }">
              <input :id="id" v-model="form.location" class="input" maxlength="200" />
            </template>
          </FormField>

          <FormField v-if="form.format_kind === 'online' && platformChoice === OTHER" id="pf-platform-other" label="Platform name" required class="sm:col-start-2">
            <template #default="{ id }">
              <input :id="id" v-model="form.location" class="input" maxlength="150" autocomplete="off" placeholder="For example, Discord" />
            </template>
          </FormField>
        </div>
      </section>

      <!-- 4. Speaker -->
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

      <!-- 5. Extra rows -->
      <details class="card group" :open="extrasOpen" @toggle="extrasOpen = ($event.target as HTMLDetailsElement).open">
        <summary class="flex cursor-pointer list-none items-center justify-between gap-3 p-6 [&::-webkit-details-marker]:hidden">
          <span class="flex flex-col gap-1">
            <span class="section-title">Extra detail rows</span>
            <span class="text-[13px] text-muted">Optional: shown in the Details box, such as Entry: Free · RSVP.</span>
          </span>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <fieldset class="m-0 flex flex-col gap-2 border-0 border-t border-rule p-6">
          <legend class="sr-only">Extra detail rows</legend>
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
      </details>
    </div>

    <!-- Publishing -->
    <aside class="flex flex-col gap-6 lg:sticky lg:top-24">
      <section class="card flex flex-col gap-4 p-6" aria-labelledby="pf-publish">
        <div class="flex items-center justify-between gap-3">
          <h2 id="pf-publish" class="section-title">Publishing</h2>
          <span class="pill" :class="isNew || wasDraft ? 'bg-line text-[#5e5037]' : 'bg-soft text-ink'">
            {{ isNew ? 'New' : wasDraft ? 'Draft' : 'Published' }}
          </span>
        </div>
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
            <span id="pf-featured-hint" class="field-hint">Up to three show in “What's happening now”. Drafts are never featured.</span>
          </span>
        </label>
        <div class="flex flex-col gap-2 border-t border-rule pt-4">
          <button type="button" class="btn btn-primary w-full" :disabled="!!saving || photoUploading" @click="submit('publish')">
            {{ primaryLabel }}
          </button>
          <button type="button" class="btn btn-secondary w-full" :disabled="!!saving || photoUploading" @click="submit('draft')">
            {{ draftLabel }}
          </button>
          <button type="button" class="btn-link w-full justify-center" :disabled="!!saving" @click="emit('cancel')">Cancel</button>
          <p v-if="isNew || wasDraft" class="field-hint m-0 text-center">Drafts are visible to staff only.</p>
          <span v-if="formError" class="field-error text-center" role="alert">{{ formError }}</span>
        </div>
      </section>
    </aside>
  </form>
</template>

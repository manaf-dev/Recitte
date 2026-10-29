<script setup lang="ts">
import { NOT_SURE_PROGRAM, RECITATION_LEVELS, TAJWEED_EXPERIENCE, type ApplicationInput } from '@recitte/shared'
import { applySteps } from '~/content/siteCopy'
import { applicationProgramOptions } from '~/utils/programQueries'

const { state, close } = useDialogs()
const { email: contactEmail } = useSiteSettings()
const { programs, today } = usePrograms()
const { submit, pending } = useSubmitApplication()

const empty = (): ApplicationInput => ({
  full_name: '',
  email: '',
  phone: '',
  country: '',
  age: '',
  program: '',
  level: '',
  tajweed_experience: '',
  additional_info: '',
})

const form = reactive(empty())
const errors = ref<Record<string, string>>({})
const problem = ref('')
const done = ref<{ firstName: string; program: string; email: string } | null>(null)

const options = computed(() => applicationProgramOptions(programs.value, today))
const open = computed(() => state.value.apply.open)

watch(open, (isOpen) => {
  if (!isOpen) return
  done.value = null
  problem.value = ''
  errors.value = {}
  const wanted = state.value.apply.programId
  if (wanted && options.value.some((o) => o.value === wanted)) form.program = wanted
})

function clearError(key: keyof ApplicationInput) {
  if (errors.value[key]) errors.value = { ...errors.value, [key]: '' }
}

async function onSubmit() {
  problem.value = ''
  const result = await submit({ ...form })
  if (result.ok) {
    const label = options.value.find((o) => o.value === form.program)?.label ?? NOT_SURE_PROGRAM
    done.value = { firstName: form.full_name.trim().split(/\s+/)[0] ?? '', program: label, email: result.value.email }
    Object.assign(form, empty())
    errors.value = {}
    return
  }
  if (result.reason === 'invalid') {
    errors.value = result.errors
    problem.value = 'Please fix the highlighted fields.'
  } else if (result.reason === 'ended' || result.reason === 'closed') {
    errors.value = { program: 'This program is no longer taking applications. Choose another.' }
    problem.value = 'Your application was not received.'
  } else {
    problem.value = 'Your application was not received. Please check your connection and try again.'
  }
}

const err = (k: keyof ApplicationInput) => errors.value[k] || undefined
</script>

<template>
  <BaseDialog :open="open" wide label="Apply to Recitte Academy" @close="close('apply')">
    <button
      type="button"
      aria-label="Close"
      class="absolute top-4 right-4 z-[2] flex size-10 items-center justify-center rounded-full border border-line bg-white text-xl leading-none text-ink hover:bg-ground"
      @click="close('apply')"
    >
      ×
    </button>
    <div class="flex flex-wrap">
      <div class="flex flex-[1_1_300px] flex-col gap-4 bg-ink p-11 text-white">
        <span class="text-sm font-bold text-gold">Application form</span>
        <h2 class="m-0 font-serif text-[44px] leading-[1.04] font-semibold">Apply to Recitte Academy</h2>
        <p class="m-0 text-[17px] leading-[1.7] text-mist">
          Takes about a minute. Our team reviews every application and replies within 3 working days.
        </p>
        <div class="flex flex-col gap-3.5 pt-4">
          <h3 class="m-0 font-serif text-2xl font-semibold text-white">Four steps to your first class.</h3>
          <div v-for="st in applySteps" :key="st.title" class="flex items-start gap-3.5">
            <span class="dot mt-2" />
            <div class="flex flex-col gap-0.5">
              <span class="font-bold text-white">{{ st.title }}</span>
              <span class="text-sm text-mist">{{ st.text }}</span>
            </div>
          </div>
        </div>
        <p v-if="contactEmail" class="mt-auto mb-0 text-sm text-soft">Questions? {{ contactEmail }}</p>
      </div>

      <div class="min-w-0 flex-[2_1_480px] p-11">
        <div v-if="done" class="animate-fade flex flex-col items-start gap-4 py-6" role="status">
          <SuccessMark />
          <h3 class="m-0 font-serif text-[38px] font-semibold text-ink">JazakAllahu khayran, {{ done.firstName }}.</h3>
          <p class="m-0 max-w-[520px] text-[17px] leading-[1.7]">
            Your application for <strong>{{ done.program }}</strong> has been received. We'll be in touch at {{ done.email }}
            within 3 working days, in shā' Allāh.
          </p>
          <button type="button" class="btn btn-sand text-sm" @click="done = null">Submit another application</button>
        </div>

        <form v-else novalidate class="grid-fit-240 gap-5" @submit.prevent="onSubmit">
          <FormField id="app-name" label="Full name" required :error="err('full_name')">
            <template #default="{ invalid, describedBy }">
              <input id="app-name" v-model="form.full_name" class="field" autocomplete="name" :aria-invalid="invalid" :aria-describedby="describedBy" @input="clearError('full_name')" />
            </template>
          </FormField>
          <FormField id="app-email" label="Email" required :error="err('email')">
            <template #default="{ invalid, describedBy }">
              <input id="app-email" v-model="form.email" type="email" class="field" autocomplete="email" :aria-invalid="invalid" :aria-describedby="describedBy" @input="clearError('email')" />
            </template>
          </FormField>
          <FormField id="app-phone" label="Phone / WhatsApp" required :error="err('phone')">
            <template #default="{ invalid, describedBy }">
              <input id="app-phone" v-model="form.phone" type="tel" class="field" placeholder="+233 …" autocomplete="tel" :aria-invalid="invalid" :aria-describedby="describedBy" @input="clearError('phone')" />
            </template>
          </FormField>
          <FormField id="app-country" label="Country" required :error="err('country')">
            <template #default="{ invalid, describedBy }">
              <input id="app-country" v-model="form.country" class="field" autocomplete="country-name" :aria-invalid="invalid" :aria-describedby="describedBy" @input="clearError('country')" />
            </template>
          </FormField>
          <FormField id="app-age" label="Age" optional :error="err('age')">
            <template #default="{ invalid, describedBy }">
              <input id="app-age" v-model="form.age" type="number" inputmode="numeric" min="5" max="100" step="1" class="field" :aria-invalid="invalid" :aria-describedby="describedBy" @input="clearError('age')" />
            </template>
          </FormField>
          <FormField id="app-program" label="Program interested in" required :error="err('program')">
            <template #default="{ invalid, describedBy }">
              <select id="app-program" v-model="form.program" class="field" :aria-invalid="invalid" :aria-describedby="describedBy" @change="clearError('program')">
                <option value="">Select a program</option>
                <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </template>
          </FormField>
          <FormField id="app-level" label="Current Qur'an recitation level" required :error="err('level')">
            <template #default="{ invalid, describedBy }">
              <select id="app-level" v-model="form.level" class="field" :aria-invalid="invalid" :aria-describedby="describedBy" @change="clearError('level')">
                <option value="">Select your level</option>
                <option v-for="o in RECITATION_LEVELS" :key="o" :value="o">{{ o }}</option>
              </select>
            </template>
          </FormField>
          <FormField id="app-tajweed" label="Previous Tajweed experience" optional :error="err('tajweed_experience')">
            <template #default="{ invalid, describedBy }">
              <select id="app-tajweed" v-model="form.tajweed_experience" class="field" :aria-invalid="invalid" :aria-describedby="describedBy">
                <option value="">Select one</option>
                <option v-for="o in TAJWEED_EXPERIENCE" :key="o" :value="o">{{ o }}</option>
              </select>
            </template>
          </FormField>
          <div class="col-span-full">
            <FormField id="app-info" label="Additional information">
              <textarea id="app-info" v-model="form.additional_info" rows="4" maxlength="5000" class="field resize-y" placeholder="Availability, goals, anything we should know" />
            </FormField>
          </div>
          <div class="col-span-full flex flex-wrap items-center gap-4">
            <button type="submit" class="btn btn-ink" :disabled="pending">{{ pending ? 'Sending…' : 'Submit application' }}</button>
            <span v-if="problem" class="text-sm font-semibold text-error" role="alert">{{ problem }}</span>
          </div>
        </form>
      </div>
    </div>
  </BaseDialog>
</template>

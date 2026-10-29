<script setup lang="ts">
import { formatProgramDate, interestMessage, waMeUrl, type RegistrationInput } from '@recitte/shared'
import { registrationOutcome } from '~/utils/submissions'

const { state, close } = useDialogs()
const { whatsapp } = useSiteSettings()
const { submit, pending } = useSubmitRegistration()

const form = reactive({ full_name: '', email: '', phone: '' })
const errors = ref<Record<string, string>>({})
const problem = ref('')
const whatsappOffer = ref<string | null>(null)
const done = ref<{ email: string } | null>(null)

const open = computed(() => state.value.register.open)
const program = computed(() => state.value.register.program)
const kind = computed(() => state.value.register.kind)

const copy = computed(() => {
  switch (kind.value) {
    case 'notify':
      return { eyebrow: 'Notify me', submit: 'Notify me', doneTitle: "We'll let you know." }
    case 'interest':
      return { eyebrow: "I'm interested", submit: 'Save and open WhatsApp', doneTitle: "You're on the list." }
    default:
      return { eyebrow: 'Registration', submit: 'Confirm registration', doneTitle: "You're registered." }
  }
})

const waUrl = computed(() => {
  const p = program.value
  if (!p || !whatsapp.value) return ''
  return waMeUrl(whatsapp.value, interestMessage(p.title, p.starts_on ? formatProgramDate(p.starts_on) : null))
})

watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(form, { full_name: '', email: '', phone: '' })
  errors.value = {}
  problem.value = ''
  whatsappOffer.value = null
  done.value = null
})

async function onSubmit() {
  const p = program.value
  if (!p) return
  problem.value = ''
  whatsappOffer.value = null
  const input: RegistrationInput = { program_id: p.id, kind: kind.value, ...form }
  const result = await submit(input, p)
  const outcome = registrationOutcome(kind.value, result, waUrl.value)

  if (outcome.stored) {
    done.value = { email: form.email.trim() }
    whatsappOffer.value = outcome.whatsappUrl
    if (outcome.openWhatsApp && outcome.whatsappUrl) window.open(outcome.whatsappUrl, '_blank', 'noopener')
    return
  }
  if (!result.ok && result.reason === 'invalid') {
    errors.value = result.errors
    return
  }
  whatsappOffer.value = outcome.whatsappUrl
  if (!result.ok && result.reason === 'ended') problem.value = 'Registration for this program has ended.'
  else if (!result.ok && result.reason === 'closed') problem.value = 'Registration for this program is closed.'
  else if (kind.value === 'interest') problem.value = "We couldn't save your interest. You can still message us on WhatsApp."
  else problem.value = 'Your registration was not received. Please check your connection and try again.'
}
</script>

<template>
  <BaseDialog :open="open && !!program" labelledby="register-title" @close="close('register')">
    <div v-if="program" class="flex flex-col gap-4 p-9">
      <template v-if="!done">
        <span class="text-sm font-bold text-gold-deep">{{ copy.eyebrow }}</span>
        <h3 id="register-title" class="m-0 font-serif text-[32px] leading-[1.05] font-semibold text-ink">{{ program.title }}</h3>
        <form novalidate class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <FormField id="reg-name" label="Full name" required :error="errors.full_name">
            <template #default="{ invalid, describedBy }">
              <input id="reg-name" v-model="form.full_name" class="field" autocomplete="name" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </template>
          </FormField>
          <FormField id="reg-email" label="Email" required :error="errors.email">
            <template #default="{ invalid, describedBy }">
              <input id="reg-email" v-model="form.email" type="email" class="field" autocomplete="email" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </template>
          </FormField>
          <FormField id="reg-phone" label="Phone / WhatsApp" optional>
            <input id="reg-phone" v-model="form.phone" type="tel" class="field" autocomplete="tel" />
          </FormField>
          <div v-if="problem" role="alert" class="flex flex-col items-start gap-3 rounded-2xl bg-ground p-4 text-sm font-semibold text-error">
            {{ problem }}
            <a v-if="whatsappOffer" :href="whatsappOffer" target="_blank" rel="noopener" class="btn btn-gold btn-sm">Message us on WhatsApp</a>
          </div>
          <div class="flex flex-wrap gap-2.5 pt-1">
            <button type="submit" class="btn btn-ink" :disabled="pending">{{ pending ? 'Saving…' : copy.submit }}</button>
            <button type="button" class="btn btn-sand font-medium" @click="close('register')">Cancel</button>
          </div>
        </form>
      </template>

      <div v-else role="status" class="flex flex-col items-start gap-4">
        <SuccessMark />
        <h3 id="register-title" class="m-0 font-serif text-[32px] font-semibold text-ink">{{ copy.doneTitle }}</h3>
        <p v-if="kind === 'notify'" class="m-0 text-[17px] leading-[1.7]">
          We'll write to {{ done.email }} when registration opens for <strong>{{ program.title }}</strong>.
        </p>
        <p v-else class="m-0 text-[17px] leading-[1.7]">
          We've saved your place for <strong>{{ program.title }}</strong>. Joining details will be sent to {{ done.email }}.
        </p>
        <p v-if="whatsappOffer" class="m-0 text-[17px] leading-[1.7]">WhatsApp should open in a new tab so you can message the team.</p>
        <div class="flex flex-wrap gap-2.5">
          <a v-if="whatsappOffer" :href="whatsappOffer" target="_blank" rel="noopener" class="btn btn-gold">Open WhatsApp</a>
          <button type="button" class="btn btn-ink" @click="close('register')">Done</button>
        </div>
      </div>
    </div>
  </BaseDialog>
</template>

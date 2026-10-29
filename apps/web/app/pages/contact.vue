<script setup lang="ts">
import { CONTACT_SUBJECTS, MESSAGE_MAX, waMeUrl, type ContactInput } from '@recitte/shared'
import { pictures } from '~/content/siteCopy'

useSeoMeta({ title: 'Contact | Recitte' })

const { email, phone, whatsapp } = useSiteSettings()
const { submit, pending } = useSubmitContact()

const empty = (): ContactInput => ({ subject: '', full_name: '', email: '', phone: '', message: '' })
const form = reactive(empty())
const errors = ref<Record<string, string>>({})
const problem = ref('')
const done = ref(false)

const PLACEHOLDERS: Record<string, string> = {
  'Recitte Academy': 'Tell us which seminar, workshop or course you are interested in and any questions about schedules or levels…',
  Community: "Ask about the WhatsApp community or the Qur'an challenges…",
  Partnership: 'Tell us about your organisation and how you would like to work together…',
}
const placeholder = computed(() => PLACEHOLDERS[form.subject] ?? 'How can we help? Share as much detail as you like…')

const contactRows = computed(() =>
  [
    email.value && { label: 'Email', note: 'Best for detailed questions', value: email.value, href: `mailto:${email.value}`, external: false },
    phone.value && {
      label: 'Phone',
      note: 'Mon–Fri, 9am–5pm GMT',
      value: phone.value,
      href: `tel:${phone.value.replace(/\s/g, '')}`,
      external: false,
    },
    whatsapp.value && { label: 'WhatsApp', note: 'Quickest reply', value: 'Message us directly', href: waMeUrl(whatsapp.value), external: true },
  ].filter((r): r is { label: string; note: string; value: string; href: string; external: boolean } => !!r),
)

function toggleSubject(s: string) {
  form.subject = form.subject === s ? '' : s
}

async function onSubmit() {
  problem.value = ''
  const result = await submit({ ...form })
  if (result.ok) {
    done.value = true
    Object.assign(form, empty())
    errors.value = {}
    return
  }
  if (result.reason === 'invalid') errors.value = result.errors
  else problem.value = 'Your message was not received. Please check your connection and try again.'
}
</script>

<template>
  <section class="on-ink relative overflow-hidden bg-ink text-white">
    <img class="hero-img" :src="pictures.communityCircle.src" :alt="pictures.communityCircle.alt" width="1600" height="900" style="object-position: center 40%" />
    <div class="hero-scrim" />
    <div class="relative z-[1] mx-auto flex max-w-[1240px] flex-wrap items-start gap-x-16 gap-y-12 px-6 pt-14">
      <div class="flex min-w-0 flex-[1_1_380px] flex-col gap-5.5 pb-14">
        <h1 class="h1 text-[clamp(36px,3.6vw+16px,72px)]">Talk to the Recitte team.</h1>
        <p class="lead max-w-[460px] text-haze">
          Assalamu alaikum. Whether it's about the Academy, the community or working together, we read every message.
        </p>
        <div v-if="whatsapp">
          <a :href="waMeUrl(whatsapp)" target="_blank" rel="noopener" class="btn btn-gold">Message us on WhatsApp</a>
        </div>
        <div v-if="contactRows.length" class="mt-3 flex flex-col gap-2">
          <a
            v-for="c in contactRows"
            :key="c.label"
            :href="c.href"
            :target="c.external ? '_blank' : undefined"
            :rel="c.external ? 'noopener' : undefined"
            class="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl bg-white/7 p-5 text-left text-white no-underline hover:text-soft"
          >
            <span class="text-sm font-semibold text-gold">{{ c.label }}</span>
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="text-[17px] font-bold [overflow-wrap:anywhere]">{{ c.value }}</span>
              <span class="text-sm text-[#b9b8c8]">{{ c.note }}</span>
            </span>
            <span class="text-xl" aria-hidden="true">↗</span>
          </a>
        </div>
        <SocialLinks tone="hero" class="pt-1.5" />
      </div>

      <div class="min-w-0 flex-[1_1_440px] self-end rounded-t-[28px] bg-white p-[clamp(24px,4vw,44px)] text-[#343434]">
        <div v-if="done" role="status" class="animate-fade flex flex-col items-start gap-4 py-10">
          <SuccessMark />
          <h2 class="m-0 font-serif text-[38px] font-semibold text-ink">JazakAllahu khayran.</h2>
          <p class="m-0 text-[17px] leading-[1.7]">
            Your message is with the Recitte team. We'll reply within 2 working days, in shā' Allāh.
          </p>
          <button type="button" class="btn btn-sand text-sm" @click="done = false">Send another message</button>
        </div>

        <form v-else novalidate class="flex flex-col gap-5.5" @submit.prevent="onSubmit">
          <h2 class="m-0 font-serif text-[32px] leading-[1.05] font-semibold text-ink">Send a message</h2>
          <fieldset class="m-0 flex flex-col gap-2.5 border-none p-0">
            <legend class="mb-2.5 p-0 text-sm font-bold text-ink">I'm getting in touch about</legend>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="s in CONTACT_SUBJECTS"
                :key="s"
                type="button"
                :aria-pressed="form.subject === s"
                class="min-h-11 rounded-full border-none px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
                :class="form.subject === s ? 'bg-ink text-white' : 'bg-stone text-ink'"
                @click="toggleSubject(s)"
              >
                {{ s }}
              </button>
            </div>
          </fieldset>
          <div class="grid-fit-200 gap-4">
            <FormField id="contact-name" label="Full name" required :error="errors.full_name">
              <template #default="{ invalid, describedBy }">
                <input id="contact-name" v-model="form.full_name" class="field" autocomplete="name" placeholder="e.g. Aisha Mohammed" :aria-invalid="invalid" :aria-describedby="describedBy" />
              </template>
            </FormField>
            <FormField id="contact-email" label="Email" required :error="errors.email">
              <template #default="{ invalid, describedBy }">
                <input id="contact-email" v-model="form.email" type="email" class="field" autocomplete="email" placeholder="you@example.com" :aria-invalid="invalid" :aria-describedby="describedBy" />
              </template>
            </FormField>
          </div>
          <FormField id="contact-phone" label="Phone / WhatsApp" optional>
            <input id="contact-phone" v-model="form.phone" type="tel" class="field" autocomplete="tel" placeholder="+233 20 123 4567" />
          </FormField>
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between gap-3">
              <label for="contact-message" class="field-label">Message *</label>
              <span class="text-sm font-semibold text-label" aria-live="polite">{{ form.message.length }} / {{ MESSAGE_MAX }}</span>
            </div>
            <textarea
              id="contact-message"
              v-model="form.message"
              rows="5"
              :maxlength="MESSAGE_MAX"
              class="field min-h-[140px] resize-y leading-[1.6]"
              :placeholder="placeholder"
              :aria-invalid="!!errors.message"
              :aria-describedby="errors.message ? 'contact-message-error' : undefined"
            />
            <span v-if="errors.message" id="contact-message-error" class="field-error">{{ errors.message }}</span>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-4 pb-2">
            <span class="flex-[1_1_200px] text-sm leading-normal text-label">Replies within 2 working days.</span>
            <button type="submit" class="btn btn-ink" :disabled="pending">{{ pending ? 'Sending…' : 'Send message →' }}</button>
          </div>
          <p v-if="problem" role="alert" class="m-0 text-sm font-semibold text-error">{{ problem }}</p>
        </form>
      </div>
    </div>
  </section>
</template>

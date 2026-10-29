<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { SOCIAL_LABELS } from '@recitte/shared'
import FormField from '@/components/FormField.vue'
import { useSiteSettings } from '@/composables/useSiteSettings'

const { form, socials, loading, loaded, error, load, saveSettings, saveSocials } = useSiteSettings()

type Feedback = { kind: 'ok' | 'error'; text: string } | null

const settingsErrors = ref<Record<string, string>>({})
const settingsFeedback = ref<Feedback>(null)
const savingSettings = ref(false)

const socialErrors = ref<Record<string, string>>({})
const socialFeedback = ref<Feedback>(null)
const savingSocials = ref(false)

async function onSaveSettings() {
  settingsFeedback.value = null
  savingSettings.value = true
  const result = await saveSettings()
  savingSettings.value = false
  settingsErrors.value = result.ok ? {} : (result.errors ?? {})
  settingsFeedback.value = result.ok
    ? { kind: 'ok', text: 'Saved. The site shows the new content now.' }
    : { kind: 'error', text: result.error ? `Not saved. ${result.error}` : 'Not saved. Some fields need attention.' }
}

async function onSaveSocials() {
  socialFeedback.value = null
  savingSocials.value = true
  const result = await saveSocials()
  savingSocials.value = false
  socialErrors.value = result.ok ? {} : (result.errors ?? {})
  socialFeedback.value = result.ok
    ? { kind: 'ok', text: result.changed ? 'Social links saved.' : 'Nothing changed.' }
    : { kind: 'error', text: result.error ? `Not saved. ${result.error}` : 'Not saved. Check the highlighted links.' }
}

onMounted(load)
</script>

<template>
  <h1 class="page-title">Content &amp; links</h1>

  <div v-if="error" class="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
    <span>Could not load the site settings. {{ error }}</span>
    <button type="button" class="btn btn-secondary btn-small" @click="load">Try again</button>
  </div>
  <p v-else-if="loading && !loaded" class="text-[14px] text-muted" role="status">Loading…</p>

  <template v-if="loaded">
    <section class="card p-7" aria-labelledby="settings-title">
      <form class="flex flex-col gap-5" novalidate @submit.prevent="onSaveSettings">
        <h2 id="settings-title" class="card-title">Homepage and contact details</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField id="s-hero-title" label="Homepage headline" required :error="settingsErrors.hero_title" class="md:col-span-2">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.hero_title" class="input" :aria-describedby="describedBy" :aria-invalid="invalid" />
            </template>
          </FormField>
          <FormField id="s-hero-intro" label="Homepage intro" class="md:col-span-2">
            <template #default="{ id }">
              <textarea :id="id" v-model="form.hero_intro" class="input" rows="3" />
            </template>
          </FormField>
          <FormField id="s-email" label="Email" required hint="Shown on Contact. Submission notices are sent here." :error="settingsErrors.email">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.email" type="email" autocomplete="off" class="input" :aria-describedby="describedBy" :aria-invalid="invalid" />
            </template>
          </FormField>
          <FormField id="s-phone" label="Phone" hint="Optional. Leave empty to hide the phone row on Contact.">
            <template #default="{ id, describedBy }">
              <input :id="id" v-model="form.phone" type="tel" class="input" :aria-describedby="describedBy" />
            </template>
          </FormField>
          <FormField
            id="s-whatsapp"
            label="WhatsApp number"
            required
            hint="Used for “I'm interested” and the WhatsApp row on Contact. Include the country code."
            :error="settingsErrors.whatsapp"
          >
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.whatsapp" type="tel" class="input" :aria-describedby="describedBy" :aria-invalid="invalid" />
            </template>
          </FormField>
          <FormField
            id="s-community"
            label="Community join link"
            hint="Optional. The WhatsApp community invite. When empty, every Join button on the site is hidden."
            :error="settingsErrors.community_link"
          >
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.community_link" type="url" class="input" placeholder="https://chat.whatsapp.com/…" :aria-describedby="describedBy" :aria-invalid="invalid" />
            </template>
          </FormField>
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <button type="submit" class="btn btn-primary" :disabled="savingSettings">
            {{ savingSettings ? 'Saving…' : 'Save content' }}
          </button>
          <span
            v-if="settingsFeedback"
            :class="settingsFeedback.kind === 'ok' ? 'text-[13px] font-semibold text-ok' : 'field-error'"
            role="status"
          >
            {{ settingsFeedback.text }}
          </span>
        </div>
      </form>
    </section>

    <section class="card p-7" aria-labelledby="socials-title">
      <form class="flex flex-col gap-3" novalidate @submit.prevent="onSaveSocials">
        <h2 id="socials-title" class="card-title">Social platforms</h2>
        <p class="m-0 text-[14px] text-muted">
          Only platforms that are Active and have a link appear on the site (header, footer and Contact).
        </p>
        <div
          v-for="row in socials"
          :key="row.platform"
          class="grid grid-cols-1 items-start gap-2 border-t border-rule py-3 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-center sm:gap-3"
        >
          <label :for="`social-${row.platform}`" class="text-[14px] font-bold text-ink">{{ SOCIAL_LABELS[row.platform] }}</label>
          <div class="flex flex-col gap-1">
            <input
              :id="`social-${row.platform}`"
              v-model="row.url"
              type="url"
              class="input"
              :placeholder="row.platform === 'whatsapp' ? 'https://whatsapp.com/channel/…' : 'https://'"
              :aria-invalid="socialErrors[row.platform] ? 'true' : undefined"
              :aria-describedby="socialErrors[row.platform] ? `social-${row.platform}-error` : undefined"
            />
            <span v-if="socialErrors[row.platform]" :id="`social-${row.platform}-error`" class="field-error">
              {{ socialErrors[row.platform] }}
            </span>
            <span v-else-if="row.active && !row.url.trim()" class="field-hint">Add a link, or it stays hidden on the site.</span>
            <span v-else-if="row.platform === 'whatsapp'" class="field-hint">
              Your WhatsApp channel link, used by “Join our WhatsApp channel” on Connect even while the footer icon is
              hidden. Without it, that button uses the community link, then a message to the WhatsApp number.
            </span>
          </div>
          <button
            type="button"
            class="btn btn-small min-w-[96px] border-ink"
            :class="row.active ? 'bg-ink text-white' : 'bg-transparent text-ink'"
            :aria-pressed="row.active"
            :aria-label="`${SOCIAL_LABELS[row.platform]}: ${row.active ? 'Active' : 'Hidden'}`"
            @click="row.active = !row.active"
          >
            {{ row.active ? 'Active' : 'Hidden' }}
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-4 pt-2">
          <button type="submit" class="btn btn-primary" :disabled="savingSocials">
            {{ savingSocials ? 'Saving…' : 'Save social links' }}
          </button>
          <span
            v-if="socialFeedback"
            :class="socialFeedback.kind === 'ok' ? 'text-[13px] font-semibold text-ok' : 'field-error'"
            role="status"
          >
            {{ socialFeedback.text }}
          </span>
        </div>
      </form>
    </section>
  </template>
</template>

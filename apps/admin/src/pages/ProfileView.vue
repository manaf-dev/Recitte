<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { STAFF_NAME_MAX, type StaffRole } from '@recitte/shared'
import FormField from '@/components/FormField.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import { signOut } from '@/composables/useAuth'
import { useProfile, type EmailField, type NameField } from '@/composables/useProfile'

const ROLE_LABELS: Record<StaffRole, string> = { super_admin: 'Super admin', staff: 'Staff' }

const router = useRouter()
const { profile, firstName, lastName, newEmail, currentPassword, nameChanged, saveName, changeEmail } = useProfile()

type Feedback = { kind: 'ok' | 'error'; text: string } | null

const roleLabel = computed(() => (profile.value ? ROLE_LABELS[profile.value.role] : ''))

const nameErrors = ref<Partial<Record<NameField, string>>>({})
const nameFeedback = ref<Feedback>(null)
const savingName = ref(false)

const emailErrors = ref<Partial<Record<EmailField, string>>>({})
const emailFeedback = ref<Feedback>(null)
const savingEmail = ref(false)
/** A failure that leaves the sign-in email unknown; shown above the cards, not under a field. */
const emailAlert = ref('')

async function onSaveName() {
  nameFeedback.value = null
  nameErrors.value = {}
  savingName.value = true
  const result = await saveName()
  savingName.value = false
  if (result.ok) {
    nameFeedback.value = { kind: 'ok', text: 'Name saved.' }
  } else if (result.field) {
    nameErrors.value = { [result.field]: result.error }
  } else {
    nameFeedback.value = { kind: 'error', text: `Not saved. ${result.error}` }
  }
}

async function onChangeEmail() {
  emailFeedback.value = null
  emailErrors.value = {}
  emailAlert.value = ''
  savingEmail.value = true
  const result = await changeEmail()
  savingEmail.value = false
  if (result.ok) {
    emailFeedback.value = { kind: 'ok', text: 'Email changed. Use it the next time you sign in.' }
  } else if (result.reason === 'session') {
    await signOut()
    await router.replace({ name: 'login', query: { redirect: '/profile' } })
  } else if (result.reason === 'uncertain') {
    emailAlert.value = result.error
  } else if (result.field) {
    emailErrors.value = { [result.field]: result.error }
  }
}
</script>

<template>
  <h1 class="page-title">Your profile</h1>

  <div v-if="emailAlert" class="notice notice-error" role="alert" data-test="email-alert">{{ emailAlert }}</div>

  <section class="card p-7" aria-labelledby="profile-name-title">
    <form id="profile-name-form" class="flex flex-col gap-5" novalidate @submit.prevent="onSaveName">
      <div class="flex flex-col gap-1">
        <h2 id="profile-name-title" class="card-title">Name</h2>
        <p class="m-0 text-[14px] text-muted" data-test="profile-role">Role: {{ roleLabel }}</p>
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField id="profile-first-name" label="First name" required :error="nameErrors.first_name">
          <template #default="{ id, describedBy, invalid }">
            <input
              :id="id"
              v-model="firstName"
              type="text"
              autocomplete="given-name"
              :maxlength="STAFF_NAME_MAX"
              class="input"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            />
          </template>
        </FormField>
        <FormField id="profile-last-name" label="Last name" required :error="nameErrors.last_name">
          <template #default="{ id, describedBy, invalid }">
            <input
              :id="id"
              v-model="lastName"
              type="text"
              autocomplete="family-name"
              :maxlength="STAFF_NAME_MAX"
              class="input"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            />
          </template>
        </FormField>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <button type="submit" class="btn btn-primary" :disabled="savingName || !nameChanged">
          {{ savingName ? 'Saving…' : 'Save' }}
        </button>
        <span
          v-if="nameFeedback"
          :class="nameFeedback.kind === 'ok' ? 'text-[13px] font-semibold text-ok' : 'field-error'"
          role="status"
          data-test="name-feedback"
        >
          {{ nameFeedback.text }}
        </span>
      </div>
    </form>
  </section>

  <section class="card p-7" aria-labelledby="profile-email-title">
    <form id="profile-email-form" class="flex flex-col gap-5" novalidate @submit.prevent="onChangeEmail">
      <div class="flex flex-col gap-1">
        <h2 id="profile-email-title" class="card-title">Sign-in email</h2>
        <p class="m-0 text-[14px] text-muted">
          Current email: <span class="break-all font-semibold text-ink" data-test="current-email">{{ profile?.email }}</span>
        </p>
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField id="profile-new-email" label="New email" required :error="emailErrors.email">
          <template #default="{ id, describedBy, invalid }">
            <input
              :id="id"
              v-model="newEmail"
              type="email"
              autocomplete="email"
              inputmode="email"
              class="input"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            />
          </template>
        </FormField>
        <FormField id="profile-current-password" label="Current password" required :error="emailErrors.current_password">
          <template #default="{ id, describedBy, invalid }">
            <PasswordInput
              :id="id"
              v-model="currentPassword"
              autocomplete="current-password"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            />
          </template>
        </FormField>
      </div>
      <p class="m-0 text-[13px] text-muted">You will sign in with the new email from now on. No confirmation email is sent.</p>
      <div class="flex flex-wrap items-center gap-4">
        <button type="submit" class="btn btn-primary" :disabled="savingEmail">
          {{ savingEmail ? 'Changing…' : 'Change email' }}
        </button>
        <span
          v-if="emailFeedback"
          :class="emailFeedback.kind === 'ok' ? 'text-[13px] font-semibold text-ok' : 'field-error'"
          role="status"
          data-test="email-feedback"
        >
          {{ emailFeedback.text }}
        </span>
      </div>
    </form>
  </section>
</template>

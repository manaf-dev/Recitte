<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { isValidEmail } from '@recitte/shared'
import BrandBar from '@/components/BrandBar.vue'
import { requestMagicLink } from '@/composables/useAuth'

const route = useRoute()

const email = ref('')
const state = ref<'idle' | 'sending' | 'sent'>('idle')
const fieldError = ref('')
const error = ref<{ kind: 'not_invited' | 'other'; message: string } | null>(null)

const reasonNotice = computed(() => {
  if (route.query.reason === 'no-access') {
    return 'That account does not have access to the admin. Ask the super admin to invite you.'
  }
  if (route.query.reason === 'error') return 'We could not check your access. Request a new sign-in link.'
  return ''
})

async function submit() {
  error.value = null
  fieldError.value = ''
  if (!isValidEmail(email.value)) {
    fieldError.value = 'Enter a valid email address.'
    return
  }
  state.value = 'sending'
  const result = await requestMagicLink(email.value, route.query.redirect)
  if (result.ok) {
    state.value = 'sent'
    return
  }
  state.value = 'idle'
  error.value = { kind: result.reason === 'not_invited' ? 'not_invited' : 'other', message: result.message }
}

function startOver() {
  state.value = 'idle'
  error.value = null
}
</script>

<template>
  <div class="min-h-screen bg-ground">
    <header class="bg-ink text-white">
      <div class="mx-auto flex max-w-[1240px] items-center px-6 py-4">
        <BrandBar />
      </div>
    </header>

    <main class="mx-auto flex max-w-[480px] flex-col gap-6 px-6 pb-20 pt-16">
      <h1 class="page-title">Sign in</h1>

      <p v-if="reasonNotice" class="notice notice-info" role="status">{{ reasonNotice }}</p>

      <section v-if="state === 'sent'" class="card flex flex-col gap-4 p-7" aria-live="polite">
        <h2 class="card-title">Check your email</h2>
        <p class="m-0 text-[15px]">
          We sent a sign-in link to <strong class="text-ink">{{ email.trim() }}</strong>. Open it on this device to
          continue. The link works once and expires after an hour.
        </p>
        <p class="m-0 text-[13px] text-muted">Nothing arrived? Check spam, or send another link.</p>
        <div>
          <button type="button" class="btn btn-secondary btn-small" @click="startOver">Use a different email</button>
        </div>
      </section>

      <form v-else class="card flex flex-col gap-5 p-7" novalidate @submit.prevent="submit">
        <p class="m-0 text-[15px]">
          Enter your staff email and we will send you a link to sign in. There is no password.
        </p>

        <div class="field">
          <label for="login-email" class="field-label">Email</label>
          <input
            id="login-email"
            v-model="email"
            class="input"
            type="email"
            name="email"
            autocomplete="email"
            inputmode="email"
            required
            :aria-invalid="fieldError ? 'true' : undefined"
            :aria-describedby="fieldError ? 'login-email-error' : undefined"
          />
          <span v-if="fieldError" id="login-email-error" class="field-error">{{ fieldError }}</span>
        </div>

        <div
          v-if="error"
          class="notice"
          :class="error.kind === 'not_invited' ? 'notice-info' : 'notice-error'"
          role="alert"
        >
          {{ error.message }}
        </div>

        <div>
          <button type="submit" class="btn btn-primary" :disabled="state === 'sending'">
            {{ state === 'sending' ? 'Sending…' : 'Email me a sign-in link' }}
          </button>
        </div>
        <p class="m-0 text-[13px] text-muted">
          New to the team? The super admin sends you an invite first.
        </p>
      </form>
    </main>
  </div>
</template>

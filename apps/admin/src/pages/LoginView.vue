<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isValidEmail } from '@recitte/shared'
import FormField from '@/components/FormField.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import { safeRedirect, signInWithPassword } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()

const form = reactive({ email: '', password: '' })
const fieldErrors = ref<{ email?: string; password?: string }>({})
const signingIn = ref(false)
const error = ref('')

const reasonNotice = computed(() => {
  if (route.query.reason === 'no-access') {
    return 'That account does not have access to the admin. Ask the super admin to invite you.'
  }
  if (route.query.reason === 'error') return 'We could not check your access. Sign in again.'
  if (route.query.reason === 'password-set') return 'Your password is set. Sign in with your email and new password.'
  return ''
})

async function submit() {
  error.value = ''
  fieldErrors.value = {}
  if (!isValidEmail(form.email)) fieldErrors.value.email = 'Enter a valid email address.'
  if (!form.password) fieldErrors.value.password = 'Enter your password.'
  if (fieldErrors.value.email || fieldErrors.value.password) return

  signingIn.value = true
  const result = await signInWithPassword(form.email, form.password)
  if (!result.ok) {
    signingIn.value = false
    error.value = result.message
    return
  }
  // The route guard checks for a staff row on the way in.
  await router.replace(safeRedirect(route.query.redirect) ?? { name: 'overview' })
  signingIn.value = false
}
</script>

<template>
  <div class="grid min-h-screen grid-rows-[auto_1fr] bg-ground">
    <header class="bg-ink px-6 py-5 sm:px-10">
      <img src="/logo-word-navy.png" alt="Recitte" class="block h-[28px] w-auto" width="91" height="28" />
    </header>

    <main class="flex items-center justify-center px-6 py-12 sm:px-12">
      <div class="flex w-full max-w-[420px] flex-col gap-8">
        <div class="flex flex-col gap-2">
          <h1 class="page-title text-[clamp(40px,4vw,52px)]">Sign in</h1>
          <p class="m-0 text-[16px] text-ink/80">Use your staff email and password.</p>
        </div>

        <p v-if="reasonNotice" class="notice notice-info m-0" role="status">{{ reasonNotice }}</p>

        <form class="flex flex-col gap-5" novalidate @submit.prevent="submit">
          <FormField id="login-email" label="Email" :error="fieldErrors.email">
            <template #default="{ id, describedBy, invalid }">
              <input
                :id="id"
                v-model="form.email"
                class="input"
                type="email"
                name="email"
                autocomplete="email"
                inputmode="email"
                placeholder="you@recitte.org"
                required
                :aria-describedby="describedBy"
                :aria-invalid="invalid"
              />
            </template>
          </FormField>

          <FormField id="login-password" label="Password" :error="fieldErrors.password">
            <template #default="{ id, describedBy, invalid }">
              <PasswordInput
                :id="id"
                v-model="form.password"
                name="password"
                autocomplete="current-password"
                placeholder="Enter your password"
                required
                :aria-describedby="describedBy"
                :aria-invalid="invalid"
              />
            </template>
          </FormField>

          <div v-if="error" class="notice notice-error" role="alert">{{ error }}</div>

          <button type="submit" class="btn btn-primary mt-1 w-full" :disabled="signingIn">
            {{ signingIn ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="m-0 text-[14px] text-muted">
          New to the team? The super admin sends you an invite to set your password.
        </p>
      </div>
    </main>
  </div>
</template>

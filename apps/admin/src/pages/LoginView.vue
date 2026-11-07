<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isValidEmail } from '@recitte/shared'
import BrandBar from '@/components/BrandBar.vue'
import FormField from '@/components/FormField.vue'
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
  <div class="min-h-screen bg-ground">
    <header class="bg-ink text-white">
      <div class="mx-auto flex max-w-[1240px] items-center px-6 py-4">
        <BrandBar />
      </div>
    </header>

    <main class="mx-auto flex max-w-[480px] flex-col gap-6 px-6 pb-20 pt-16">
      <h1 class="page-title">Sign in</h1>

      <p v-if="reasonNotice" class="notice notice-info" role="status">{{ reasonNotice }}</p>

      <form class="card flex flex-col gap-5 p-7" novalidate @submit.prevent="submit">
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
              required
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            />
          </template>
        </FormField>

        <FormField id="login-password" label="Password" :error="fieldErrors.password">
          <template #default="{ id, describedBy, invalid }">
            <input
              :id="id"
              v-model="form.password"
              class="input"
              type="password"
              name="password"
              autocomplete="current-password"
              required
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            />
          </template>
        </FormField>

        <div v-if="error" class="notice notice-error" role="alert">{{ error }}</div>

        <div>
          <button type="submit" class="btn btn-primary" :disabled="signingIn">
            {{ signingIn ? 'Signing in…' : 'Sign in' }}
          </button>
        </div>
        <p class="m-0 text-[13px] text-muted">
          New to the team? The super admin sends you an invite to set your password.
        </p>
      </form>
    </main>
  </div>
</template>

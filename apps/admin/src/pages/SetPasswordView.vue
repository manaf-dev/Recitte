<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BrandBar from '@/components/BrandBar.vue'
import FormField from '@/components/FormField.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import { MIN_PASSWORD_LENGTH, useSetPassword } from '@/composables/useSetPassword'

const { phase, problem, linkError, linkType, busy, form, errors, submitError, start, accept, submit } = useSetPassword(useRouter())

onMounted(() => start())
</script>

<template>
  <div class="min-h-screen bg-ground">
    <header class="bg-ink text-white">
      <div class="mx-auto flex max-w-[1240px] items-center px-6 py-4">
        <BrandBar />
      </div>
    </header>
    <main class="mx-auto flex max-w-[480px] flex-col gap-6 px-6 pb-20 pt-16">
      <section v-if="phase === 'invalid'" class="card flex flex-col gap-4 p-7" role="alert">
        <h1 class="card-title">This link does not work</h1>
        <p class="m-0 text-[15px]">{{ problem }}</p>
        <div>
          <RouterLink :to="{ name: 'login' }" class="btn btn-primary">Back to sign in</RouterLink>
        </div>
      </section>

      <section v-else-if="phase === 'accept'" class="card flex flex-col gap-4 p-7">
        <h1 class="card-title">{{ linkType === 'invite' ? 'Welcome to Recitte Admin' : 'Set your password' }}</h1>
        <p class="m-0 text-[15px]">
          {{
            linkType === 'invite'
              ? 'Accept your invite, then choose a password to sign in with.'
              : 'Continue, then choose a password to sign in with.'
          }}
        </p>
        <div v-if="linkError" class="notice notice-error" role="alert">{{ linkError }}</div>
        <div>
          <button type="button" class="btn btn-primary" :disabled="busy" data-autofocus @click="accept">
            {{ busy ? 'Checking the link…' : linkError ? 'Try again' : linkType === 'invite' ? 'Accept invite' : 'Continue' }}
          </button>
        </div>
      </section>

      <form v-else-if="phase === 'form'" class="card flex flex-col gap-5 p-7" novalidate @submit.prevent="submit">
        <h1 class="card-title">Set your password</h1>
        <p class="m-0 text-[15px]">You will use it with your staff email to sign in.</p>

        <FormField
          id="new-password"
          label="New password"
          required
          :hint="`At least ${MIN_PASSWORD_LENGTH} characters.`"
          :error="errors.password"
        >
          <template #default="{ id, describedBy, invalid }">
            <PasswordInput
              :id="id"
              v-model="form.password"
              name="new-password"
              autocomplete="new-password"
              required
              :minlength="MIN_PASSWORD_LENGTH"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            />
          </template>
        </FormField>

        <FormField id="confirm-password" label="Confirm password" required :error="errors.confirm">
          <template #default="{ id, describedBy, invalid }">
            <PasswordInput
              :id="id"
              v-model="form.confirm"
              name="confirm-password"
              autocomplete="new-password"
              required
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            />
          </template>
        </FormField>

        <div v-if="submitError" class="notice notice-error" role="alert">{{ submitError }}</div>

        <div>
          <button type="submit" class="btn btn-primary" :disabled="busy">
            {{ busy ? 'Saving…' : 'Set password' }}
          </button>
        </div>
      </form>

      <p v-else class="text-[15px] text-muted" role="status">Checking your invite link…</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandBar from '@/components/BrandBar.vue'
import { consumeRedirect, initAuth } from '@/composables/useAuth'

const router = useRouter()
const problem = ref('')

/** GoTrue puts link errors (expired, already used) in the hash or the query. */
function linkError(): string {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const code = params.get('error_code') ?? query.get('error_code')
  const description = params.get('error_description') ?? query.get('error_description')
  if (code === 'otp_expired') return 'This sign-in link has expired or was already used.'
  return description ? description.replace(/\+/g, ' ') : ''
}

onMounted(async () => {
  const session = await initAuth()
  if (session) {
    // The route guard checks for a staff row on the way in.
    await router.replace(consumeRedirect() ?? { name: 'overview' })
    return
  }
  problem.value = linkError() || 'This sign-in link is not valid.'
})
</script>

<template>
  <div class="min-h-screen bg-ground">
    <header class="bg-ink text-white">
      <div class="mx-auto flex max-w-[1240px] items-center px-6 py-4">
        <BrandBar />
      </div>
    </header>
    <main class="mx-auto flex max-w-[480px] flex-col gap-6 px-6 pb-20 pt-16">
      <p v-if="!problem" class="text-[15px] text-muted" role="status">Signing you in…</p>
      <section v-else class="card flex flex-col gap-4 p-7" role="alert">
        <h1 class="card-title">Could not sign you in</h1>
        <p class="m-0 text-[15px]">{{ problem }} Request a new link to continue.</p>
        <div>
          <RouterLink :to="{ name: 'login' }" class="btn btn-primary">Back to sign in</RouterLink>
        </div>
      </section>
    </main>
  </div>
</template>

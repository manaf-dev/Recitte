<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useStaffProfile } from '@/composables/useStaffProfile'

const router = useRouter()
const { signOut } = useAuth()
const { profile } = useStaffProfile()

async function leave() {
  await signOut()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <main class="mx-auto flex max-w-[1240px] flex-col gap-4 px-6 py-10">
    <h1 class="page-title">Assalamu alaikum.</h1>
    <p>Signed in as {{ profile?.email }}.</p>
    <div><button type="button" class="btn btn-secondary" @click="leave">Sign out</button></div>
  </main>
</template>

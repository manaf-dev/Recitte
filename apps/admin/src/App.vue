<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { session } = useAuth()

// Signed out elsewhere (another tab, expired refresh token): leave the admin.
// Ignored before the first navigation settles; the route guard handles that.
watch(session, (next, prev) => {
  if (prev && !next && route.matched.length > 0 && !route.meta.public) {
    void router.replace({ name: 'login', query: { redirect: route.fullPath } })
  }
})
</script>

<template>
  <RouterView />
</template>

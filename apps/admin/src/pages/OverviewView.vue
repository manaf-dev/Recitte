<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useOverview } from '@/composables/useOverview'
import { formatDateTime } from '@/lib/format'

const { counts, recent, loading, error, load } = useOverview()

const tiles = computed(() => {
  const c = counts.value
  return [
    { label: 'New applications', value: c?.applications, to: '/applications' },
    { label: 'New registrations', value: c?.registrations, to: '/registrations' },
    { label: 'New messages', value: c?.contacts, to: '/messages' },
    { label: 'Programs open', value: c?.openPrograms, to: '/programs' },
  ]
})

onMounted(load)
</script>

<template>
  <h1 class="page-title">Assalamu alaikum.</h1>

  <div v-if="error" class="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
    <span>Could not load the overview. {{ error }}</span>
    <button type="button" class="btn btn-secondary btn-small" @click="load">Try again</button>
  </div>

  <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4" :aria-busy="loading">
    <RouterLink
      v-for="tile in tiles"
      :key="tile.label"
      :to="tile.to"
      class="card flex flex-col gap-1.5 p-6 text-left no-underline transition-colors hover:border-gold"
    >
      <span class="font-display text-[48px] font-semibold leading-none text-ink lining-nums">{{ tile.value ?? '–' }}</span>
      <span class="text-[14px] font-semibold text-[#2b2b2b]">{{ tile.label }}</span>
    </RouterLink>
  </div>

  <section class="card flex flex-col gap-3 p-6" aria-labelledby="recent-heading">
    <h2 id="recent-heading" class="eyebrow m-0">Recent activity</h2>
    <p v-if="loading && !recent.length" class="m-0 text-[14px] text-muted">Loading…</p>
    <p v-else-if="!recent.length && !error" class="m-0 text-[14px] text-muted">
      No submissions yet. Applications, registrations and messages from the site appear here.
    </p>
    <ul v-else class="m-0 list-none p-0">
      <li v-for="item in recent" :key="item.key" class="border-t border-rule">
        <RouterLink
          :to="item.to"
          class="flex flex-wrap justify-between gap-x-3 gap-y-1 py-2.5 text-[14px] text-[#2b2b2b] no-underline hover:text-gold-deep"
        >
          <span class="min-w-0"><strong class="text-ink">{{ item.kind }}</strong> · {{ item.text }}</span>
          <time :datetime="item.created_at" class="text-muted">{{ formatDateTime(item.created_at) }}</time>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

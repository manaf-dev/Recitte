<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandBar from '@/components/BrandBar.vue'
import { useAuth } from '@/composables/useAuth'
import { useStaffProfile } from '@/composables/useStaffProfile'
import { publicSiteUrl } from '@/lib/supabase'

interface NavItem {
  label: string
  to: string
}

const route = useRoute()
const router = useRouter()
const { signOut } = useAuth()
const { profile, isSuperAdmin } = useStaffProfile()

const BASE_NAV: NavItem[] = [
  { label: 'Overview', to: '/' },
  { label: 'Programs', to: '/programs' },
  { label: 'Applications', to: '/applications' },
  { label: 'Registrations', to: '/registrations' },
  { label: 'Messages', to: '/messages' },
  { label: 'Testimonials', to: '/testimonials' },
  { label: 'Content & links', to: '/content' },
]

const nav = computed<NavItem[]>(() =>
  isSuperAdmin.value ? [...BASE_NAV, { label: 'Staff', to: '/staff' }] : BASE_NAV,
)

function isActive(item: NavItem) {
  if (item.to === '/') return route.path === '/'
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

async function leave() {
  await signOut()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-ground">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-ink"
    >
      Skip to content
    </a>
    <header class="bg-ink text-white">
      <div class="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-4">
        <BrandBar />
        <div class="flex flex-wrap items-center gap-3">
          <span v-if="profile" class="hidden text-[13px] text-[#dcdbe6] md:inline">{{ profile.email }}</span>
          <a
            v-if="publicSiteUrl"
            :href="publicSiteUrl"
            target="_blank"
            rel="noopener"
            class="btn btn-small border-soft text-soft hover:bg-white/10"
          >
            View site<span class="sr-only"> (opens in a new tab)</span>
          </a>
          <button type="button" class="btn btn-small border-white/40 text-white hover:bg-white/10" @click="leave">
            Sign out
          </button>
        </div>
      </div>
      <nav class="mx-auto max-w-[1240px] px-6" aria-label="Admin sections">
        <ul class="m-0 flex list-none gap-1 overflow-x-auto p-0">
          <li v-for="item in nav" :key="item.to" class="shrink-0">
            <RouterLink
              :to="item.to"
              class="block whitespace-nowrap px-[18px] py-3 text-[14px] font-semibold no-underline transition-colors focus-visible:-outline-offset-2"
              :class="isActive(item) ? 'bg-[#f6f6f6] text-ink' : 'text-[#dcdbe6] hover:text-white'"
              :aria-current="isActive(item) ? 'page' : undefined"
            >
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>
    </header>

    <main id="main" class="mx-auto flex max-w-[1240px] flex-col gap-6 px-6 pb-20 pt-10" tabindex="-1">
      <RouterView />
    </main>
  </div>
</template>

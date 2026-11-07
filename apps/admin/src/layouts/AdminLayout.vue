<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { staffDisplayName } from '@recitte/shared'
import NavIcon, { type NavIconName } from '@/components/NavIcon.vue'
import { useAuth } from '@/composables/useAuth'
import { useStaffProfile } from '@/composables/useStaffProfile'
import { publicSiteUrl } from '@/lib/supabase'

interface NavItem {
  label: string
  to: string
  icon: NavIconName
}

const route = useRoute()
const router = useRouter()
const { signOut } = useAuth()
const { profile, isSuperAdmin } = useStaffProfile()

// Order follows the design: content, the three inboxes, settings, then Staff.
const BASE_NAV: NavItem[] = [
  { label: 'Overview', to: '/', icon: 'overview' },
  { label: 'Programs', to: '/programs', icon: 'programs' },
  { label: 'Applications', to: '/applications', icon: 'applications' },
  { label: 'Registrations', to: '/registrations', icon: 'registrations' },
  { label: 'Messages', to: '/messages', icon: 'messages' },
  { label: 'Testimonials', to: '/testimonials', icon: 'testimonials' },
  { label: 'Content & links', to: '/content', icon: 'content' },
]
const STAFF_NAV: NavItem = { label: 'Staff', to: '/staff', icon: 'staff' }

const nav = computed(() => (isSuperAdmin.value ? [...BASE_NAV, STAFF_NAV] : BASE_NAV))

const drawerOpen = ref(false)
const menuOpen = ref(false)
const menuEl = ref<HTMLElement | null>(null)

const pageTitle = computed(() => route.meta.title ?? 'Admin')
const displayName = computed(() => (profile.value ? staffDisplayName(profile.value) : ''))
/** Shown under the name in the account menu; skipped when the name already is the email. */
const secondaryEmail = computed(() =>
  profile.value && displayName.value !== profile.value.email ? profile.value.email : '',
)
const initials = computed(() => {
  const p = profile.value
  if (!p) return '?'
  const first = p.first_name?.trim().charAt(0) ?? ''
  const last = p.last_name?.trim().charAt(0) ?? ''
  return (first + last || p.email.charAt(0)).toUpperCase()
})
const roleLabel = computed(() => (isSuperAdmin.value ? 'Super admin' : 'Staff'))

function isActive(item: NavItem) {
  if (item.to === '/') return route.path === '/'
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
    menuOpen.value = false
  },
)

function onDocClick(e: MouseEvent) {
  if (menuOpen.value && menuEl.value && !menuEl.value.contains(e.target as Node)) menuOpen.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  menuOpen.value = false
  drawerOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})

async function leave() {
  await signOut()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-ground lg:pl-[248px]">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-ink"
    >
      Skip to content
    </a>

    <div v-if="drawerOpen" class="fixed inset-0 z-40 bg-ink/40 lg:hidden" aria-hidden="true" @click="drawerOpen = false" />

    <aside
      id="admin-sidebar"
      class="fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col bg-ink text-white transition-transform duration-200 lg:translate-x-0"
      :class="drawerOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-16 items-center gap-3 px-6">
        <img src="/logo-word-navy.png" alt="Recitte" class="block h-[24px] w-auto" width="80" height="24" />
        <span class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Admin</span>
      </div>
      <nav class="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin sections">
        <ul class="m-0 flex list-none flex-col gap-0.5 p-0">
          <li v-for="item in nav" :key="item.to" :class="{ 'mt-3 border-t border-white/10 pt-3': item.to === '/staff' }">
            <RouterLink
              :to="item.to"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold no-underline transition-colors"
              :class="isActive(item) ? 'bg-white/12 text-white' : 'text-[#b9b8c8] hover:bg-white/6 hover:text-white'"
              :aria-current="isActive(item) ? 'page' : undefined"
            >
              <NavIcon :name="item.icon" :class="isActive(item) ? 'text-gold' : ''" />
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>
      <a
        v-if="publicSiteUrl"
        :href="publicSiteUrl"
        target="_blank"
        rel="noopener"
        class="mx-3 mb-4 flex items-center justify-between rounded-xl border border-white/15 px-3 py-2.5 text-[13px] font-semibold text-soft no-underline hover:bg-white/6"
      >
        View public site <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span>
      </a>
    </aside>

    <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-8">
      <button
        type="button"
        class="-ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-ground lg:hidden"
        aria-controls="admin-sidebar"
        :aria-expanded="drawerOpen"
        aria-label="Open navigation"
        @click.stop="drawerOpen = true"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span class="truncate text-[15px] font-bold text-ink">{{ pageTitle }}</span>

      <div ref="menuEl" class="relative ml-auto">
        <button
          type="button"
          class="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-ground"
          aria-haspopup="menu"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-soft text-[13px] font-bold text-ink">{{ initials }}</span>
          <span class="hidden flex-col items-start leading-tight sm:flex">
            <span class="max-w-[220px] truncate text-[13px] font-semibold text-ink" data-test="account-name">{{ displayName }}</span>
            <span class="text-[12px] text-muted">{{ roleLabel }}</span>
          </span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="text-muted" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <div
          v-if="menuOpen"
          role="menu"
          class="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_16px_40px_-16px_rgba(32,37,69,.35)]"
        >
          <div class="flex flex-col gap-0.5 border-b border-rule px-4 py-3" data-test="account-summary">
            <span class="truncate text-[13px] font-semibold text-ink">{{ displayName }}</span>
            <span v-if="secondaryEmail" class="truncate text-[12px] text-muted">{{ secondaryEmail }}</span>
            <span class="text-[12px] text-muted sm:hidden">{{ roleLabel }}</span>
          </div>
          <a
            v-if="publicSiteUrl"
            :href="publicSiteUrl"
            target="_blank"
            rel="noopener"
            role="menuitem"
            class="block px-4 py-2.5 text-[14px] text-ink no-underline hover:bg-ground"
          >
            View public site
          </a>
          <button type="button" role="menuitem" class="block w-full px-4 py-2.5 text-left text-[14px] text-danger hover:bg-ground" @click="leave">
            Sign out
          </button>
        </div>
      </div>
    </header>

    <main id="main" class="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 pb-20 pt-8 sm:px-8" tabindex="-1">
      <RouterView />
    </main>
  </div>
</template>

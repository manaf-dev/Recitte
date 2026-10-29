<script setup lang="ts">
const route = useRoute()
const menuOpen = ref(false)

const nav = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/connect', label: 'Connect' },
  { to: '/academy', label: 'Academy' },
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  if (route.path.startsWith(to)) return true
  return false
}

watch(
  () => route.fullPath,
  () => (menuOpen.value = false),
)
</script>

<template>
  <header class="sticky top-0 z-30 bg-ground">
    <div class="wrap flex items-center justify-between gap-6 py-3">
      <NuxtLink to="/" aria-label="Recitte home" class="flex items-center gap-3">
        <img src="/images/recitte-mark.png" alt="" width="48" height="48" class="block h-12 w-auto" />
        <img src="/images/recitte-wordmark.png" alt="Recitte" width="120" height="28" class="block h-7 w-auto" />
      </NuxtLink>

      <nav aria-label="Main" class="hidden items-center gap-1 min-[940px]:flex">
        <NuxtLink
          v-for="n in nav"
          :key="n.to"
          :to="n.to"
          class="rounded-full px-4 py-2 text-sm whitespace-nowrap no-underline transition-colors hover:text-ink"
          :class="isActive(n.to) ? 'bg-stone font-bold text-ink' : 'font-medium text-[#4a4a58]'"
          :aria-current="isActive(n.to) ? 'page' : undefined"
        >
          {{ n.label }}
        </NuxtLink>
      </nav>
      <NuxtLink to="/contact" class="btn btn-ink btn-sm hidden min-[940px]:inline-flex">Contact us</NuxtLink>

      <button
        type="button"
        class="flex size-11 flex-col items-center justify-center gap-1.5 border-none bg-transparent p-0 min-[940px]:hidden"
        :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
        :aria-expanded="menuOpen"
        aria-controls="mobile-menu"
        @click="menuOpen = !menuOpen"
      >
        <span class="block h-0.5 w-[26px] bg-ink transition-transform" :class="menuOpen && 'translate-y-2 rotate-45'" />
        <span class="block h-0.5 w-[26px] bg-ink transition-opacity" :class="menuOpen && 'opacity-0'" />
        <span class="block h-0.5 w-[26px] bg-ink transition-transform" :class="menuOpen && '-translate-y-2 -rotate-45'" />
      </button>
    </div>

    <div v-if="menuOpen" id="mobile-menu" class="wrap flex flex-col gap-1 bg-ground pt-2 pb-5 min-[940px]:hidden">
      <NuxtLink
        v-for="n in nav"
        :key="n.to"
        :to="n.to"
        class="rounded-2xl px-4 py-3.5 text-left text-[17px] no-underline"
        :class="isActive(n.to) ? 'bg-stone font-bold text-ink' : 'font-medium text-[#4a4a4a]'"
        :aria-current="isActive(n.to) ? 'page' : undefined"
      >
        {{ n.label }}
      </NuxtLink>
      <NuxtLink to="/contact" class="btn btn-ink mt-3">Contact us</NuxtLink>
    </div>
  </header>
</template>

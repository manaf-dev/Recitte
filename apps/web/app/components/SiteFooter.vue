<script setup lang="ts">
const { canJoin, activeSocials } = useSiteSettings()
const { openApply, openJoin } = useDialogs()
const year = new Date().getFullYear()

const explore = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/connect', label: 'Connect' },
  { to: '/academy', label: 'Academy' },
]
const linkClass =
  'border-none bg-transparent p-0 text-left text-[17px] text-mist no-underline hover:text-white cursor-pointer'
</script>

<template>
  <footer class="on-ink bg-ink text-mist">
    <div class="wrap flex flex-col gap-12 pt-16 pb-10">
      <div class="grid-fit-200 gap-10">
        <div class="flex flex-col gap-3.5">
          <img src="/images/logo-full-navy.png" alt="Recitte" width="120" height="141" class="-ml-2 block h-auto w-[120px]" />
          <p class="m-0 max-w-[280px]">Reconnecting Muslims with the Qur'an, a few minutes, every day.</p>
        </div>
        <nav aria-label="Explore" class="flex flex-col gap-3">
          <span class="font-bold text-gold">Explore</span>
          <NuxtLink v-for="n in explore" :key="n.to" :to="n.to" :class="linkClass">{{ n.label }}</NuxtLink>
        </nav>
        <div class="flex flex-col gap-3">
          <span class="font-bold text-gold">Get involved</span>
          <button v-if="canJoin" type="button" :class="linkClass" @click="openJoin()">Join Recitte Community</button>
          <button type="button" :class="linkClass" @click="openApply()">Apply to Recitte Academy</button>
          <NuxtLink to="/contact" :class="linkClass">Contact us</NuxtLink>
        </div>
        <div v-if="activeSocials.length" class="flex flex-col gap-3">
          <span class="font-bold text-gold">Follow</span>
          <SocialLinks />
        </div>
      </div>
      <div class="flex flex-wrap justify-between gap-4 text-sm">
        <span>© {{ year }} Recitte. All rights reserved.</span>
        <span>Guided by the Qur'an and the Sunnah.</span>
      </div>
    </div>
  </footer>
</template>

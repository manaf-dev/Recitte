<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'footer' | 'hero' }>(), { tone: 'footer' })
const { activeSocials } = useSiteSettings()
</script>

<template>
  <div v-if="activeSocials.length" class="flex flex-wrap gap-2.5">
    <a
      v-for="s in activeSocials"
      :key="s.platform"
      :href="s.url"
      target="_blank"
      rel="noopener"
      :aria-label="s.label"
      :title="s.label"
      class="flex size-11 items-center justify-center rounded-full text-soft transition-colors hover:text-soft"
      :class="tone === 'hero' ? 'bg-white/8 hover:bg-white/18' : 'bg-white/10 hover:bg-white/20'"
    >
      <SocialIcon :platform="s.platform" />
    </a>
  </div>
</template>

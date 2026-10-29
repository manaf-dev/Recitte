<script setup lang="ts">
import type { Picture } from '~/content/siteCopy'

withDefaults(defineProps<{ picture: Picture; title: string; lead: string; position?: string }>(), {
  position: 'center',
})
</script>

<template>
  <section class="on-ink relative overflow-hidden bg-ink text-white">
    <img class="hero-img" :src="picture.src" :alt="picture.alt" width="1600" height="900" :style="{ objectPosition: position }" />
    <div class="hero-scrim" />
    <div class="wrap relative z-[1] flex min-h-[clamp(440px,64svh,620px)] items-center py-18">
      <div class="flex max-w-[640px] flex-col gap-6">
        <h1 class="h1">{{ title }}</h1>
        <p class="lead max-w-[560px] text-haze">{{ lead }}</p>
        <div v-if="$slots.default" class="flex flex-wrap gap-3 pt-1"><slot /></div>
      </div>
    </div>
  </section>
</template>

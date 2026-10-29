<script setup lang="ts">
import type { TitledText } from '~/content/siteCopy'

defineProps<{ items: TitledText[] }>()
</script>

<template>
  <div v-for="item in items" :key="item.title" class="flex items-start gap-4.5">
    <span class="dot mt-3" />
    <div class="flex flex-col gap-1.5">
      <h3 class="h4">{{ item.title }}</h3>
      <p class="m-0">{{ item.text }}</p>
    </div>
  </div>
</template>

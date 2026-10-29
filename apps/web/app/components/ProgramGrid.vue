<script setup lang="ts">
import type { Program } from '@recitte/shared'

defineProps<{ programs: Program[] }>()
</script>

<template>
  <div class="grid-fit-320 gap-6">
    <ProgramCard v-for="p in programs" :key="p.id" :program="p" />
  </div>
</template>

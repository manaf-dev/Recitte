<script setup lang="ts">
import type { Program } from '@recitte/shared'

const props = withDefaults(defineProps<{ program: Program; variant?: 'hero' | 'block' | 'card' }>(), {
  variant: 'card',
})
const { cta, visible, inactive, tone, run } = useProgramCta(() => props.program)
</script>

<template>
  <button
    v-if="visible"
    type="button"
    class="btn"
    :class="[
      variant === 'hero' ? (inactive ? 'btn-ghost' : 'btn-gold') : '',
      variant !== 'hero' && tone === 'inactive' ? 'btn-stone' : '',
      variant !== 'hero' && tone === 'gold' ? 'btn-gold' : '',
      variant !== 'hero' && tone === 'ink' ? 'btn-ink' : '',
      variant === 'block' ? 'w-full' : '',
      variant === 'card' ? 'min-w-0 flex-1' : '',
    ]"
    :aria-disabled="inactive || undefined"
    @click="run"
  >
    {{ cta.label }}
  </button>
</template>

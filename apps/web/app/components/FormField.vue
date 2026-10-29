<script setup lang="ts">
defineProps<{ label: string; error?: string; optional?: boolean; required?: boolean; id: string }>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="field-label">
      {{ label }}<template v-if="required"> *</template>
      <span v-if="optional" class="font-medium text-label"> (optional)</span>
    </label>
    <slot :invalid="!!error" :described-by="error ? `${id}-error` : undefined" />
    <span v-if="error" :id="`${id}-error`" class="field-error">{{ error }}</span>
  </div>
</template>

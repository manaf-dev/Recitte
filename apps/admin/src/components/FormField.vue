<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
}>()

const describedBy = computed(
  () => [props.hint && `${props.id}-hint`, props.error && `${props.id}-error`].filter(Boolean).join(' ') || undefined,
)
const invalid = computed<'true' | undefined>(() => (props.error ? 'true' : undefined))
</script>

<template>
  <div class="field">
    <label :for="id" class="field-label">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>
    <slot :id="id" :describedBy="describedBy" :invalid="invalid" />
    <span v-if="hint" :id="`${id}-hint`" class="field-hint">{{ hint }}</span>
    <span v-if="error" :id="`${id}-error`" class="field-error">{{ error }}</span>
  </div>
</template>

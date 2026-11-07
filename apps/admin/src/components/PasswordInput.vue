<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{
  id: string
  modelValue: string
  name?: string
  autocomplete?: string
  placeholder?: string
  inputClass?: string
  required?: boolean
  minlength?: number
  describedBy?: string
  invalid?: 'true' | undefined
}>(), { autocomplete: 'current-password' })

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const visible = ref(false)
</script>

<template>
  <div class="relative">
    <input
      :id="id"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :class="['input pr-12', inputClass]"
      :type="visible ? 'text' : 'password'"
      :name="name"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :required="required"
      :minlength="minlength"
      :aria-describedby="describedBy"
      :aria-invalid="invalid"
    />
    <button
      type="button"
      class="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-field border-0 bg-transparent text-muted transition-colors hover:text-ink focus-visible:text-ink"
      :aria-label="visible ? 'Hide password' : 'Show password'"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <template v-if="visible">
          <path d="M3 3l18 18" />
          <path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-3 3.9" />
          <path d="M6.6 6.6A15.7 15.7 0 0 0 2.5 12S6 19 12 19a9.6 9.6 0 0 0 4.3-1" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </template>
        <template v-else>
          <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="3" />
        </template>
      </svg>
    </button>
  </div>
</template>

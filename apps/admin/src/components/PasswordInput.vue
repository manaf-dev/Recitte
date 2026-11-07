<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{
  id: string
  modelValue: string
  name?: string
  autocomplete?: string
  required?: boolean
  minlength?: number
  describedBy?: string
  invalid?: 'true' | undefined
}>(), { autocomplete: 'current-password' })

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const visible = ref(false)
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      :id="id"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      class="input min-w-0 flex-1"
      :type="visible ? 'text' : 'password'"
      :name="name"
      :autocomplete="autocomplete"
      :required="required"
      :minlength="minlength"
      :aria-describedby="describedBy"
      :aria-invalid="invalid"
    />
    <button
      type="button"
      class="btn btn-secondary shrink-0 px-3"
      :aria-label="visible ? 'Hide password' : 'Show password'"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      {{ visible ? 'Hide' : 'Show' }}
    </button>
  </div>
</template>

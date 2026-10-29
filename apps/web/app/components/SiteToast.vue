<script setup lang="ts">
const { message } = useToast()
</script>

<template>
  <div aria-live="polite" class="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-5">
    <div
      v-if="message"
      class="animate-fade max-w-full rounded-full bg-ink px-5.5 py-3.5 text-sm text-white shadow-[0_16px_40px_-12px_rgba(32,37,69,.5)]"
    >
      {{ message }}
    </div>
  </div>
</template>

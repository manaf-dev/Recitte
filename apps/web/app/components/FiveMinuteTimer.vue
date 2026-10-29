<script setup lang="ts">
const { toggle, label, status, ringOffset } = useFiveMinuteTimer()
</script>

<template>
  <div class="relative aspect-square w-full [container-type:inline-size]">
    <svg viewBox="0 0 100 100" aria-hidden="true" class="absolute inset-0 size-full -rotate-90">
      <circle cx="50" cy="50" r="48.5" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2" />
      <circle
        class="hero-ring"
        cx="50"
        cy="50"
        r="48.5"
        fill="none"
        stroke="#B29B72"
        stroke-width="2.6"
        stroke-linecap="round"
        stroke-dasharray="304.7"
        :stroke-dashoffset="ringOffset"
      />
    </svg>
    <div class="absolute inset-[6%] flex flex-col items-center justify-center gap-[3%] rounded-full bg-soft p-[10%] text-center text-ink">
      <span lang="ar" dir="rtl" class="font-arabic text-[max(20px,9cqw)] leading-[1.6]">وَرَتِّلِ ٱلْقُرْءَانَ تَرْتِيلًا</span>
      <span class="text-sm font-bold">Al-Muzzammil 73:4</span>
    </div>
    <button type="button" class="btn btn-gold absolute -bottom-6 left-1/2 -translate-x-1/2" @click="toggle">{{ label }}</button>
    <span class="sr-only-live" aria-live="polite">{{ status }}</span>
  </div>
</template>

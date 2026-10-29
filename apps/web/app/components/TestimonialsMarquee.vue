<script setup lang="ts">
const { testimonials } = useTestimonials()
</script>

<template>
  <section v-if="testimonials.length" class="overflow-hidden bg-white" aria-labelledby="testimonials-heading">
    <div class="wrap pt-[120px] pb-12">
      <h2 id="testimonials-heading" class="h2">What people say about our sessions</h2>
    </div>
    <div class="marquee pb-[120px]" tabindex="0" aria-label="Testimonials, scrolling. Hover or focus to pause.">
      <div class="marquee-track">
        <div v-for="copy in 2" :key="copy" class="marquee-set" :aria-hidden="copy === 2 || undefined">
          <figure
            v-for="t in testimonials"
            :key="t.id"
            class="m-0 flex w-[min(80vw,440px)] flex-none flex-col justify-between gap-6 rounded-card bg-ground p-[clamp(24px,3vw,36px)]"
          >
            <blockquote class="m-0 font-serif text-[clamp(22px,1.2vw+14px,28px)] leading-[1.25] font-semibold text-pretty text-ink">
              “{{ t.quote }}”
            </blockquote>
            <figcaption class="font-bold text-ink">{{ t.name }}</figcaption>
          </figure>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
.marquee {
  overflow: hidden;
}
.marquee-track {
  display: flex;
  width: max-content;
  animation: rc-slide 70s linear infinite;
}
.marquee:hover .marquee-track,
.marquee:focus-within .marquee-track {
  animation-play-state: paused;
}
.marquee-set {
  display: flex;
  gap: 20px;
  padding-right: 20px;
  align-items: stretch;
}
@keyframes rc-slide {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .marquee {
    overflow-x: auto;
  }
  .marquee-track {
    animation: none;
  }
  .marquee-set[aria-hidden] {
    display: none;
  }
}
</style>

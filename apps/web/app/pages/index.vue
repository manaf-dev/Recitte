<script setup lang="ts">
import { pictures } from '~/content/siteCopy'
import { featuredForHome } from '~/utils/programQueries'

const DEFAULT_TITLE = "Spend at least 5 minutes with the Qur'an today."

const { settings, canJoin } = useSiteSettings()
const { programs, today } = usePrograms()
const { openApply, openJoin } = useDialogs()

const featured = computed(() => featuredForHome(programs.value, today))
const heroTitle = computed(() => settings.value?.hero_title || DEFAULT_TITLE)
</script>

<template>
  <div>
    <section class="on-ink relative overflow-hidden bg-ink text-white">
      <img
        class="hero-img"
        :src="pictures.heroMushaf.src"
        :alt="pictures.heroMushaf.alt"
        width="1600"
        height="900"
        style="object-position: 75% 60%"
        fetchpriority="high"
      />
      <div class="hero-scrim" />
      <div class="wrap relative z-[1] flex min-h-[clamp(560px,84svh,780px)] flex-wrap items-center justify-between gap-14 pt-18 pb-22">
        <div class="flex flex-[0_1_620px] flex-col gap-7">
          <h1 class="h1">{{ heroTitle }}</h1>
          <p v-if="settings?.hero_intro" class="lead max-w-[520px] text-haze">{{ settings.hero_intro }}</p>
          <div class="flex flex-wrap gap-3 pt-1">
            <button type="button" class="btn btn-gold" @click="openApply()">Apply to Recitte Academy</button>
            <button v-if="canJoin" type="button" class="btn btn-ghost" @click="openJoin()">Join Recitte Community</button>
          </div>
        </div>
        <div class="mb-6 w-[min(100%,340px)] flex-[0_1_340px]">
          <FiveMinuteTimer />
        </div>
      </div>
    </section>

    <section class="bg-ground">
      <div class="wrap sec flex flex-col gap-9">
        <p class="statement max-w-[1020px]">
          Recitte reconnects Muslims with the Qur'an a few minutes at a time, through community, learning and small daily actions.
        </p>
        <div><NuxtLink to="/about" class="link">Read our story →</NuxtLink></div>
      </div>
    </section>

    <section class="bg-white">
      <div class="wrap sec flex flex-col gap-14">
        <h2 class="h2">Two paths, one purpose.</h2>
        <div class="grid-fit-420 gap-6">
          <div class="pad-card flex min-h-[460px] flex-col gap-5.5 rounded-card bg-soft">
            <h3 class="h3">Recitte Connect</h3>
            <p class="lead max-w-[460px] text-ink">
              A community built around the Qur'an and Sunnah, with daily reminders, challenges and companions who keep you consistent.
            </p>
            <div class="flex flex-col gap-2.5 text-ink">
              <span class="row"><span class="dot" />WhatsApp reminders &amp; reflections</span>
              <span class="row"><span class="dot" />Community Qur'an challenges</span>
              <span class="row"><span class="dot" />Companions who keep you consistent</span>
            </div>
            <div class="mt-auto flex flex-col gap-4">
              <div class="flex flex-wrap gap-3">
                <NuxtLink to="/connect" class="btn btn-ink">Explore Connect</NuxtLink>
                <button v-if="canJoin" type="button" class="btn btn-tint" @click="openJoin()">Join the community</button>
              </div>
              <p class="m-0 font-bold text-ink">Connect is for daily inspiration.</p>
            </div>
          </div>
          <div class="on-ink pad-card flex min-h-[460px] flex-col gap-5.5 rounded-card bg-ink text-white">
            <h3 class="h3">Recitte Academy</h3>
            <p class="lead max-w-[460px] text-mist">
              Seminars, workshops and courses in Qur'an recitation and Tajweed, from the Arabic letters to fluent, measured recitation.
            </p>
            <div class="flex flex-col gap-2.5 text-soft">
              <span class="row"><span class="dot" />Monthly seminars with scholars</span>
              <span class="row"><span class="dot" />Workshops like the Huruf Workshop</span>
              <span class="row"><span class="dot" />Level-based Tajweed courses</span>
            </div>
            <div class="mt-auto flex flex-col gap-4">
              <div class="flex flex-wrap gap-3">
                <NuxtLink to="/academy" class="btn btn-gold">Explore Academy</NuxtLink>
                <button type="button" class="btn btn-ghost" @click="openApply()">Apply now</button>
              </div>
              <p class="m-0 font-bold text-soft">Academy is for structured learning.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="featured.length" class="bg-ground">
      <div class="wrap sec flex flex-col gap-12">
        <h2 class="h2">What's happening now</h2>
        <ProgramGrid :programs="featured" />
      </div>
    </section>

    <TestimonialsMarquee />

    <section class="bg-ground">
      <div class="wrap py-[120px]">
        <div class="on-ink grid-fit-380 items-center gap-10 rounded-card bg-ink p-[clamp(32px,5vw,64px)] text-white">
          <div class="flex flex-col gap-4">
            <h2 class="h2">Recite with confidence and correctness.</h2>
            <p class="lead max-w-[520px] text-mist">
              Tell us where you are in your recitation. We'll place you on the right level and program.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <button type="button" class="btn btn-gold" @click="openApply()">Apply to Recitte Academy</button>
            <NuxtLink to="/academy" class="btn btn-ghost">See learning path</NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

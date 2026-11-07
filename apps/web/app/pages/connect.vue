<script setup lang="ts">
import { activities, offers, pictures } from '~/content/siteCopy'
import { forConnect } from '~/utils/programQueries'

useSeoMeta({ title: 'Recitte Connect | Recitte' })
const { canJoin, whatsappChannel } = useSiteSettings()
const { openJoin } = useDialogs()
const { programs, today, types } = usePrograms()
const cards = computed(() => forConnect(programs.value, today, types.value))
</script>

<template>
  <div>
    <PageHero
      :picture="pictures.connectMosque"
      position="65% 60%"
      title="A community that keeps you close to the Qur'an."
      lead="Rooted in the Qur'an and Sunnah, Recitte Connect brings Muslims together for daily reminders, challenges and mutual encouragement."
    >
      <a v-if="whatsappChannel" :href="whatsappChannel.href" target="_blank" rel="noopener" class="btn btn-gold">
        <SocialIcon platform="whatsapp" />Join our WhatsApp channel<span class="sr-only"> (opens WhatsApp in a new tab)</span>
      </a>
      <button v-if="canJoin" type="button" class="btn" :class="whatsappChannel ? 'btn-ghost' : 'btn-gold'" @click="openJoin()">
        Join Recitte Community
      </button>
    </PageHero>

    <section v-if="whatsappChannel" class="bg-ground" aria-labelledby="channel-heading">
      <div class="wrap py-16">
        <div class="pad-card flex flex-wrap items-center justify-between gap-x-10 gap-y-6 rounded-card bg-soft">
          <div class="flex max-w-[620px] items-start gap-5">
            <span class="flex size-14 flex-none items-center justify-center rounded-full bg-ink text-soft">
              <SocialIcon platform="whatsapp" />
            </span>
            <div class="flex flex-col gap-2">
              <h2 id="channel-heading" class="h2 h2-sm">Join the Recitte WhatsApp channel</h2>
              <p class="m-0 text-ink">
                One short message a day: an ayah, a brief reflection and a small action to carry into your day. Free, quiet, and you can leave anytime.
              </p>
            </div>
          </div>
          <a :href="whatsappChannel.href" target="_blank" rel="noopener" class="btn btn-ink">
            {{ whatsappChannel.kind === 'message' ? 'Message us to join' : 'Join on WhatsApp' }}<span class="sr-only"> (opens WhatsApp in a new tab)</span>
          </a>
        </div>
      </div>
    </section>

    <section class="bg-white">
      <div class="wrap sec">
        <div class="grid-fit-420 gap-x-18 gap-y-14">
          <div class="flex flex-col gap-8">
            <h2 class="h3">What the community offers</h2>
            <DotItems :items="offers" />
          </div>
          <div class="flex flex-col gap-8">
            <h2 class="h3">Community activities</h2>
            <div v-for="a in activities" :key="a.title + a.when" class="grid grid-cols-[96px_1fr] items-start gap-4">
              <span class="pt-1.5 text-sm font-bold text-brown">{{ a.when }}</span>
              <div class="flex flex-col gap-1.5">
                <h3 class="h4">{{ a.title }}</h3>
                <p class="m-0">{{ a.text }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="cards.length" class="bg-ground">
      <div class="wrap sec flex flex-col gap-14">
        <h2 class="h2">Challenges and community programs</h2>
        <ProgramGrid :programs="cards" />
      </div>
    </section>
  </div>
</template>

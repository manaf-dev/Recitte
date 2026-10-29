<script setup lang="ts">
import { activities, offers, pictures } from '~/content/siteCopy'
import { forConnect } from '~/utils/programQueries'

useSeoMeta({ title: 'Recitte Connect | Recitte' })
const { canJoin } = useSiteSettings()
const { openJoin } = useDialogs()
const { programs, today } = usePrograms()
const cards = computed(() => forConnect(programs.value, today))
</script>

<template>
  <div>
    <PageHero
      :picture="pictures.connectMosque"
      position="65% 60%"
      title="A community that keeps you close to the Qur'an."
      lead="Rooted in the Qur'an and Sunnah, Recitte Connect brings Muslims together for daily reminders, challenges and mutual encouragement."
    >
      <button v-if="canJoin" type="button" class="btn btn-gold" @click="openJoin()">Join Recitte Community</button>
    </PageHero>

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

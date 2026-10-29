<script setup lang="ts">
import { approach, pictures, values, whatWeDo } from '~/content/siteCopy'

useSeoMeta({ title: 'About | Recitte' })
const { canJoin } = useSiteSettings()
const { openApply, openJoin } = useDialogs()
</script>

<template>
  <div>
    <PageHero
      :picture="pictures.manuscript1697"
      position="center 40%"
      title="A lifelong relationship with the Qur'an."
      lead="Recitte is rooted in a simple idea: reconnecting Muslims with the Qur'an in a consistent and meaningful way. Not only recitation, but understanding, reflection, implementation, and ultimately, seeking the pleasure of Allah."
    >
      <button v-if="canJoin" type="button" class="btn btn-gold" @click="openJoin()">Join Recitte Community</button>
      <button type="button" class="btn" :class="canJoin ? 'btn-ghost' : 'btn-gold'" @click="openApply()">Apply to Recitte Academy</button>
    </PageHero>

    <section class="bg-ground">
      <div class="wrap sec">
        <div class="grid-fit-420 gap-6">
          <div class="pad-card flex flex-col gap-5 rounded-card bg-white">
            <h2 class="h3">Our vision</h2>
            <p class="statement text-[clamp(22px,1vw+14px,28px)]">
              A world where a reasonable number of Muslims dedicate a few minutes each day to engaging with the Qur'an.
            </p>
          </div>
          <div class="pad-card flex flex-col gap-5 rounded-card bg-soft">
            <h2 class="h3">Our mission</h2>
            <p class="statement text-[clamp(22px,1vw+14px,28px)]">
              To provide practical, accessible tools that help Muslims build the Qur'an into their daily routines.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-white">
      <div class="wrap sec">
        <div class="grid-fit-420 items-start gap-x-18 gap-y-12">
          <h2 class="h2">We remove the barriers to the Mushaf.</h2>
          <div class="flex flex-col gap-9"><DotItems :items="whatWeDo" /></div>
        </div>
      </div>
    </section>

    <section class="bg-ground">
      <div class="wrap sec">
        <div class="grid-fit-420 gap-x-18 gap-y-14">
          <div class="flex flex-col gap-8">
            <h2 class="h3">Our values</h2>
            <DotItems :items="values" />
          </div>
          <div class="flex flex-col gap-8">
            <h2 class="h3">Our approach</h2>
            <DotItems :items="approach" />
            <p class="statement pt-2">...and ultimately, seeking the pleasure of Allah.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

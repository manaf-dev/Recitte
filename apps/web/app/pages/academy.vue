<script setup lang="ts">
import { levels, pictures } from '~/content/siteCopy'
import { forAcademy } from '~/utils/programQueries'

useSeoMeta({ title: 'Recitte Academy | Recitte' })
const { openApply } = useDialogs()
const { programs, today } = usePrograms()
const cards = computed(() => forAcademy(programs.value, today))
</script>

<template>
  <div>
    <PageHero
      :picture="pictures.kufic"
      title="Learn to recite the Qur'an as it was revealed."
      lead="Seminars, workshops and level-based courses in Qur'an recitation and Tajweed with qualified teachers, online, with flexible schedules."
    >
      <button type="button" class="btn btn-gold" @click="openApply()">Apply now</button>
    </PageHero>

    <section class="bg-ground">
      <div class="wrap sec flex flex-col gap-12">
        <div class="grid-fit-420 items-end gap-x-18 gap-y-6">
          <h2 class="h2">Four levels, from letters to fluency.</h2>
          <p class="lead">
            Every student begins with a short placement. You'll join the level that matches your current recitation, so no one starts too far ahead or too far behind.
          </p>
        </div>
        <ol class="rm m-0 list-none p-0 pt-6">
          <li v-for="(l, i) in levels" :key="l.title" class="rm-row">
            <div class="rm-node col-start-2 row-start-1">
              <span class="block size-16 rounded-full" :style="{ background: l.bg }" />
            </div>
            <div
              class="rm-text row-start-1 flex flex-col gap-1.5"
              :class="i % 2 ? 'col-start-3 text-left' : 'col-start-1 justify-self-end text-right'"
            >
              <h3 class="m-0 font-serif text-[32px] leading-[1.05] font-semibold text-ink">
                <span class="sr-only">Level {{ i + 1 }}: </span>{{ l.title }}
              </h3>
              <p class="m-0">{{ l.text }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section v-if="cards.length" class="bg-white">
      <div class="wrap sec flex flex-col gap-14">
        <h2 class="h2">Seminars, workshops and courses</h2>
        <ProgramGrid :programs="cards" />
      </div>
    </section>

    <section class="bg-ground" :class="cards.length ? '' : 'pt-[120px]'">
      <div class="wrap pb-[120px]">
        <div class="on-ink pad-card flex flex-wrap items-center justify-between gap-5 rounded-card bg-ink text-white">
          <div class="flex flex-col gap-1.5">
            <h2 class="h2 h2-sm">Ready to begin?</h2>
            <p class="m-0 text-mist">Takes about a minute. We reply within 3 working days.</p>
          </div>
          <button type="button" class="btn btn-gold" @click="openApply()">Apply to Recitte Academy</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
.rm {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 56px;
  max-width: 980px;
  margin: 0 auto;
  width: 100%;
}
.rm::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 38px;
  bottom: 38px;
  width: 6px;
  margin-left: -3px;
  background: var(--color-gold);
  border-radius: 3px;
}
.rm-row {
  display: grid;
  grid-template-columns: 1fr 76px 1fr;
  column-gap: 32px;
  align-items: center;
  position: relative;
}
.rm-node {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: var(--color-ground);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.rm-text {
  max-width: 400px;
}
@media (max-width: 760px) {
  .rm::before {
    left: 38px;
  }
  .rm-row {
    grid-template-columns: 76px 1fr;
    column-gap: 20px;
  }
  .rm-node {
    grid-column: 1 !important;
  }
  .rm-text {
    grid-column: 2 !important;
    text-align: left !important;
    justify-self: start !important;
    max-width: none;
  }
}
</style>

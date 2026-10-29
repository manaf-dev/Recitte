<script setup lang="ts">
import { PROGRAM_TYPE_LABELS, programStatusLabel } from '@recitte/shared'
import { academyPitch, connectPitch, heroPictureByType, pictures, secondPictureByType } from '~/content/siteCopy'
import { relatedPrograms } from '~/utils/programQueries'

const route = useRoute()
const { programs, today, ready, error } = usePrograms()
const toast = useToast()
await ready

const program = computed(() => programs.value.find((p) => p.slug === route.params.slug))
if (error.value) {
  throw createError({ statusCode: 503, statusMessage: 'Programs are unavailable right now.', fatal: true })
}
if (!program.value) {
  throw createError({ statusCode: 404, statusMessage: 'Program not found', fatal: true })
}
// Non-null from here: the page 404s above when the slug is unknown.
const p = computed(() => program.value!)

const connect = computed(() => isConnectProgram(p.value.type))
const hero = computed(() => heroPictureByType[p.value.type])
const second = computed(() => secondPictureByType[p.value.type])
const details = computed(() => programDetails(p.value))
const related = computed(() => relatedPrograms(p.value, programs.value, today))
const part = computed(() =>
  connect.value
    ? {
        title: 'Part of Recitte Connect',
        text: connectPitch,
        to: '/connect',
        cta: 'Explore Connect',
        back: '← Back to Connect',
        a: pictures.communityCircle,
        b: pictures.connectMosque,
      }
    : {
        title: 'Part of Recitte Academy',
        text: academyPitch,
        to: '/academy',
        cta: 'Explore Academy',
        back: '← Back to Academy',
        a: pictures.kufic,
        b: pictures.manuscript1697,
      },
)

const { siteUrl } = useRuntimeConfig().public
const origin = (siteUrl || useRequestURL().origin).replace(/\/$/, '')
const canonical = computed(() => `${origin}/programs/${p.value.slug}`)

useHead({ link: [{ rel: 'canonical', href: canonical }] })
useSeoMeta({
  title: () => `${p.value.title} | Recitte`,
  description: () => p.value.description,
  ogType: 'website',
  ogSiteName: 'Recitte',
  ogTitle: () => p.value.title,
  ogDescription: () => {
    const date = details.value.find((d) => d.label === 'Date')
    return date ? `${date.value} · ${p.value.description}` : p.value.description
  },
  ogUrl: canonical,
  ogImage: () => `${origin}${hero.value.src}`,
  ogImageAlt: () => hero.value.alt,
  twitterCard: 'summary_large_image',
})

async function share() {
  try {
    await navigator.clipboard.writeText(canonical.value)
    toast.show('Link copied to clipboard')
  } catch {
    toast.show(`Copy this link: ${canonical.value}`)
  }
}
</script>

<template>
  <div>
    <section class="on-ink relative overflow-hidden bg-ink text-white">
      <img class="hero-img" :src="hero.src" :alt="hero.alt" width="1600" height="900" />
      <div class="hero-scrim" />
      <div class="wrap relative z-[1] flex min-h-[clamp(480px,66svh,640px)] flex-col gap-12 pt-8 pb-22">
        <div><NuxtLink :to="part.to" class="btn btn-ghost btn-sm">{{ part.back }}</NuxtLink></div>
        <div class="mt-auto flex max-w-[640px] flex-col gap-6">
          <h1 class="h1">{{ p.title }}</h1>
          <p class="lead max-w-[600px] text-haze">{{ p.description }}</p>
          <span class="row font-bold text-soft">
            <span class="dot" :style="{ background: TYPE_ACCENT[p.type] }" />
            {{ PROGRAM_TYPE_LABELS[p.type] }} · {{ programStatusLabel(p, today) }}
          </span>
          <div><ProgramCtaButton :program="p" variant="hero" /></div>
        </div>
      </div>
    </section>

    <section class="bg-ground">
      <div class="wrap flex flex-wrap items-start gap-12 pt-24 pb-[120px]">
        <div class="flex min-w-0 flex-[1_1_560px] flex-col gap-14">
          <div class="flex flex-wrap items-center gap-x-10 gap-y-8">
            <div class="flex flex-[1_1_320px] flex-col gap-4">
              <h2 class="h2 h2-sm">About this program</h2>
              <p class="m-0 leading-[1.75] whitespace-pre-line text-pretty">{{ p.about || p.description }}</p>
            </div>
            <img
              :src="second.src"
              :alt="second.alt"
              width="400"
              height="400"
              loading="lazy"
              class="block aspect-square w-[min(100%,240px)] flex-none rounded-full object-cover"
            />
          </div>

          <div v-if="p.highlights.length" class="flex flex-col gap-5">
            <h2 class="h2 h2-sm">{{ highlightsTitle(p.type) }}</h2>
            <ul class="m-0 flex list-none flex-col gap-3.5 p-0">
              <li v-for="h in p.highlights" :key="h" class="row items-start font-semibold text-ink">
                <span class="dot mt-[9px]" />{{ h }}
              </li>
            </ul>
          </div>

          <div v-if="p.speaker" class="flex flex-wrap items-start gap-6 rounded-card bg-soft p-[clamp(24px,3vw,36px)]">
            <img
              v-if="p.speaker_photo_url"
              :src="p.speaker_photo_url"
              :alt="p.speaker"
              width="112"
              height="112"
              class="block size-28 flex-none rounded-full object-cover"
            />
            <div v-else class="flex size-28 flex-none items-center justify-center rounded-full bg-white font-serif text-[32px] font-bold text-ink" aria-hidden="true">
              {{ speakerInitials(p.speaker) }}
            </div>
            <div class="flex min-w-0 flex-[1_1_260px] flex-col gap-2">
              <h2 class="h3 text-[32px]">{{ p.speaker }}</h2>
              <span class="text-sm font-bold text-brown">{{ speakerRole(p.type) }}</span>
              <p class="m-0 whitespace-pre-line text-pretty text-ink">{{ p.speaker_bio || `More about ${p.speaker} coming soon.` }}</p>
            </div>
          </div>
        </div>

        <aside class="sticky top-24 flex max-w-[420px] flex-[1_1_320px] flex-col gap-5.5 rounded-card bg-white p-8" aria-labelledby="details-heading">
          <h2 id="details-heading" class="h3 text-[32px]">Program details</h2>
          <dl v-if="details.length" class="m-0 flex flex-col gap-3.5">
            <div v-for="d in details" :key="d.label + d.value" class="flex justify-between gap-4">
              <dt class="font-semibold text-label">{{ d.label }}</dt>
              <dd class="m-0 text-right font-bold text-ink">{{ d.value }}</dd>
            </div>
          </dl>
          <ProgramCtaButton :program="p" variant="block" />
          <button type="button" class="btn btn-stone w-full" @click="share">Share this program</button>
        </aside>
      </div>
    </section>

    <section class="bg-white">
      <div class="wrap flex flex-wrap items-center gap-x-14 gap-y-10 py-24">
        <div class="flex flex-none pr-14">
          <img :src="part.a.src" :alt="part.a.alt" width="400" height="400" loading="lazy" class="block size-[200px] rounded-full object-cover" />
          <img :src="part.b.src" :alt="part.b.alt" width="400" height="400" loading="lazy" class="-mx-14 block size-[200px] rounded-full object-cover" />
        </div>
        <div class="flex flex-[1_1_320px] flex-col items-start gap-4">
          <h2 class="h2 h2-sm">{{ part.title }}</h2>
          <p class="m-0 max-w-[520px]">{{ part.text }}</p>
          <NuxtLink :to="part.to" class="btn btn-ink">{{ part.cta }}</NuxtLink>
        </div>
      </div>
    </section>

    <section v-if="related.length" class="bg-ground">
      <div class="wrap flex flex-col gap-10 pt-24 pb-[120px]">
        <h2 class="h2">You might also like</h2>
        <ProgramGrid :programs="related" />
      </div>
    </section>
  </div>
</template>

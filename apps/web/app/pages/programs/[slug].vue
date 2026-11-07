<script setup lang="ts">
import { programStatusLabel, programTypeLabel } from '@recitte/shared'
import { heroPictureFor } from '~/content/siteCopy'
import { relatedPrograms } from '~/utils/programQueries'

const route = useRoute()
const { programs, today, types, ready, error } = usePrograms()
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

const connect = computed(() => isConnectProgram(p.value.type, types.value))
const hero = computed(() => heroPictureFor(p.value.type, types.value))
const details = computed(() => programDetails(p.value))
const related = computed(() => relatedPrograms(p.value, programs.value, today))
const back = computed(() => (connect.value ? { to: '/connect', text: '← Back to Connect' } : { to: '/academy', text: '← Back to Academy' }))

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
    <section class="bg-ground">
      <div class="wrap flex flex-wrap items-start gap-12 pt-12 pb-[120px]">
        <div class="flex min-w-0 flex-[1_1_560px] flex-col gap-14">
          <div class="flex max-w-[720px] flex-col gap-5">
            <NuxtLink :to="back.to" class="link self-start text-sm">{{ back.text }}</NuxtLink>
            <div class="flex flex-col gap-3">
              <h1 class="h2">{{ p.title }}</h1>
              <span class="row text-sm font-bold text-label">
                <span class="dot" :style="{ background: typeAccent(p.type, types) }" />
                {{ programTypeLabel(p.type, types) }} · {{ programStatusLabel(p, today) }}
              </span>
            </div>
          </div>

          <div class="flex max-w-[720px] flex-col gap-4">
            <h2 class="h2 h2-sm">About this program</h2>
            <p class="m-0 leading-[1.75] whitespace-pre-line text-pretty">{{ p.description }}</p>
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

    <section v-if="related.length" class="bg-ground">
      <div class="wrap flex flex-col gap-10 pt-24 pb-[120px]">
        <h2 class="h2">You might also like</h2>
        <ProgramGrid :programs="related" />
      </div>
    </section>
  </div>
</template>

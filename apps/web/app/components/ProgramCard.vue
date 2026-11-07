<script setup lang="ts">
import { dateBadge, programStatusLabel, programTypeLabel, type Program } from '@recitte/shared'

const props = defineProps<{ program: Program }>()

const { types } = usePrograms()
const theme = computed(() => cardTheme(props.program.type, types.value))
const badge = computed(() => (props.program.starts_on ? dateBadge(props.program.starts_on) : null))
const meta = computed(() => cardMeta(props.program))
const to = computed(() => `/programs/${props.program.slug}`)
</script>

<template>
  <article class="flex h-full flex-col overflow-hidden rounded-card bg-white transition-transform duration-250 hover:-translate-y-[3px]">
    <div class="flex min-h-[140px] items-start justify-between gap-4 p-6" :style="{ background: theme.headBg, color: theme.headFg }">
      <div class="flex min-w-0 flex-col items-start gap-2.5">
        <span class="text-sm font-bold" :style="{ color: theme.headSub }">{{ programTypeLabel(program.type, types) }}</span>
        <span class="flex items-center gap-2 text-sm font-bold">
          <span class="block size-2.5 flex-none rounded-full" :style="{ background: theme.headSub }" />
          {{ programStatusLabel(program) }}
        </span>
      </div>
      <div v-if="badge" class="flex size-22 flex-none flex-col items-center justify-center rounded-full bg-white text-ink">
        <span class="font-serif text-[34px] leading-none font-bold">{{ badge.day }}</span>
        <span class="text-sm leading-tight font-bold text-brown">{{ badge.month }}</span>
      </div>
    </div>
    <div class="flex flex-1 flex-col gap-3.5 p-6">
      <h3 class="m-0">
        <NuxtLink :to="to" class="font-serif text-[32px] leading-[1.05] font-semibold text-balance text-ink no-underline hover:text-gold-deep">
          {{ program.title }}
        </NuxtLink>
      </h3>
      <p class="clamp-3 m-0 text-text [overflow-wrap:anywhere]">{{ program.description }}</p>
      <div v-if="program.speaker" class="flex items-center gap-2.5">
        <img
          v-if="program.speaker_photo_url"
          :src="program.speaker_photo_url"
          :alt="program.speaker"
          width="44"
          height="44"
          class="block size-11 flex-none rounded-full object-cover"
        />
        <div v-else class="flex size-11 flex-none items-center justify-center rounded-full bg-soft font-serif text-[17px] font-bold text-ink">
          {{ speakerInitials(program.speaker) }}
        </div>
        <span class="min-w-0 text-text"><strong class="text-ink">{{ program.speaker }}</strong>, {{ speakerRole(program.type) }}</span>
      </div>
      <span v-if="meta" class="text-sm font-semibold text-label">{{ meta }}</span>
      <div class="mt-auto flex flex-wrap items-center gap-2.5 pt-2">
        <ProgramCtaButton :program="program" />
        <NuxtLink :to="to" class="btn btn-stone" :aria-label="`Details: ${program.title}`">Details</NuxtLink>
      </div>
    </div>
  </article>
</template>

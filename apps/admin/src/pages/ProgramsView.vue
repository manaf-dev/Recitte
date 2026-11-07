<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  formatProgramDateRange,
  isProgramPast,
  PROGRAM_STATUS_LABELS,
  programTypeLabel,
  type Program,
  type ProgramStatus,
} from '@recitte/shared'
import { useProgramTypes } from '@/composables/useProgramTypes'
import { NEXT_STATUS, useProgramsAdmin, type Outcome } from '@/composables/useProgramsAdmin'
import { confirmAction } from '@/lib/confirm'
import { takeFlash } from '@/lib/flash'

const { programs, loading, loaded, error, busy, load, cycleStatus, toggleFeatured, publish, replacePhoto, remove } =
  useProgramsAdmin()

const { types, load: loadTypes } = useProgramTypes()

const notice = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)

const STATUS_STYLE: Record<ProgramStatus, string> = {
  open: 'bg-soft text-ink',
  soon: 'bg-line text-[#5e5037]',
  closed: 'bg-[#e6e6e6] text-[#555]',
}

function show(result: Outcome, success: string) {
  notice.value = result.ok ? { kind: 'ok', text: success } : { kind: 'error', text: result.error }
}

async function onStatus(p: Program) {
  const next = NEXT_STATUS[p.status]
  show(await cycleStatus(p), `“${p.title}” is now ${PROGRAM_STATUS_LABELS[next].toLowerCase()}.`)
}

async function onPublish(p: Program) {
  show(await publish(p), `“${p.title}” is published.`)
}

async function onFeatured(p: Program) {
  show(
    await toggleFeatured(p),
    p.featured ? `“${p.title}” is no longer featured.` : `“${p.title}” is featured on the homepage.`,
  )
}

async function onPhoto(p: Program, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  show(await replacePhoto(p, file), `Speaker photo updated for “${p.title}”.`)
}

async function onRemove(p: Program) {
  const ok = await confirmAction({
    title: 'Delete this program?',
    message: `“${p.title}” will be deleted. Its page and link stop working. Applications and registrations already received stay in the inboxes.`,
  })
  if (!ok) return
  show(await remove(p), `“${p.title}” was removed.`)
}

onMounted(() => {
  const flash = takeFlash()
  if (flash) notice.value = { kind: 'ok', text: flash }
  void load()
  void loadTypes()
})
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div class="flex flex-col gap-1">
      <h1 class="page-title">Programs</h1>
      <p class="m-0 text-[14px] text-muted">Changes publish to the site straight away.</p>
    </div>
    <RouterLink to="/programs/new" class="btn btn-primary">+ Add a program</RouterLink>
  </div>

  <p v-if="notice" class="notice" :class="notice.kind === 'ok' ? 'notice-ok' : 'notice-error'" role="status">
    {{ notice.text }}
  </p>

  <div v-if="error" class="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
    <span>Could not load programs. {{ error }}</span>
    <button type="button" class="btn btn-secondary btn-small" @click="load">Try again</button>
  </div>

  <section class="card" aria-label="All programs" :aria-busy="loading">
    <p v-if="loading && !loaded" class="m-0 p-7 text-[14px] text-muted">Loading…</p>
    <div v-else-if="loaded && !programs.length" class="flex flex-col items-start gap-3 p-7">
      <p class="m-0 text-[14px] text-muted">No programs yet. Add the first one and it appears on the site.</p>
    </div>
    <ul v-else class="m-0 list-none p-0">
      <li
        v-for="p in programs"
        :key="p.id"
        class="flex flex-col gap-3 border-b border-rule px-5 py-4 last:border-b-0 lg:flex-row lg:items-center lg:gap-4"
      >
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <img
            v-if="p.speaker_photo_url"
            :src="p.speaker_photo_url"
            alt=""
            class="h-10 w-10 shrink-0 rounded-full border border-line object-cover"
            width="40"
            height="40"
          />
          <div class="flex min-w-0 flex-col gap-0.5">
            <span class="flex flex-wrap items-center gap-2">
              <RouterLink :to="`/programs/${p.id}`" class="font-bold text-ink no-underline hover:underline">
                {{ p.title }}
              </RouterLink>
              <span v-if="p.is_draft" class="pill bg-line text-[#5e5037]">Draft</span>
              <span v-if="!p.is_draft && isProgramPast(p)" class="pill bg-[#e6e6e6] text-[#555]">Past</span>
            </span>
            <span class="text-[13px] text-muted">
              {{ programTypeLabel(p.type, types) }} · {{ formatProgramDateRange(p.starts_on, p.ends_on) ?? 'No date' }}
              <span class="whitespace-nowrap">· /programs/{{ p.slug }}</span>
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button v-if="p.is_draft" type="button" class="btn btn-primary btn-small" :disabled="busy.has(p.id)" @click="onPublish(p)">
            Publish
          </button>
          <button
            v-else
            type="button"
            class="btn btn-small border-[#d9d2c2]"
            :class="STATUS_STYLE[p.status]"
            :disabled="busy.has(p.id)"
            :aria-label="`Status: ${PROGRAM_STATUS_LABELS[p.status]}. Change to ${PROGRAM_STATUS_LABELS[NEXT_STATUS[p.status]]}`"
            @click="onStatus(p)"
          >
            {{ PROGRAM_STATUS_LABELS[p.status] }} <span aria-hidden="true">↻</span>
          </button>
          <button
            v-if="!p.is_draft"
            type="button"
            class="btn btn-secondary btn-small"
            :aria-pressed="p.featured"
            :disabled="busy.has(p.id)"
            @click="onFeatured(p)"
          >
            <span aria-hidden="true">{{ p.featured ? '★' : '☆' }}</span>
            {{ p.featured ? 'Featured on home' : 'Feature' }}
          </button>
          <label
            v-if="p.speaker"
            class="btn btn-secondary btn-small cursor-pointer border-dashed border-gold focus-within:outline-2 focus-within:outline-gold"
            :class="{ 'pointer-events-none opacity-60': busy.has(p.id) }"
          >
            {{ p.speaker_photo_url ? 'Change speaker photo' : '+ Speaker photo' }}
            <input
              type="file"
              accept="image/*"
              class="sr-only"
              :aria-label="`${p.speaker_photo_url ? 'Change' : 'Add'} speaker photo for ${p.title}`"
              :disabled="busy.has(p.id)"
              @change="onPhoto(p, $event)"
            />
          </label>
          <RouterLink :to="`/programs/${p.id}`" class="btn-link inline-flex items-center no-underline">
            Edit<span class="sr-only"> {{ p.title }}</span>
          </RouterLink>
          <button type="button" class="btn-link btn-danger" :disabled="busy.has(p.id)" @click="onRemove(p)">
            Remove<span class="sr-only"> {{ p.title }}</span>
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

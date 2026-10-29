<script setup lang="ts" generic="T extends Submission">
import { onMounted, ref } from 'vue'
import {
  useSubmissions,
  type StatusFilter,
  type Submission,
  type SubmissionField,
  type SubmissionTable,
  type SubmissionView,
} from '@/composables/useSubmissions'
import { confirmAction } from '@/lib/confirm'
import { formatDateTime } from '@/lib/format'
import { SUBMISSION_STATUS_LABELS } from '@/lib/labels'

const props = defineProps<{
  table: SubmissionTable
  title: string
  /** Singular noun for confirmations, e.g. "application". */
  noun: string
  emptyText: string
  describe: (row: T) => SubmissionView
}>()

const { visible, counts, filter, loading, loaded, error, busy, load, toggleStatus, remove } = useSubmissions<T>(
  props.table,
)

const notice = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'handled', label: 'Handled' },
]

async function onToggle(row: T) {
  const result = await toggleStatus(row)
  const name = props.describe(row).heading
  notice.value = result.ok
    ? { kind: 'ok', text: row.status === 'new' ? `Marked ${name} as handled.` : `Marked ${name} as new again.` }
    : { kind: 'error', text: `Not changed. ${result.error}` }
}

async function onDelete(row: T) {
  const name = props.describe(row).heading
  if (!confirmAction(`Delete the ${props.noun} from ${name}?\n\nThis cannot be undone.`)) return
  const result = await remove(row)
  notice.value = result.ok
    ? { kind: 'ok', text: `Deleted the ${props.noun} from ${name}.` }
    : { kind: 'error', text: `Not deleted. ${result.error}` }
}

function display(value: SubmissionField['value']): string {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

onMounted(load)
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-3">
    <h1 class="page-title">{{ title }}</h1>
    <div class="flex gap-1 rounded-full border border-line bg-white p-1" role="group" aria-label="Show">
      <button
        v-for="f in FILTERS"
        :key="f.key"
        type="button"
        class="rounded-full px-4 py-1.5 text-[13px] font-semibold"
        :class="filter === f.key ? 'bg-ink text-white' : 'text-ink hover:bg-ground'"
        :aria-pressed="filter === f.key"
        @click="filter = f.key"
      >
        {{ f.label }} <span class="opacity-70">{{ counts[f.key] }}</span>
      </button>
    </div>
  </div>

  <p v-if="notice" class="notice" :class="notice.kind === 'ok' ? 'notice-ok' : 'notice-error'" role="status">
    {{ notice.text }}
  </p>
  <div v-if="error" class="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
    <span>Could not load {{ title.toLowerCase() }}. {{ error }}</span>
    <button type="button" class="btn btn-secondary btn-small" @click="load">Try again</button>
  </div>

  <section class="card" :aria-label="title" :aria-busy="loading">
    <p v-if="loading && !loaded" class="m-0 p-7 text-[14px] text-muted">Loading…</p>
    <p v-else-if="loaded && !counts.all" class="m-0 p-7 text-[14px] text-muted">{{ emptyText }}</p>
    <p v-else-if="loaded && !visible.length" class="m-0 p-7 text-[14px] text-muted">
      Nothing {{ filter === 'new' ? 'new' : 'handled' }} right now.
    </p>
    <ul v-else class="m-0 list-none p-0">
      <li
        v-for="row in visible"
        :key="row.id"
        class="flex flex-col gap-3 border-b border-rule px-5 py-4 last:border-b-0"
        :data-status="row.status"
      >
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <span class="font-bold text-ink">{{ describe(row).heading }}</span>
            <span
              class="pill"
              :class="row.status === 'new' ? 'bg-soft text-ink' : 'bg-[#e6e6e6] text-[#555]'"
            >
              {{ SUBMISSION_STATUS_LABELS[row.status] }}
            </span>
            <span v-if="describe(row).subheading" class="text-[13px] text-muted">{{ describe(row).subheading }}</span>
          </div>
          <time :datetime="row.created_at" class="text-[13px] text-muted">{{ formatDateTime(row.created_at) }}</time>
        </div>

        <dl class="m-0 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
          <div
            v-for="field in describe(row).fields"
            :key="field.label"
            class="flex min-w-0 gap-1"
            :class="field.wide ? 'basis-full flex-col' : ''"
          >
            <dt class="shrink-0 text-label">{{ field.label }}:</dt>
            <dd class="m-0 min-w-0 break-words" :class="field.wide ? 'whitespace-pre-line text-[14px] text-[#2b2b2b]' : ''">
              <a v-if="field.href && field.value" :href="field.href" class="text-ink underline-offset-2 hover:underline">{{ field.value }}</a>
              <template v-else>{{ display(field.value) }}</template>
            </dd>
          </div>
        </dl>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="btn btn-secondary btn-small"
            :disabled="busy.has(row.id)"
            @click="onToggle(row)"
          >
            {{ row.status === 'new' ? 'Mark handled' : 'Mark new again' }}
          </button>
          <button
            type="button"
            class="btn-link btn-danger"
            :disabled="busy.has(row.id)"
            @click="onDelete(row)"
          >
            Delete<span class="sr-only"> {{ noun }} from {{ describe(row).heading }}</span>
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import type { Program } from '@recitte/shared'
import ProgramForm from '@/components/ProgramForm.vue'
import { fetchProgram } from '@/composables/useProgramsAdmin'
import { setFlash } from '@/lib/flash'

const props = defineProps<{ id?: string }>()
const router = useRouter()

const program = shallowRef<Program | null>(null)
const state = ref<'loading' | 'ready' | 'missing' | 'error'>(props.id ? 'loading' : 'ready')
const error = ref('')

async function load() {
  if (!props.id) return
  state.value = 'loading'
  const result = await fetchProgram(props.id)
  if (!result.ok) {
    error.value = result.error
    state.value = 'error'
    return
  }
  program.value = result.value
  state.value = result.value ? 'ready' : 'missing'
}

function onSaved(saved: Program) {
  const priorDraft = program.value?.is_draft ?? false
  const what = saved.is_draft ? 'saved as a draft' : props.id && !priorDraft ? 'saved' : 'published'
  setFlash(`“${saved.title}” was ${what}.`)
  void router.push('/programs')
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-1">
    <RouterLink to="/programs" class="text-[14px] font-semibold text-gold-deep no-underline hover:underline">
      ← All programs
    </RouterLink>
    <h1 class="page-title">{{ id ? 'Edit program' : 'Add a program' }}</h1>
  </div>

  <p v-if="state === 'loading'" class="text-[14px] text-muted" role="status">Loading…</p>
  <div v-else-if="state === 'error'" class="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
    <span>Could not load the program. {{ error }}</span>
    <button type="button" class="btn btn-secondary btn-small" @click="load">Try again</button>
  </div>
  <p v-else-if="state === 'missing'" class="notice notice-info">That program no longer exists. It may have been removed.</p>
  <ProgramForm v-else :key="program?.id ?? 'new'" :program="program" @saved="onSaved" @cancel="router.push('/programs')" />
</template>

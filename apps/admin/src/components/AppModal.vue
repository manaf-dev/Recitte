<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

// Modal shell: backdrop click and Escape close, focus is trapped inside and
// returns to whatever opened it.
const props = withDefaults(defineProps<{ open: boolean; title: string; size?: 'sm' | 'md' }>(), { size: 'md' })
const emit = defineEmits<{ close: [] }>()

const titleId = useId()
const panel = ref<HTMLElement | null>(null)
let returnFocus: HTMLElement | null = null

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }
  if (e.key !== 'Tab' || !panel.value) return
  const items = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
  if (!items.length) return
  const first = items[0]!
  const last = items[items.length - 1]!
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

function teardown() {
  document.removeEventListener('keydown', onKeydown)
  document.documentElement.style.overflow = ''
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      returnFocus = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', onKeydown)
      document.documentElement.style.overflow = 'hidden'
      await nextTick()
      const target = panel.value?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea') ?? panel.value
      target?.focus()
    } else {
      teardown()
      returnFocus?.focus()
    }
  },
  { immediate: true },
)

onBeforeUnmount(teardown)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" @mousedown.self="emit('close')">
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          class="modal-panel flex max-h-[calc(100svh-32px)] w-full flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_40px_100px_-30px_rgba(32,37,69,.5)] outline-none"
          :class="size === 'sm' ? 'max-w-[440px]' : 'max-w-[560px]'"
        >
          <div class="flex items-start justify-between gap-4 border-b border-rule px-6 py-5">
            <h2 :id="titleId" class="card-title">{{ title }}</h2>
            <button
              type="button"
              class="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[20px] leading-none text-muted hover:bg-ground hover:text-ink"
              aria-label="Close"
              @click="emit('close')"
            >
              ×
            </button>
          </div>
          <div class="overflow-y-auto px-6 py-5"><slot /></div>
          <div v-if="$slots.footer" class="flex flex-wrap items-center justify-end gap-3 border-t border-rule bg-[#faf9f6] px-6 py-4">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 0.15s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: translateY(8px) scale(0.98);
}
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal-panel,
  .modal-leave-active .modal-panel {
    transition: none;
  }
}
</style>

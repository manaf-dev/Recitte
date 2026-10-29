<script setup lang="ts">
// Modal shell: backdrop click and Escape close, focus moves in and returns.
const props = withDefaults(defineProps<{ open: boolean; label?: string; labelledby?: string; wide?: boolean }>(), {
  wide: false,
})
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
let returnFocus: HTMLElement | null = null

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }
  if (e.key !== 'Tab' || !panel.value) return
  const items = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
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

watch(
  () => props.open,
  async (open) => {
    if (!import.meta.client) return
    if (open) {
      document.addEventListener('keydown', onKeydown)
      returnFocus = document.activeElement as HTMLElement | null
      document.documentElement.style.overflow = 'hidden'
      await nextTick()
      const target = panel.value?.querySelector<HTMLElement>('[autofocus], input, select, textarea') ?? panel.value
      target?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown)
      document.documentElement.style.overflow = ''
      returnFocus?.focus()
    }
  },
)

// When content inside swaps (form → success), keep focus in the dialog.
function onFocusOut(e: FocusEvent) {
  if (!e.relatedTarget) requestAnimationFrame(() => {
    if (props.open && panel.value && !panel.value.contains(document.activeElement)) panel.value.focus()
  })
}

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.removeEventListener('keydown', onKeydown)
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-5"
      @click.self="emit('close')"
    >
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="label"
        :aria-labelledby="labelledby"
        tabindex="-1"
        @focusout="onFocusOut"
        class="animate-fade relative max-h-[calc(100svh-40px)] w-full overflow-auto rounded-3xl bg-white shadow-[0_40px_100px_-30px_rgba(32,37,69,.5)] outline-none"
        :class="wide ? 'max-w-[1080px]' : 'max-w-[480px]'"
      >
        <slot />
      </div>
    </div>
  </Teleport>
</template>

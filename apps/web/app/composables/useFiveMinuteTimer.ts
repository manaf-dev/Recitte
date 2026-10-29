import { computed, onScopeDispose, ref } from 'vue'

export const TIMER_SECONDS = 300
const RING = 304.7

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * The homepage five-minute timer: start, pause, resume, done, restart.
 * Browser-only state; nothing is stored. Time is measured against the clock
 * so a throttled background tab still finishes on time.
 */
export function useFiveMinuteTimer(total = TIMER_SECONDS) {
  const left = ref(total)
  const running = ref(false)
  let endsAt = 0
  let handle: ReturnType<typeof setInterval> | undefined

  const done = computed(() => left.value === 0)

  function stop() {
    if (handle) clearInterval(handle)
    handle = undefined
  }

  function tick() {
    const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
    left.value = remaining
    if (remaining === 0) {
      stop()
      running.value = false
    }
  }

  function start() {
    endsAt = Date.now() + left.value * 1000
    running.value = true
    stop()
    handle = setInterval(tick, 250)
  }

  function pause() {
    tick()
    stop()
    running.value = false
  }

  function reset() {
    stop()
    running.value = false
    left.value = total
  }

  function toggle() {
    if (done.value) return reset()
    if (running.value) return pause()
    start()
  }

  onScopeDispose(stop)

  const label = computed(() => {
    if (done.value) return 'Done, barakallahu feek'
    if (running.value) return `${clock(left.value)} · Pause`
    if (left.value < total) return `Resume · ${clock(left.value)}`
    return 'Start 5 minutes'
  })
  const status = computed(() => (done.value ? 'Five minutes complete.' : running.value ? 'Timer running.' : ''))
  const ringOffset = computed(() => (done.value ? 0 : (RING * left.value) / total).toFixed(1))

  return { left, running, done, toggle, reset, label, status, ringOffset }
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useFiveMinuteTimer } from './useFiveMinuteTimer'

describe('useFiveMinuteTimer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function timer() {
    const scope = effectScope()
    const t = scope.run(() => useFiveMinuteTimer())!
    return { t, scope }
  }

  it('starts at five minutes', () => {
    const { t } = timer()
    expect(t.left.value).toBe(300)
    expect(t.label.value).toBe('Start 5 minutes')
    expect(t.ringOffset.value).toBe('304.7')
  })

  it('counts down while running and shows pause', () => {
    const { t } = timer()
    t.toggle()
    vi.advanceTimersByTime(10_000)
    expect(t.left.value).toBe(290)
    expect(t.label.value).toBe('4:50 · Pause')
    expect(t.status.value).toBe('Timer running.')
  })

  it('pauses and resumes where it left off', () => {
    const { t } = timer()
    t.toggle()
    vi.advanceTimersByTime(65_000)
    t.toggle()
    expect(t.running.value).toBe(false)
    expect(t.label.value).toBe('Resume · 3:55')
    vi.advanceTimersByTime(30_000)
    expect(t.left.value).toBe(235)
    t.toggle()
    vi.advanceTimersByTime(5_000)
    expect(t.left.value).toBe(230)
  })

  it('finishes with the done message, then restarts', () => {
    const { t } = timer()
    t.toggle()
    vi.advanceTimersByTime(300_000)
    expect(t.done.value).toBe(true)
    expect(t.running.value).toBe(false)
    expect(t.label.value).toBe('Done, barakallahu feek')
    expect(t.status.value).toBe('Five minutes complete.')
    expect(t.ringOffset.value).toBe('0.0')
    t.toggle()
    expect(t.left.value).toBe(300)
    expect(t.label.value).toBe('Start 5 minutes')
  })

  it('stops ticking when its scope is disposed', () => {
    const { t, scope } = timer()
    t.toggle()
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })
})

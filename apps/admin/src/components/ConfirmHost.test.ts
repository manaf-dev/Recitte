import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import ConfirmHost from './ConfirmHost.vue'
import { confirmAction } from '@/lib/confirm'

enableAutoUnmount(afterEach)

const ask = () => confirmAction({ title: 'Delete this program?', message: '“Huruf” will be deleted.' })

describe('ConfirmHost', () => {
  it('resolves true on Delete and closes', async () => {
    mount(ConfirmHost, { attachTo: document.body })
    const answer = ask()
    await flushPromises()
    expect(document.body.textContent).toContain('Delete this program?')
    document.querySelector<HTMLButtonElement>('[data-confirm]')!.click()
    expect(await answer).toBe(true)
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('resolves false on Cancel', async () => {
    mount(ConfirmHost, { attachTo: document.body })
    const answer = ask()
    await flushPromises()
    ;[...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((b) => b.textContent?.trim() === 'Cancel')!.click()
    expect(await answer).toBe(false)
  })

  it('resolves false on Escape', async () => {
    mount(ConfirmHost, { attachTo: document.body })
    const answer = ask()
    await flushPromises()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(await answer).toBe(false)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PasswordInput from './PasswordInput.vue'

describe('PasswordInput', () => {
  it('toggles visibility and updates its accessible label', async () => {
    const wrapper = mount(PasswordInput, { props: { id: 'password', modelValue: '' } })
    const input = wrapper.get('input')
    const button = wrapper.get('button')

    expect(input.attributes('type')).toBe('password')
    expect(input.attributes('autocomplete')).toBe('current-password')
    expect(button.attributes('aria-label')).toBe('Show password')
    expect(button.attributes('aria-pressed')).toBe('false')

    await button.trigger('click')
    expect(input.attributes('type')).toBe('text')
    expect(button.attributes('aria-label')).toBe('Hide password')
    expect(button.attributes('aria-pressed')).toBe('true')
  })

  it('does not submit its containing form when toggled', async () => {
    const form = document.createElement('form')
    const onSubmit = vi.fn((event: Event) => event.preventDefault())
    form.addEventListener('submit', onSubmit)
    document.body.append(form)
    const wrapper = mount(PasswordInput, { props: { id: 'password', modelValue: '' }, attachTo: form })
    await wrapper.get('button').trigger('click')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(wrapper.get('input + button').attributes('type')).toBe('button')
    wrapper.unmount()
    form.remove()
  })
})

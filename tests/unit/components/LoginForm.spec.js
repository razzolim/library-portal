import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import LoginForm from '../../../src/components/LoginForm.vue'
import { mountWithI18n } from '../test-utils.js'

describe('LoginForm', () => {
  function mountForm(props = {}) {
    return mountWithI18n(LoginForm, {
      props: {
        isLoading: false,
        ...props
      }
    })
  }

  it('renders username and password inputs', () => {
    const wrapper = mountForm()
    expect(wrapper.find('input#username').exists()).toBe(true)
    expect(wrapper.find('input#password').exists()).toBe(true)
  })

  it('emits submit event with credentials', async () => {
    const wrapper = mountForm()
    const usernameInput = wrapper.find('input#username')
    const passwordInput = wrapper.find('input#password')

    await usernameInput.setValue('reader')
    await passwordInput.setValue('reader')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toHaveLength(1)
    expect(wrapper.emitted('submit')[0]).toEqual([
      { username: 'reader', password: 'reader' }
    ])
  })

  it('does not submit when fields are empty', async () => {
    const wrapper = mountForm()
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('disables submit button while loading', () => {
    const wrapper = mountForm({ isLoading: true })
    const button = wrapper.find('button[type="submit"]')

    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toContain('Signing in')
  })

  it('disables inputs while loading', () => {
    const wrapper = mountForm({ isLoading: true })
    expect(wrapper.find('input#username').attributes('disabled')).toBeDefined()
    expect(wrapper.find('input#password').attributes('disabled')).toBeDefined()
  })
})

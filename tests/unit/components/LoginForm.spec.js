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
      { username: 'reader', password: 'reader', rememberMe: false }
    ])
  })

  it('renders a remember-me checkbox', () => {
    const wrapper = mountForm()
    const checkbox = wrapper.find('input[type="checkbox"]')

    expect(checkbox.exists()).toBe(true)
    expect(wrapper.text()).toContain('Keep me logged in')
  })

  it('includes rememberMe value in submit event when checked', async () => {
    const wrapper = mountForm()
    const usernameInput = wrapper.find('input#username')
    const passwordInput = wrapper.find('input#password')
    const checkbox = wrapper.find('input[type="checkbox"]')

    await usernameInput.setValue('reader')
    await passwordInput.setValue('reader')
    await checkbox.setValue(true)
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toHaveLength(1)
    expect(wrapper.emitted('submit')[0]).toEqual([
      { username: 'reader', password: 'reader', rememberMe: true }
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
    expect(wrapper.find('input[type="checkbox"]').attributes('disabled')).toBeDefined()
  })

  it('toggles password input type when visibility button is clicked', async () => {
    const wrapper = mountForm()
    const passwordInput = wrapper.find('input#password')

    expect(passwordInput.attributes('type')).toBe('password')

    await wrapper.find('.login-form__toggle-password').trigger('click')

    expect(wrapper.find('input#password').attributes('type')).toBe('text')

    await wrapper.find('.login-form__toggle-password').trigger('click')

    expect(wrapper.find('input#password').attributes('type')).toBe('password')
  })

  it('disables password visibility toggle while loading', () => {
    const wrapper = mountForm({ isLoading: true })
    expect(wrapper.find('.login-form__toggle-password').attributes('disabled')).toBeDefined()
  })
})

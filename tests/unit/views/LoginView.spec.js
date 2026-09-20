import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import { createTestI18n } from '../test-utils.js'
import LoginView from '../../../src/views/LoginView.vue'

function createRouterForLogin() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginView },
      { path: '/library', name: 'library', component: { template: '<div>Library</div>' } }
    ]
  })
}

async function mountLoginView() {
  const i18n = createTestI18n('en')
  const router = createRouterForLogin()
  const pinia = createPinia()

  await router.push('/login')
  await router.isReady()

  const wrapper = mount(LoginView, {
    global: {
      plugins: [i18n, router, pinia]
    }
  })

  return { wrapper, router }
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('renders the login form', async () => {
    const { wrapper } = await mountLoginView()
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('input#username').exists()).toBe(true)
    expect(wrapper.find('input#password').exists()).toBe(true)
  })

  it('renders the language switcher below the sign-in button', async () => {
    const { wrapper } = await mountLoginView()

    const form = wrapper.find('form')
    const languageSwitcher = wrapper.find('.login-view__language')

    expect(languageSwitcher.exists()).toBe(true)
    expect(languageSwitcher.find('select').exists()).toBe(true)

    // The language switcher container should appear after the form in the DOM
    const formIndex = form.element.compareDocumentPosition(languageSwitcher.element)
    expect(formIndex & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('redirects to the library on successful login', async () => {
    const { wrapper, router } = await mountLoginView()

    const usernameInput = wrapper.find('input#username')
    const passwordInput = wrapper.find('input#password')

    await usernameInput.setValue('reader')
    await passwordInput.setValue('reader')
    await wrapper.find('form').trigger('submit')

    // Wait for the mock authentication delay
    await new Promise((resolve) => setTimeout(resolve, 600))
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/library')
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import { createTestI18n } from '../test-utils.js'
import AppHeader from '../../../src/components/AppHeader.vue'
import { useAuthStore } from '../../../src/stores/auth.js'

const STORAGE_KEY = 'library_portal_auth'

function createRouterForHeader() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', redirect: '/library' },
      { path: '/login', name: 'login', component: { template: '<div>Login</div>' } },
      { path: '/library', name: 'library', component: { template: '<div>Library</div>' } },
      { path: '/account', name: 'account', component: { template: '<div>Account</div>' } }
    ]
  })
}

function mountHeader(options = {}) {
  const i18n = createTestI18n('en')
  const router = createRouterForHeader()
  const pinia = createPinia()
  const auth = useAuthStore(pinia)

  if (options.user) {
    auth.user = options.user
    auth.token = 'mock-token'
  }

  const wrapper = mount(AppHeader, {
    global: {
      plugins: [i18n, router, pinia]
    }
  })

  return { wrapper, router, auth }
}

describe('AppHeader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('renders the welcome message with the user name', () => {
    const { wrapper } = mountHeader({ user: { id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' } })
    expect(wrapper.text()).toContain('Welcome, reader')
  })

  it('renders the profile button', () => {
    const { wrapper } = mountHeader({ user: { id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' } })
    expect(wrapper.find('.header__profile-button').exists()).toBe(true)
  })

  it('does not show the dropdown by default', () => {
    const { wrapper } = mountHeader({ user: { id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' } })
    expect(wrapper.find('.header__profile-dropdown').exists()).toBe(false)
  })

  it('opens the dropdown when the profile button is clicked', async () => {
    const { wrapper } = mountHeader({ user: { id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' } })
    await wrapper.find('.header__profile-button').trigger('click')

    expect(wrapper.find('.header__profile-dropdown').exists()).toBe(true)
    expect(wrapper.text()).toContain('My account')
    expect(wrapper.text()).toContain('Logout')
  })

  it('navigates to the account page when "My account" is clicked', async () => {
    const { wrapper, router } = mountHeader({ user: { id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' } })
    await router.isReady()

    await wrapper.find('.header__profile-button').trigger('click')
    await wrapper.find('.header__profile-option').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('account')
  })

  it('logs out and redirects to login when "Logout" is clicked', async () => {
    const { wrapper, router, auth } = mountHeader({ user: { id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' } })
    await router.isReady()

    await wrapper.find('.header__profile-button').trigger('click')
    const logoutOption = wrapper.findAll('.header__profile-option').find((opt) => opt.text().includes('Logout'))
    await logoutOption.trigger('click')
    await flushPromises()

    expect(auth.isAuthenticated).toBe(false)
    expect(router.currentRoute.value.name).toBe('login')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('closes the dropdown when clicking outside', async () => {
    const { wrapper } = mountHeader({ user: { id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' } })
    await wrapper.find('.header__profile-button').trigger('click')
    expect(wrapper.find('.header__profile-dropdown').exists()).toBe(true)

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.header__profile-dropdown').exists()).toBe(false)
  })

  it('closes the dropdown when Escape is pressed', async () => {
    const { wrapper } = mountHeader({ user: { id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' } })
    await wrapper.find('.header__profile-button').trigger('click')
    expect(wrapper.find('.header__profile-dropdown').exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.header__profile-dropdown').exists()).toBe(false)
  })

  it('removes event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
    const { wrapper } = mountHeader({ user: { id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' } })
    wrapper.unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})

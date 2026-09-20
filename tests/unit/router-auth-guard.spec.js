import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import { createTestI18n } from './test-utils.js'
import LoginView from '../../src/views/LoginView.vue'
import { useAuthStore } from '../../src/stores/auth.js'

describe('Router Auth Guard Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
  })

  function createRouterWithGuard() {
    const r = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', redirect: '/login' },
        { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
        { path: '/library', name: 'library', component: { template: '<div>Library</div>' }, meta: { requiresAuth: true } },
        { path: '/:pathMatch(.*)*', redirect: '/login' }
      ]
    })

    r.beforeEach((to) => {
      const auth = useAuthStore()
      const isAuthenticated = auth.isAuthenticated
      if (to.meta.requiresAuth && !isAuthenticated) {
        return { name: 'login' }
      }
      if (to.name === 'login' && isAuthenticated) {
        return { name: 'library' }
      }
    })

    return r
  }

  it('redirects unauthenticated user from /library to /login without a redirect query', async () => {
    const r = createRouterWithGuard()
    await r.push('/library')
    await r.isReady()
    await flushPromises()

    expect(r.currentRoute.value.path).toBe('/login')
    expect(r.currentRoute.value.query.redirect).toBeUndefined()
  })

  it('redirects authenticated user from /login to /library', async () => {
    const r = createRouterWithGuard()
    const auth = useAuthStore()
    await auth.login({ username: 'reader', password: 'reader' })

    await r.push('/login')
    await r.isReady()
    await flushPromises()

    expect(r.currentRoute.value.path).toBe('/library')
  })

  it('allows authenticated user to access /library', async () => {
    const r = createRouterWithGuard()
    const auth = useAuthStore()
    await auth.login({ username: 'reader', password: 'reader' })

    await r.push('/library')
    await r.isReady()
    await flushPromises()

    expect(r.currentRoute.value.path).toBe('/library')
  })

  it('LoginView always redirects to /library after successful login', async () => {
    const r = createRouterWithGuard()
    await r.push('/login')
    await r.isReady()

    const i18n = createTestI18n('en')
    const wrapper = mount(LoginView, {
      global: {
        plugins: [i18n, r]
      }
    })

    await wrapper.find('input#username').setValue('reader')
    await wrapper.find('input#password').setValue('reader')
    await wrapper.find('form').trigger('submit')

    await new Promise((resolve) => setTimeout(resolve, 600))
    await flushPromises()

    expect(r.currentRoute.value.path).toBe('/library')
    expect(r.currentRoute.value.query.redirect).toBeUndefined()
  })
})

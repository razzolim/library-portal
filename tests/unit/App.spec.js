import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createTestI18n } from './test-utils.js'
import App from '../../src/App.vue'
import { useAuthStore } from '../../src/stores/auth.js'
import { getLatestChangelogVersion } from '../../src/utils/changelog.js'

function createRouterForApp() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', redirect: '/library' },
      { path: '/library', name: 'library', component: { template: '<div>Library</div>' } },
      { path: '/changelog', name: 'changelog', component: { template: '<div>Change log</div>' } }
    ]
  })
}

async function mountApp(authenticated = false) {
  const i18n = createTestI18n('en')
  const router = createRouterForApp()
  const pinia = createPinia()
  const auth = useAuthStore(pinia)

  if (authenticated) {
    auth.user = { id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' }
    auth.token = 'mock-token'
  }

  await router.push('/library')
  await router.isReady()

  return mount(App, {
    global: {
      plugins: [i18n, router, pinia],
      stubs: {
        AppHeader: { template: '<header>Header</header>' }
      }
    }
  })
}

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does not render the footer when the user is not authenticated', async () => {
    const wrapper = await mountApp(false)
    expect(wrapper.find('.app-footer').exists()).toBe(false)
  })

  it('renders the footer with the latest changelog version when authenticated', async () => {
    const wrapper = await mountApp(true)
    const version = getLatestChangelogVersion()
    const footer = wrapper.find('.app-footer')

    expect(footer.exists()).toBe(true)
    expect(footer.text()).toContain(`v${version}`)
    expect(footer.text()).toContain('Change log')
  })
})

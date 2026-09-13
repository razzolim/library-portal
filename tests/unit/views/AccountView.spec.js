import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import { createTestI18n } from '../test-utils.js'
import AccountView from '../../../src/views/AccountView.vue'
import { useAuthStore } from '../../../src/stores/auth.js'

function createRouterForAccount() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/library', name: 'library', component: { template: '<div>Library</div>' } },
      { path: '/account', name: 'account', component: AccountView }
    ]
  })
}

async function mountAccountView(user = null) {
  const i18n = createTestI18n('en')
  const router = createRouterForAccount()
  const pinia = createPinia()
  const auth = useAuthStore(pinia)

  if (user) {
    auth.user = user
    auth.token = 'mock-token'
  }

  await router.push('/account')
  await router.isReady()

  const wrapper = mount(AccountView, {
    global: {
      plugins: [i18n, router, pinia]
    }
  })

  return { wrapper, router, auth }
}

describe('AccountView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('displays the account title', async () => {
    const { wrapper } = await mountAccountView({ id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' })
    expect(wrapper.find('h1').text()).toBe('Account')
  })

  it('renders the user profile details', async () => {
    const user = { id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' }
    const { wrapper } = await mountAccountView(user)

    expect(wrapper.text()).toContain('Demo Reader')
    expect(wrapper.text()).toContain('reader')
    expect(wrapper.text()).toContain('reader')
  })

  it('renders dashes when no user data is available', async () => {
    const { wrapper } = await mountAccountView()
    const values = wrapper.findAll('.account-view__value')

    expect(values.every((v) => v.text() === '-')).toBe(true)
  })

  it('includes the language switcher', async () => {
    const { wrapper } = await mountAccountView({ id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' })
    expect(wrapper.find('select').exists()).toBe(true)
  })

  it('navigates back to the library when the link is clicked', async () => {
    const { wrapper, router } = await mountAccountView({ id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' })

    await wrapper.find('.account-view__link').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('library')
  })
})

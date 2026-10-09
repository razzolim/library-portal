import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createTestI18n } from '../../test-utils.js'
import AdminView from '../../../../src/views/admin/AdminView.vue'
import AdminHomeView from '../../../../src/views/admin/AdminHomeView.vue'
import { adminTools } from '../../../../src/views/admin/adminTools.js'

async function mountAdmin() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/admin',
        component: AdminView,
        children: [
          { path: '', name: 'admin', component: AdminHomeView },
          { path: 'users/reset-password', name: 'admin-reset-password', component: { template: '<div>Reset</div>' } },
          { path: 'books/new', name: 'admin-add-book', component: { template: '<div>Add</div>' } }
        ]
      }
    ]
  })
  await router.push('/admin')
  await router.isReady()

  const wrapper = mount({ template: '<RouterView />' }, {
    global: { plugins: [createTestI18n('en'), router] }
  })
  return { wrapper, router }
}

describe('AdminView', () => {
  it('renders a sidebar link and an overview card for every admin tool', async () => {
    const { wrapper } = await mountAdmin()

    expect(wrapper.find('.admin-view__title').text()).toBe('Administration')
    // Overview link + one link per tool
    expect(wrapper.findAll('.admin-view__nav-link')).toHaveLength(adminTools.length + 1)
    expect(wrapper.findAll('.admin-home__card')).toHaveLength(adminTools.length)
    expect(wrapper.text()).toContain('Reset password')
    expect(wrapper.text()).toContain('Add book')
  })

  it('navigates to a tool from its overview card', async () => {
    const { wrapper, router } = await mountAdmin()

    const card = wrapper.findAll('.admin-home__card').find((c) => c.text().includes('Add book'))
    await card.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('admin-add-book')
    expect(wrapper.text()).toContain('Add')
  })
})

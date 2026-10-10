import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createTestI18n } from '../../test-utils.js'
import AdminUsersView from '../../../../src/views/admin/AdminUsersView.vue'
import { useAuthStore } from '../../../../src/stores/auth.js'
import {
  fetchUsers,
  resetUserPassword,
  updateUserEmail,
  setUserEnabled,
  deleteUser
} from '../../../../src/api/admin.js'

vi.mock('../../../../src/api/admin.js', () => ({
  fetchUsers: vi.fn(),
  resetUserPassword: vi.fn(),
  updateUserEmail: vi.fn(),
  setUserEnabled: vi.fn(),
  deleteUser: vi.fn()
}))

const USERS = [
  { id: 2, username: 'admin', fullName: 'Demo Admin', email: 'admin@example.com', role: 'admin', enabled: true },
  { id: 3, username: 'ajohnson', fullName: 'Alice Johnson', email: 'ajohnson@example.com', role: 'reader', enabled: true },
  { id: 4, username: 'bcarvalho', fullName: 'Bruno Carvalho', email: null, role: 'reader', enabled: false }
]

function page(items = USERS, total = items.length) {
  return { items, total, page: 1, pageSize: 12 }
}

async function mountView() {
  const pinia = createPinia()
  const auth = useAuthStore(pinia)
  auth.user = { id: 2, username: 'admin', role: 'admin' }
  auth.token = 'mock-token'

  const wrapper = mount(AdminUsersView, {
    attachTo: document.body,
    global: { plugins: [createTestI18n('en'), pinia] }
  })
  await flushPromises()
  return wrapper
}

async function openAction(wrapper, username, action) {
  const row = wrapper.findAll('tbody tr').find((r) => r.text().includes(`@${username}`))
  await row.find('.admin-users__menu-button').trigger('click')
  await row.find(`[data-action="${action}"]`).trigger('click')
  await flushPromises()
}

const dialog = () => document.body.querySelector('[role="dialog"]')

describe('AdminUsersView', () => {
  let wrapper

  beforeEach(() => {
    vi.resetAllMocks()
    fetchUsers.mockResolvedValue(page())
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('lists users with role, status, and a placeholder for a missing email', async () => {
    wrapper = await mountView()

    expect(fetchUsers).toHaveBeenCalledWith({ page: 1, pageSize: 12, query: '' })
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[1].text()).toContain('Alice Johnson')
    expect(rows[1].text()).toContain('ajohnson@example.com')
    expect(rows[2].text()).toContain('No email')
    expect(rows[2].text()).toContain('Disabled')
    expect(rows[0].text()).toContain('You')
  })

  it('requests the next page when pagination changes', async () => {
    fetchUsers.mockResolvedValue(page(USERS, 30))
    wrapper = await mountView()

    const next = wrapper.findAll('.pagination__button').find((b) => b.text() === 'Next')
    await next.trigger('click')
    await flushPromises()

    expect(fetchUsers).toHaveBeenLastCalledWith({ page: 2, pageSize: 12, query: '' })
  })

  it('searches after a short debounce and returns to the first page', async () => {
    wrapper = await mountView()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    await wrapper.find('input[type="search"]').setValue('alice')
    vi.advanceTimersByTime(350)
    vi.useRealTimers()
    await flushPromises()

    expect(fetchUsers).toHaveBeenLastCalledWith({ page: 1, pageSize: 12, query: 'alice' })
  })

  it('shows an error with a retry button when loading fails', async () => {
    fetchUsers.mockRejectedValueOnce(new Error('boom'))
    wrapper = await mountView()

    expect(wrapper.find('[role="alert"]').text()).toContain('Failed to load users')

    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })

  it('disables destructive actions on the signed-in admin', async () => {
    wrapper = await mountView()
    const row = wrapper.findAll('tbody tr')[0]
    await row.find('.admin-users__menu-button').trigger('click')

    expect(row.find('[data-action="toggle"]').attributes('disabled')).toBeDefined()
    expect(row.find('[data-action="delete"]').attributes('disabled')).toBeDefined()
    expect(row.find('[data-action="reset"]').attributes('disabled')).toBeUndefined()
  })

  it('resets a password from the dialog', async () => {
    resetUserPassword.mockResolvedValue({ success: true, username: 'ajohnson' })
    wrapper = await mountView()
    await openAction(wrapper, 'ajohnson', 'reset')

    expect(dialog().textContent).toContain('Reset password for ajohnson')

    const submit = async () => {
      dialog().querySelector('form').dispatchEvent(new Event('submit'))
      await flushPromises()
    }
    const setValue = async (selector, value) => {
      const input = dialog().querySelector(selector)
      input.value = value
      input.dispatchEvent(new Event('input'))
      await flushPromises()
    }

    await setValue('#admin-users-new-password', 'short')
    await setValue('#admin-users-confirm-password', 'short')
    await submit()
    expect(dialog().textContent).toContain('at least 8 characters')
    expect(resetUserPassword).not.toHaveBeenCalled()

    await setValue('#admin-users-new-password', 'long-enough-1')
    await setValue('#admin-users-confirm-password', 'long-enough-1')
    await submit()

    expect(resetUserPassword).toHaveBeenCalledWith({ username: 'ajohnson', newPassword: 'long-enough-1' })
    expect(dialog()).toBeNull()
    expect(wrapper.text()).toContain('Password for "ajohnson" was reset.')
  })

  it('edits an email, validates it, and refreshes the list', async () => {
    updateUserEmail.mockResolvedValue({ success: true })
    wrapper = await mountView()
    await openAction(wrapper, 'bcarvalho', 'email')

    const input = dialog().querySelector('#admin-users-email')
    input.value = 'not-an-email'
    input.dispatchEvent(new Event('input'))
    dialog().querySelector('form').dispatchEvent(new Event('submit'))
    await flushPromises()
    expect(dialog().textContent).toContain('Enter a valid email address.')
    expect(updateUserEmail).not.toHaveBeenCalled()

    input.value = 'bruno@example.com'
    input.dispatchEvent(new Event('input'))
    dialog().querySelector('form').dispatchEvent(new Event('submit'))
    await flushPromises()

    expect(updateUserEmail).toHaveBeenCalledWith('bcarvalho', 'bruno@example.com')
    expect(fetchUsers).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Email for "bcarvalho" was updated.')
  })

  it('shows the mapped error when the email is already taken', async () => {
    updateUserEmail.mockResolvedValue({ success: false, errorKey: 'admin.users.duplicateEmail' })
    wrapper = await mountView()
    await openAction(wrapper, 'ajohnson', 'email')

    dialog().querySelector('form').dispatchEvent(new Event('submit'))
    await flushPromises()

    expect(dialog().querySelector('[role="alert"]').textContent).toBe('Another user already has this email.')
  })

  it('disables an active user and enables a disabled one', async () => {
    setUserEnabled.mockResolvedValue({ success: true })
    wrapper = await mountView()

    await openAction(wrapper, 'ajohnson', 'toggle')
    expect(dialog().textContent).toContain('Disable ajohnson?')
    dialog().querySelector('form').dispatchEvent(new Event('submit'))
    await flushPromises()
    expect(setUserEnabled).toHaveBeenLastCalledWith('ajohnson', false, { actor: 'admin' })
    expect(wrapper.text()).toContain('"ajohnson" was disabled.')

    await openAction(wrapper, 'bcarvalho', 'toggle')
    expect(dialog().textContent).toContain('Enable bcarvalho?')
    dialog().querySelector('form').dispatchEvent(new Event('submit'))
    await flushPromises()
    expect(setUserEnabled).toHaveBeenLastCalledWith('bcarvalho', true, { actor: 'admin' })
  })

  it('requires typing the username before deleting', async () => {
    deleteUser.mockResolvedValue({ success: true })
    wrapper = await mountView()
    await openAction(wrapper, 'ajohnson', 'delete')

    const confirmButton = dialog().querySelector('button[type="submit"]')
    expect(confirmButton.disabled).toBe(true)

    const input = dialog().querySelector('#admin-users-delete-confirm')
    input.value = 'ajohnson'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    expect(confirmButton.disabled).toBe(false)

    dialog().querySelector('form').dispatchEvent(new Event('submit'))
    await flushPromises()

    expect(deleteUser).toHaveBeenCalledWith('ajohnson', { actor: 'admin' })
    expect(wrapper.text()).toContain('"ajohnson" was deleted.')
  })

  it('closes the dialog with Escape without calling the API', async () => {
    wrapper = await mountView()
    await openAction(wrapper, 'ajohnson', 'delete')

    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(dialog()).toBeNull()
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('goes back a page when the last user of the last page is removed', async () => {
    fetchUsers
      .mockResolvedValueOnce({ items: USERS, total: 13, page: 1, pageSize: 12 })
    wrapper = await mountView()
    const next = wrapper.findAll('.pagination__button').find((b) => b.text() === 'Next')
    fetchUsers.mockResolvedValueOnce({ items: [USERS[1]], total: 13, page: 2, pageSize: 12 })
    await next.trigger('click')
    await flushPromises()

    deleteUser.mockResolvedValue({ success: true })
    fetchUsers
      .mockResolvedValueOnce({ items: [], total: 12, page: 2, pageSize: 12 })
      .mockResolvedValueOnce({ items: USERS, total: 12, page: 1, pageSize: 12 })
    await openAction(wrapper, 'ajohnson', 'delete')
    const input = dialog().querySelector('#admin-users-delete-confirm')
    input.value = 'ajohnson'
    input.dispatchEvent(new Event('input'))
    dialog().querySelector('form').dispatchEvent(new Event('submit'))
    await flushPromises()

    expect(fetchUsers).toHaveBeenLastCalledWith({ page: 1, pageSize: 12, query: '' })
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })
})

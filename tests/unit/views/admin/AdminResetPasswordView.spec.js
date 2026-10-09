import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestI18n } from '../../test-utils.js'
import AdminResetPasswordView from '../../../../src/views/admin/AdminResetPasswordView.vue'
import { resetUserPassword } from '../../../../src/api/admin.js'

vi.mock('../../../../src/api/admin.js', () => ({
  resetUserPassword: vi.fn()
}))

function mountView() {
  return mount(AdminResetPasswordView, {
    global: { plugins: [createTestI18n('en')] }
  })
}

async function fillForm(wrapper, { username = 'reader', password = 'new-password', confirm = password } = {}) {
  await wrapper.find('#admin-reset-username').setValue(username)
  await wrapper.find('#admin-reset-new-password').setValue(password)
  await wrapper.find('#admin-reset-confirm-password').setValue(confirm)
}

describe('AdminResetPasswordView', () => {
  beforeEach(() => {
    resetUserPassword.mockReset()
  })

  it('shows validation errors and does not call the API when the form is empty', async () => {
    const wrapper = mountView()
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Enter the username of the account to reset.')
    expect(wrapper.text()).toContain('Password must be at least 8 characters.')
    expect(resetUserPassword).not.toHaveBeenCalled()
  })

  it('shows an error when the passwords do not match', async () => {
    const wrapper = mountView()
    await fillForm(wrapper, { confirm: 'different-pass' })
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Passwords do not match.')
  })

  it('asks for confirmation before resetting', async () => {
    const wrapper = mountView()
    await fillForm(wrapper)
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Reset the password for "reader"?')
    expect(resetUserPassword).not.toHaveBeenCalled()
  })

  it('cancelling the confirmation returns to the form', async () => {
    const wrapper = mountView()
    await fillForm(wrapper)
    await wrapper.find('form').trigger('submit')

    const cancel = wrapper.findAll('button').find((b) => b.text() === 'Cancel')
    await cancel.trigger('click')

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(wrapper.find('#admin-reset-username').element.value).toBe('reader')
  })

  it('resets the password after confirmation and clears the form', async () => {
    resetUserPassword.mockResolvedValue({ success: true, username: 'reader' })
    const wrapper = mountView()
    await fillForm(wrapper)
    await wrapper.find('form').trigger('submit')

    const confirm = wrapper.findAll('button').find((b) => b.text().includes('Yes, reset password'))
    await confirm.trigger('click')
    await flushPromises()

    expect(resetUserPassword).toHaveBeenCalledWith({ username: 'reader', newPassword: 'new-password' })
    expect(wrapper.text()).toContain('Password for "reader" was reset.')
    expect(wrapper.find('#admin-reset-username').element.value).toBe('')
  })

  it('shows the mapped error when the user is not found', async () => {
    resetUserPassword.mockResolvedValue({ success: false, errorKey: 'admin.resetPassword.userNotFound' })
    const wrapper = mountView()
    await fillForm(wrapper, { username: 'ghost' })
    await wrapper.find('form').trigger('submit')

    const confirm = wrapper.findAll('button').find((b) => b.text().includes('Yes, reset password'))
    await confirm.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('No user found with this username.')
  })

  it('generates a strong password and fills both fields', async () => {
    const wrapper = mountView()
    const generate = wrapper.findAll('button').find((b) => b.text() === 'Generate a strong password')
    await generate.trigger('click')

    const password = wrapper.find('#admin-reset-new-password').element.value
    expect(password.length).toBeGreaterThanOrEqual(8)
    expect(wrapper.find('#admin-reset-confirm-password').element.value).toBe(password)
    expect(wrapper.find('#admin-reset-new-password').attributes('type')).toBe('text')
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createTestI18n } from '../../test-utils.js'
import AdminFeatureFlagsView from '../../../../src/views/admin/AdminFeatureFlagsView.vue'
import {
  fetchFeatureFlags,
  createFeatureFlag,
  setFeatureFlagEnabled,
  deleteFeatureFlag
} from '../../../../src/api/admin.js'

vi.mock('../../../../src/api/admin.js', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchFeatureFlags: vi.fn(),
  createFeatureFlag: vi.fn(),
  setFeatureFlagEnabled: vi.fn(),
  deleteFeatureFlag: vi.fn()
}))

const flag = (key, enabled = false) => ({
  key,
  description: `${key} description`,
  enabled,
  updatedAt: '2026-10-01T12:00:00Z',
  updatedBy: 'admin'
})

async function mountView() {
  const wrapper = mount(AdminFeatureFlagsView, {
    global: { plugins: [createTestI18n('en'), createPinia()] }
  })
  await flushPromises()
  return wrapper
}

describe('AdminFeatureFlagsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    fetchFeatureFlags.mockResolvedValue([flag('alpha', true), flag('beta')])
  })

  it('lists flags with their state', async () => {
    const wrapper = await mountView()

    const rows = wrapper.findAll('[data-test="flag"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('alpha')
    expect(rows[0].find('[role="switch"]').attributes('aria-checked')).toBe('true')
    expect(rows[1].find('[role="switch"]').attributes('aria-checked')).toBe('false')
  })

  it('toggles a flag through the API', async () => {
    setFeatureFlagEnabled.mockResolvedValue({ success: true, flag: flag('beta', true) })
    const wrapper = await mountView()

    await wrapper.findAll('[data-test="toggle"]')[1].trigger('click')
    await flushPromises()

    expect(setFeatureFlagEnabled).toHaveBeenCalledWith('beta', true, expect.anything())
    expect(wrapper.findAll('[role="switch"]')[1].attributes('aria-checked')).toBe('true')
    expect(wrapper.text()).toContain('Flag "beta" is now on.')
  })

  it('validates the key before calling the API', async () => {
    const wrapper = await mountView()

    await wrapper.find('#admin-flag-key').setValue('Bad Key')
    await wrapper.find('form').trigger('submit')

    expect(createFeatureFlag).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Use 2 to 64 lowercase letters')
  })

  it('creates a flag and reloads the list', async () => {
    createFeatureFlag.mockResolvedValue({ success: true, flag: flag('gamma') })
    const wrapper = await mountView()

    await wrapper.find('#admin-flag-key').setValue('gamma')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createFeatureFlag).toHaveBeenCalledWith(
      { key: 'gamma', description: '', enabled: false },
      expect.anything()
    )
    expect(fetchFeatureFlags).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Flag "gamma" created')
  })

  it('shows the duplicate-key error on the key field', async () => {
    createFeatureFlag.mockResolvedValue({ success: false, errorKey: 'admin.featureFlags.duplicateKey' })
    const wrapper = await mountView()

    await wrapper.find('#admin-flag-key').setValue('alpha')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.admin-form__field-error').text()).toBe('A flag with this key already exists.')
  })

  it('asks for confirmation before deleting', async () => {
    deleteFeatureFlag.mockResolvedValue({ success: true })
    const wrapper = await mountView()

    await wrapper.findAll('[data-test="delete"]')[0].trigger('click')
    expect(deleteFeatureFlag).not.toHaveBeenCalled()

    await wrapper.find('[data-test="confirm-delete"]').trigger('click')
    await flushPromises()

    expect(deleteFeatureFlag).toHaveBeenCalledWith('alpha')
    expect(wrapper.findAll('[data-test="flag"]')).toHaveLength(1)
  })

  it('shows a retry state when loading fails', async () => {
    fetchFeatureFlags.mockRejectedValueOnce(new Error('boom'))
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Could not load the feature flags.')
  })
})

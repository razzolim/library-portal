import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestI18n } from '../test-utils.js'
import ChangeLog from '../../../src/components/ChangeLog.vue'
import * as changelogApi from '../../../src/api/changelog.js'

const mockEntries = [
  {
    id: '1',
    version: '1.3.0',
    date: '2026-08-15',
    title: 'Profile menu',
    description: '## What\'s new\n\n- Added a **profile menu**.\n- Language settings moved to the account page.'
  }
]

describe('ChangeLog', () => {
  beforeEach(() => {
    vi.spyOn(changelogApi, 'fetchChangelog').mockResolvedValue(mockEntries)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a loading state while fetching', async () => {
    changelogApi.fetchChangelog.mockImplementation(() => new Promise(() => {}))

    const i18n = createTestI18n('en')
    const wrapper = mount(ChangeLog, {
      global: { plugins: [i18n] }
    })

    await flushPromises()
    expect(wrapper.text()).toContain('Loading change log')
  })

  it('renders changelog entries after loading', async () => {
    const i18n = createTestI18n('en')
    const wrapper = mount(ChangeLog, {
      global: { plugins: [i18n] }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Profile menu')
    expect(wrapper.text()).toContain('1.3.0')
    expect(wrapper.text()).toContain('2026-08-15')
  })

  it('renders Markdown descriptions as HTML', async () => {
    const i18n = createTestI18n('en')
    const wrapper = mount(ChangeLog, {
      global: { plugins: [i18n] }
    })

    await flushPromises()

    const description = wrapper.find('.change-log__description')
    expect(description.find('h2').text()).toBe('What\'s new')
    expect(description.find('strong').text()).toBe('profile menu')
    expect(description.find('li').exists()).toBe(true)
  })

  it('shows an empty state when no entries are returned', async () => {
    changelogApi.fetchChangelog.mockResolvedValue([])

    const i18n = createTestI18n('en')
    const wrapper = mount(ChangeLog, {
      global: { plugins: [i18n] }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('No updates available yet')
  })

  it('shows an error state when fetching fails', async () => {
    changelogApi.fetchChangelog.mockRejectedValue(new Error('Network error'))

    const i18n = createTestI18n('en')
    const wrapper = mount(ChangeLog, {
      global: { plugins: [i18n] }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load the change log')
  })
})

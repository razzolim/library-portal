import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../../src/api/featureFlags.js', () => ({
  fetchFeatureFlagValues: vi.fn()
}))

import { fetchFeatureFlagValues } from '../../../src/api/featureFlags.js'
import { useFeatureFlagsStore, FEATURE_FLAGS } from '../../../src/stores/featureFlags.js'

describe('feature flags store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('exposes the pdf_enhanced key', () => {
    expect(FEATURE_FLAGS.PDF_ENHANCED).toBe('pdf_enhanced')
  })

  it('reads flags as off before they are loaded', () => {
    expect(useFeatureFlagsStore().isEnabled('pdf_enhanced')).toBe(false)
  })

  it('loads values and answers isEnabled', async () => {
    fetchFeatureFlagValues.mockResolvedValue([
      { key: 'pdf_enhanced', enabled: true },
      { key: 'dark-mode', enabled: false }
    ])
    const store = useFeatureFlagsStore()

    await store.ensureLoaded()

    expect(store.isEnabled('pdf_enhanced')).toBe(true)
    expect(store.isEnabled('dark-mode')).toBe(false)
    expect(store.isEnabled('unknown')).toBe(false)
  })

  it('treats anything but boolean true as off', async () => {
    fetchFeatureFlagValues.mockResolvedValue([{ key: 'pdf_enhanced', enabled: 'true' }])
    const store = useFeatureFlagsStore()

    await store.ensureLoaded()

    expect(store.isEnabled('pdf_enhanced')).toBe(false)
  })

  it('never rejects, and keeps flags off when loading fails', async () => {
    fetchFeatureFlagValues.mockRejectedValue(new Error('offline'))
    const store = useFeatureFlagsStore()

    await expect(store.ensureLoaded()).resolves.toBeUndefined()

    expect(store.isEnabled('pdf_enhanced')).toBe(false)
  })

  it('shares one request between concurrent callers', async () => {
    fetchFeatureFlagValues.mockResolvedValue([])
    const store = useFeatureFlagsStore()

    await Promise.all([store.ensureLoaded(), store.ensureLoaded()])

    expect(fetchFeatureFlagValues).toHaveBeenCalledTimes(1)
  })

  it('keeps the last known values when a refresh fails', async () => {
    fetchFeatureFlagValues.mockResolvedValueOnce([{ key: 'pdf_enhanced', enabled: true }])
    const store = useFeatureFlagsStore()
    await store.ensureLoaded()

    fetchFeatureFlagValues.mockRejectedValueOnce(new Error('offline'))
    await store.ensureLoaded({ force: true })

    expect(store.isEnabled('pdf_enhanced')).toBe(true)
  })
})

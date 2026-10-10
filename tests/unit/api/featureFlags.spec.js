import { describe, it, expect } from 'vitest'
import { fetchFeatureFlagValues } from '../../../src/api/featureFlags.js'
import { setFeatureFlagEnabled } from '../../../src/api/admin.js'

describe('feature flag values (mock mode)', () => {
  it('returns only key and enabled for each flag', async () => {
    const items = await fetchFeatureFlagValues()

    expect(items.length).toBeGreaterThan(0)
    items.forEach((item) => expect(Object.keys(item).sort()).toEqual(['enabled', 'key']))
  })

  it('has pdf_enhanced enabled by default so the demo book shows the new reader', async () => {
    const items = await fetchFeatureFlagValues()

    expect(items.find((i) => i.key === 'pdf_enhanced')).toEqual({ key: 'pdf_enhanced', enabled: true })
  })

  it('reflects a toggle made in the admin area', async () => {
    await setFeatureFlagEnabled('pdf_enhanced', false)

    const items = await fetchFeatureFlagValues()
    expect(items.find((i) => i.key === 'pdf_enhanced').enabled).toBe(false)

    await setFeatureFlagEnabled('pdf_enhanced', true)
  })
})

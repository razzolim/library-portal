import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { fetchChangelog } from '../../../src/api/changelog.js'
import mockChangelog from '../../../src/mocks/changelog.json'

describe('Changelog API (mock mode)', () => {
  beforeEach(() => {
    vi.stubGlobal('import', { meta: { env: { VITE_USE_MOCK_API: 'true' } } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a list of changelog entries with a delay', async () => {
    const start = Date.now()
    const result = await fetchChangelog()
    const elapsed = Date.now() - start

    expect(result).toEqual(mockChangelog)
    expect(result.length).toBeGreaterThan(0)
    expect(elapsed).toBeGreaterThanOrEqual(450)
  })

  it('returns entries with required fields', async () => {
    const result = await fetchChangelog()

    result.forEach((entry) => {
      expect(entry).toHaveProperty('id')
      expect(entry).toHaveProperty('version')
      expect(entry).toHaveProperty('date')
      expect(entry).toHaveProperty('title')
      expect(entry).toHaveProperty('description')
    })
  })

  it('returns a copy of the mock array, not the original reference', async () => {
    const result = await fetchChangelog()
    expect(result).not.toBe(mockChangelog)
    expect(result).toEqual(mockChangelog)
  })
})

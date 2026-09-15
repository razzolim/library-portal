import { describe, it, expect } from 'vitest'
import { getLatestChangelogVersion } from '../../../src/utils/changelog.js'

describe('getLatestChangelogVersion', () => {
  it('returns the highest semantic version from a list of entries', () => {
    const entries = [
      { id: '1', version: '1.2.0', date: '2026-01-01', title: 'Two', description: '...' },
      { id: '2', version: '1.10.0', date: '2026-01-02', title: 'Ten', description: '...' },
      { id: '3', version: '1.3.0', date: '2026-01-03', title: 'Three', description: '...' }
    ]

    expect(getLatestChangelogVersion(entries)).toBe('1.10.0')
  })

  it('returns the only version when there is a single entry', () => {
    const entries = [{ id: '1', version: '1.0.0', date: '2026-01-01', title: 'Initial', description: '...' }]

    expect(getLatestChangelogVersion(entries)).toBe('1.0.0')
  })

  it('returns null for an empty list', () => {
    expect(getLatestChangelogVersion([])).toBeNull()
  })

  it('returns null when entries is not an array', () => {
    expect(getLatestChangelogVersion(null)).toBeNull()
    expect(getLatestChangelogVersion({})).toBeNull()
    expect(getLatestChangelogVersion('not an array')).toBeNull()
  })
})

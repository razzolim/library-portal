import { describe, it, expect } from 'vitest'
import { formatDate } from '../../../src/utils/date.js'

describe('formatDate', () => {
  it('formats a valid ISO date in English by default', () => {
    const result = formatDate('2026-09-22T10:00:00.000Z')
    expect(result).toContain('2026')
    expect(result).toContain('Sep')
    expect(result).toContain('22')
  })

  it('formats a valid ISO date in Portuguese', () => {
    const result = formatDate('2026-09-22T10:00:00.000Z', 'pt-BR')
    expect(result).toContain('2026')
    expect(result).toContain('22')
  })

  it('returns an empty string for null', () => {
    expect(formatDate(null)).toBe('')
  })

  it('returns an empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('')
  })

  it('returns an empty string for an invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('')
  })
})

import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, formatRelativeTime } from '../../../src/utils/date.js'

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

describe('formatDateTime', () => {
  it('formats date and time for the locale', () => {
    const value = formatDateTime('2026-10-08T13:02:47.000Z', 'en')
    expect(value).toContain('Oct')
    expect(value).toContain('2026')
    expect(value).toMatch(/\d{1,2}:\d{2}/)
  })

  it('returns an empty string for missing or invalid dates', () => {
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime('not-a-date')).toBe('')
  })
})

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-10-10T03:00:00.000Z')

  it('picks the largest fitting unit', () => {
    expect(formatRelativeTime('2026-10-10T02:49:00.000Z', 'en', now)).toBe('11 minutes ago')
    expect(formatRelativeTime('2026-10-09T21:00:00.000Z', 'en', now)).toBe('6 hours ago')
    expect(formatRelativeTime('2026-10-08T03:00:00.000Z', 'en', now)).toBe('2 days ago')
    expect(formatRelativeTime('2026-08-14T03:00:00.000Z', 'en', now)).toBe('2 months ago')
  })

  it('says "now" for the last minute and translates', () => {
    expect(formatRelativeTime('2026-10-10T02:59:40.000Z', 'en', now)).toBe('now')
    expect(formatRelativeTime('2026-10-09T21:00:00.000Z', 'pt-BR', now)).toBe('há 6 horas')
  })

  it('returns an empty string for missing or invalid dates', () => {
    expect(formatRelativeTime(null)).toBe('')
    expect(formatRelativeTime('nope')).toBe('')
  })
})

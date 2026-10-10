import { describe, it, expect } from 'vitest'
import { getCoverImageUrl } from '../../../src/utils/cover.js'

describe('getCoverImageUrl', () => {
  it('prefers a coverUrl from the backend', () => {
    expect(getCoverImageUrl({ coverUrl: 'https://cdn.test/c.jpg', isbn: '123' }, 'M', 'https://covers.test'))
      .toBe('https://cdn.test/c.jpg')
  })

  it('builds a lookup by ISBN when a covers base URL is configured', () => {
    expect(getCoverImageUrl({ isbn: '978-0201633610' }, 'L', 'https://covers.test/b/isbn/'))
      .toBe('https://covers.test/b/isbn/9780201633610-L.jpg?default=false')
  })

  it('returns null without a base URL or an ISBN', () => {
    expect(getCoverImageUrl({ isbn: '978-0201633610' }, 'M', '')).toBeNull()
    expect(getCoverImageUrl({ isbn: null }, 'M', 'https://covers.test')).toBeNull()
  })
})

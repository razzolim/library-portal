import { describe, it, expect } from 'vitest'
import {
  computeScale,
  stepZoom,
  clampZoom,
  clampPage,
  estimateTimeLeft,
  percentRead,
  resolvePdfUrl,
  loadOutline,
  searchPdf
} from '../../../src/utils/pdf.js'

describe('computeScale', () => {
  const page = { width: 600, height: 800 }

  it('fits the page to the container width', () => {
    expect(computeScale('fit-width', page, { width: 900, height: 400 })).toBe(1.5)
  })

  it('fits the whole page when height is the limit', () => {
    expect(computeScale('fit-page', page, { width: 900, height: 400 })).toBe(0.5)
  })

  it('uses a numeric zoom as a percentage', () => {
    expect(computeScale(150, page, { width: 100, height: 100 })).toBe(1.5)
  })

  it('clamps numeric zoom to 50-400%', () => {
    expect(computeScale(10, page, { width: 1, height: 1 })).toBe(0.5)
    expect(computeScale(900, page, { width: 1, height: 1 })).toBe(4)
  })
})

describe('zoom and page helpers', () => {
  it('steps zoom by 25 points within limits', () => {
    expect(stepZoom(100, 1)).toBe(125)
    expect(stepZoom(100, -1)).toBe(75)
    expect(stepZoom(390, 1)).toBe(400)
    expect(stepZoom(60, -1)).toBe(50)
    expect(clampZoom(133.4)).toBe(133)
  })

  it('clamps page numbers and tolerates bad input', () => {
    expect(clampPage(0, 10)).toBe(1)
    expect(clampPage(99, 10)).toBe(10)
    expect(clampPage('7', 10)).toBe(7)
    expect(clampPage('abc', 10)).toBe(1)
  })

  it('computes percent read', () => {
    expect(percentRead(24, 256)).toBe(9)
    expect(percentRead(1, 0)).toBe(0)
  })

  it('estimates time left, or nothing on the last page', () => {
    expect(estimateTimeLeft(256, 256)).toBeNull()
    expect(estimateTimeLeft(1, 256)).toEqual({ hours: 8, minutes: 30 })
    expect(estimateTimeLeft(255, 256)).toEqual({ hours: 0, minutes: 5 })
  })
})

describe('resolvePdfUrl', () => {
  it('resolves a relative proxy URL against the API base', () => {
    expect(resolvePdfUrl('/api/books/12/pdf', 'http://localhost:3000/api')).toBe(
      'http://localhost:3000/api/books/12/pdf'
    )
  })

  it('keeps absolute URLs', () => {
    expect(resolvePdfUrl('https://api.example.com/api/books/1/pdf', 'http://localhost:3000/api')).toBe(
      'https://api.example.com/api/books/1/pdf'
    )
  })
})

describe('loadOutline', () => {
  it('flattens nested entries with depth and resolves named destinations', async () => {
    const pdf = {
      getOutline: async () => [
        {
          title: 'Part 1',
          dest: [{ num: 1 }],
          items: [{ title: 'Chapter 1', dest: 'ch1', items: [] }]
        },
        { title: 'Broken', dest: null, items: [] }
      ],
      getDestination: async (name) => (name === 'ch1' ? [{ num: 2 }] : null),
      getPageIndex: async (ref) => (ref.num === 1 ? 0 : 4)
    }

    expect(await loadOutline(pdf)).toEqual([
      { title: 'Part 1', page: 1, depth: 0 },
      { title: 'Chapter 1', page: 5, depth: 1 }
    ])
  })

  it('returns an empty list when the PDF has no outline', async () => {
    expect(await loadOutline({ getOutline: async () => null })).toEqual([])
  })
})

describe('searchPdf', () => {
  const pages = ['Hello world', 'Nothing here', 'The WORLD again, twice: world']
  const pdf = {
    numPages: pages.length,
    getPage: async (n) => ({
      getTextContent: async () => ({ items: pages[n - 1].split(' ').map((str) => ({ str })) })
    })
  }

  it('finds the first match per page, ignoring case', async () => {
    const results = await searchPdf(pdf, 'world')
    expect(results.map((r) => r.page)).toEqual([1, 3])
    expect(results[0].snippet).toContain('Hello world')
  })

  it('returns nothing for a blank query', async () => {
    expect(await searchPdf(pdf, '   ')).toEqual([])
  })

  it('stops when cancelled', async () => {
    expect(await searchPdf(pdf, 'world', () => true)).toEqual([])
  })
})

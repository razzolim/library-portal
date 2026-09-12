import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../../../src/utils/markdown.js'

describe('renderMarkdown', () => {
  it('renders headings as HTML', () => {
    const html = renderMarkdown('# Title')
    expect(html).toContain('<h1>Title</h1>')
  })

  it('renders bold text as strong HTML', () => {
    const html = renderMarkdown('**bold**')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('renders lists as HTML', () => {
    const html = renderMarkdown('- item one\n- item two')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>item one</li>')
    expect(html).toContain('<li>item two</li>')
  })

  it('returns an empty string for falsy input', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown(null)).toBe('')
    expect(renderMarkdown(undefined)).toBe('')
  })

  it('sanitizes malicious HTML from the input', () => {
    const html = renderMarkdown('[link](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('onclick')
  })
})

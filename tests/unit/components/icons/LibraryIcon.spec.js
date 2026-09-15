import { describe, it, expect } from 'vitest'
import { mountWithI18n } from '../../test-utils.js'
import LibraryIcon from '../../../../src/components/icons/LibraryIcon.vue'

describe('LibraryIcon', () => {
  it('renders an svg icon with default size', () => {
    const wrapper = mountWithI18n(LibraryIcon)
    const svg = wrapper.find('svg')

    expect(svg.exists()).toBe(true)
    expect(svg.attributes('width')).toBe('24')
    expect(svg.attributes('height')).toBe('24')
    expect(svg.attributes('stroke')).toBe('currentColor')
    expect(svg.attributes('fill')).toBe('none')
    expect(svg.findAll('path').length).toBe(3)
  })

  it('renders with a custom size', () => {
    const wrapper = mountWithI18n(LibraryIcon, {
      props: { size: 56 }
    })
    const svg = wrapper.find('svg')

    expect(svg.attributes('width')).toBe('56')
    expect(svg.attributes('height')).toBe('56')
  })

  it('exposes an aria-label when provided', () => {
    const wrapper = mountWithI18n(LibraryIcon, {
      props: { ariaLabel: 'Library Portal' }
    })
    const svg = wrapper.find('svg')

    expect(svg.attributes('aria-label')).toBe('Library Portal')
    expect(svg.attributes('aria-hidden')).toBe('false')
  })
})

import { describe, it, expect } from 'vitest'
import { mountWithI18n } from '../test-utils.js'
import BookCover from '../../../src/components/BookCover.vue'

const book = {
  id: 2,
  title: 'Clean Code',
  author: 'Robert C. Martin',
  isbn: '978-0132350884',
  coverColor: '#2d3748'
}

describe('BookCover', () => {
  it('prints a cover with the title and author when there is no cover image', () => {
    const wrapper = mountWithI18n(BookCover, { props: { book } })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.book-cover__title').text()).toBe('Clean Code')
    expect(wrapper.find('.book-cover__author').text()).toBe('Robert C. Martin')
    expect(wrapper.attributes('style')).toContain('--cover-color: #2d3748')
  })

  it('shows the cover image over the printed cover once it loads', async () => {
    const wrapper = mountWithI18n(BookCover, { props: { book: { ...book, coverUrl: 'https://cdn.test/clean-code.jpg' } } })
    const img = wrapper.find('img')

    expect(img.attributes('src')).toBe('https://cdn.test/clean-code.jpg')
    expect(img.classes()).not.toContain('book-cover__image--loaded')

    Object.defineProperty(img.element, 'naturalWidth', { value: 180 })
    await img.trigger('load')

    expect(wrapper.find('img').classes()).toContain('book-cover__image--loaded')
  })

  it('falls back to the printed cover when the image fails or is a placeholder', async () => {
    const failing = mountWithI18n(BookCover, { props: { book: { ...book, coverUrl: 'https://cdn.test/missing.jpg' } } })
    await failing.find('img').trigger('error')
    expect(failing.find('img').exists()).toBe(false)

    const placeholder = mountWithI18n(BookCover, { props: { book: { ...book, coverUrl: 'https://cdn.test/blank.jpg' } } })
    Object.defineProperty(placeholder.find('img').element, 'naturalWidth', { value: 1 })
    await placeholder.find('img').trigger('load')
    expect(placeholder.find('img').exists()).toBe(false)
    expect(placeholder.find('.book-cover__title').exists()).toBe(true)
  })

  it('uses the default color when the book has none', () => {
    const wrapper = mountWithI18n(BookCover, { props: { book: { ...book, coverColor: null } } })
    expect(wrapper.attributes('style')).toContain('--cover-color: #3b82f6')
  })

  it('leaves out the author on small covers', () => {
    const wrapper = mountWithI18n(BookCover, { props: { book, size: 'sm' } })
    expect(wrapper.find('.book-cover__author').exists()).toBe(false)
  })
})

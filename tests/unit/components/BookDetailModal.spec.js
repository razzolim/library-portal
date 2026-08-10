import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mountWithI18n } from '../test-utils.js'
import { flushPromises } from '@vue/test-utils'
import BookDetailModal from '../../../src/components/BookDetailModal.vue'

const book = {
  id: 1,
  title: 'The Pragmatic Programmer',
  author: 'Andrew Hunt & David Thomas',
  year: 1999,
  genre: 'Software Engineering',
  status: 'available',
  isbn: '978-0201616224',
  coverColor: '#4a5568',
  summary: 'A classic guide for software developers that emphasizes practical approaches.'
}

vi.mock('../../../src/api/books.js', () => ({
  fetchBookById: vi.fn()
}))

import { fetchBookById } from '../../../src/api/books.js'

function mountModal(props = {}) {
  return mountWithI18n(BookDetailModal, {
    props: { bookId: 1, ...props }
  })
}

describe('BookDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', async () => {
    fetchBookById.mockImplementation(() => new Promise(() => {}))
    const wrapper = mountModal()
    await nextTick()

    expect(wrapper.find('.book-detail-modal__loading').exists()).toBe(true)
  })

  it('renders book details after loading', async () => {
    fetchBookById.mockResolvedValue(book)

    const wrapper = mountModal()
    await flushPromises()

    expect(wrapper.find('.book-detail-modal__title').text()).toBe(book.title)
    expect(wrapper.find('.book-detail-modal__author').text()).toBe(book.author)
    expect(wrapper.text()).toContain(book.isbn)
    expect(wrapper.text()).toContain(String(book.year))
    expect(wrapper.find('.book-detail-modal__summary-text').text()).toBe(book.summary)
  })

  it('emits close when close button is clicked', async () => {
    fetchBookById.mockResolvedValue(book)
    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.book-detail-modal__close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when overlay is clicked', async () => {
    fetchBookById.mockResolvedValue(book)
    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.book-detail-overlay').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when Escape key is pressed', async () => {
    fetchBookById.mockResolvedValue(book)
    const wrapper = mountModal()
    await flushPromises()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

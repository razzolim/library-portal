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
  summary: 'A classic guide for software developers that emphasizes practical approaches.',
  pdfUrl: 'https://drive.google.com/file/d/1cElC7xqVArPo9jZMWDksRHtIwCxSq-qi/view?usp=drive_link'
}

const mockResolve = vi.fn()
const mockRouter = {
  resolve: mockResolve
}

vi.mock('../../../src/api/books.js', () => ({
  fetchBookById: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => ({})
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
    mockResolve.mockReturnValue({ href: '/library/1/read' })
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

  it('renders a read online button when the book has a valid pdfUrl', async () => {
    fetchBookById.mockResolvedValue(book)

    const wrapper = mountModal()
    await flushPromises()

    expect(wrapper.find('.book-detail-modal__read-button').exists()).toBe(true)
  })

  it('does not render a read online button when the book has no pdfUrl', async () => {
    fetchBookById.mockResolvedValue({ ...book, pdfUrl: null })

    const wrapper = mountModal()
    await flushPromises()

    expect(wrapper.find('.book-detail-modal__read-button').exists()).toBe(false)
  })

  it('does not render a read online button when the pdfUrl is invalid', async () => {
    fetchBookById.mockResolvedValue({ ...book, pdfUrl: 'not-a-drive-url' })

    const wrapper = mountModal()
    await flushPromises()

    expect(wrapper.find('.book-detail-modal__read-button').exists()).toBe(false)
  })

  it('opens the book reader in a new tab when the read online button is clicked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})
    fetchBookById.mockResolvedValue(book)

    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.book-detail-modal__read-button').trigger('click')

    expect(mockResolve).toHaveBeenCalledWith({
      name: 'book-read',
      params: { id: 1 }
    })
    expect(openSpy).toHaveBeenCalledWith('/library/1/read', '_blank', 'noopener,noreferrer')

    openSpy.mockRestore()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountWithI18n } from '../test-utils.js'
import BookPdfView from '../../../src/views/BookPdfView.vue'

const mockRoute = ref({ params: { id: '1' } })

const mockResolve = vi.fn()
const mockRouter = {
  resolve: mockResolve
}

vi.mock('../../../src/api/books.js', () => ({
  fetchBookById: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute.value,
  useRouter: () => mockRouter
}))

import { fetchBookById } from '../../../src/api/books.js'

const book = {
  id: 1,
  title: 'The Pragmatic Programmer',
  author: 'Andrew Hunt & David Thomas',
  pdfUrl: 'https://drive.google.com/file/d/1cElC7xqVArPo9jZMWDksRHtIwCxSq-qi/view?usp=drive_link'
}

function mountView() {
  return mountWithI18n(BookPdfView)
}

describe('BookPdfView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.value = { params: { id: '1' } }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a loading state initially', async () => {
    fetchBookById.mockImplementation(() => new Promise(() => {}))
    const wrapper = mountView()

    await flushPromises()

    expect(wrapper.find('.book-pdf-view').exists()).toBe(true)
  })

  it('renders the PDF viewer when the book has a valid pdfUrl', async () => {
    fetchBookById.mockResolvedValue(book)

    const wrapper = mountView()
    await flushPromises()

    const iframe = wrapper.find('.pdf-viewer__frame')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toBe(
      'https://drive.google.com/file/d/1cElC7xqVArPo9jZMWDksRHtIwCxSq-qi/preview'
    )
  })

  it('renders an error when the book has no pdfUrl', async () => {
    fetchBookById.mockResolvedValue({ ...book, pdfUrl: null })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.book-pdf-view__error').exists()).toBe(true)
  })

  it('renders an error when the book is not found', async () => {
    fetchBookById.mockResolvedValue(null)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.book-pdf-view__error').exists()).toBe(true)
  })

  it('closes the window when the viewer emits close', async () => {
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})
    fetchBookById.mockResolvedValue(book)

    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('.pdf-viewer__close').trigger('click')

    expect(closeSpy).toHaveBeenCalled()

    closeSpy.mockRestore()
  })
})

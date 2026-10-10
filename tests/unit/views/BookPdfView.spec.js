import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { mountWithI18n } from '../test-utils.js'
import BookPdfView from '../../../src/views/BookPdfView.vue'

const mockRoute = ref({ params: { id: '1' } })

const mockPush = vi.fn()
const mockRouter = {
  push: mockPush
}

vi.mock('../../../src/api/featureFlags.js', () => ({
  fetchFeatureFlagValues: vi.fn()
}))

vi.mock('../../../src/api/books.js', () => ({
  fetchBookById: vi.fn()
}))

vi.mock('../../../src/components/PdfReader.vue', () => ({
  default: {
    props: ['book', 'pdfUrl'],
    template: '<div class="pdf-reader-stub">{{ pdfUrl }}</div>'
  }
}))

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute.value,
  useRouter: () => mockRouter
}))

import { fetchBookById } from '../../../src/api/books.js'
import { fetchFeatureFlagValues } from '../../../src/api/featureFlags.js'

const book = {
  id: 1,
  title: 'The Pragmatic Programmer',
  author: 'Andrew Hunt & David Thomas',
  pdfUrl: 'https://drive.google.com/file/d/1cElC7xqVArPo9jZMWDksRHtIwCxSq-qi/view?usp=drive_link'
}

function setFlag(enabled) {
  fetchFeatureFlagValues.mockResolvedValue([{ key: 'pdf_enhanced', enabled }])
}

function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mountWithI18n(BookPdfView, { global: { plugins: [pinia] } })
}

describe('BookPdfView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.value = { params: { id: '1' } }
    setFlag(true)
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

    const iframe = wrapper.find('.pdf-reader__frame')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toBe(
      'https://drive.google.com/file/d/1cElC7xqVArPo9jZMWDksRHtIwCxSq-qi/preview'
    )
  })

  it('uses the PDF.js reader for a backend proxy URL (relative to the API base)', async () => {
    fetchBookById.mockResolvedValue({ ...book, pdfUrl: '/api/books/1/pdf' })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.pdf-reader-stub').text()).toMatch(/\/api\/books\/1\/pdf$/)
    expect(wrapper.find('.pdf-reader__frame').exists()).toBe(false)
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
    vi.useFakeTimers()
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {
      Object.defineProperty(window, 'closed', { value: true, configurable: true })
    })
    fetchBookById.mockResolvedValue(book)

    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('.pdf-reader__close').trigger('click')
    vi.advanceTimersByTime(200)

    expect(closeSpy).toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()

    delete window.closed
    vi.useRealTimers()
  })

  it('falls back to the library when the tab cannot be closed', async () => {
    vi.useFakeTimers()
    vi.spyOn(window, 'close').mockImplementation(() => {})
    fetchBookById.mockResolvedValue(book)

    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('.pdf-reader__close').trigger('click')
    vi.advanceTimersByTime(200)

    expect(mockPush).toHaveBeenCalledWith({ name: 'library' })
    vi.useRealTimers()
  })

  it('goes back to the book details in the same tab', async () => {
    fetchBookById.mockResolvedValue(book)

    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('.pdf-reader__back').trigger('click')

    expect(mockPush).toHaveBeenCalledWith({ name: 'book-detail', params: { id: 1 } })
  })

  describe('pdf_enhanced flag', () => {
    it('shows the original reader when the flag is off', async () => {
      setFlag(false)
      fetchBookById.mockResolvedValue(book)

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('.pdf-viewer__frame').exists()).toBe(true)
      expect(wrapper.find('.pdf-reader__bar').exists()).toBe(false)
      expect(wrapper.find('.pdf-reader-stub').exists()).toBe(false)
    })

    it('shows the original reader when the flag is unknown to the backend', async () => {
      fetchFeatureFlagValues.mockResolvedValue([])
      fetchBookById.mockResolvedValue(book)

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('.pdf-viewer__frame').exists()).toBe(true)
    })

    it('shows the original reader when the flags cannot be loaded', async () => {
      fetchFeatureFlagValues.mockRejectedValue(new Error('offline'))
      fetchBookById.mockResolvedValue(book)

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('.pdf-viewer__frame').exists()).toBe(true)
    })

    it('the original reader only closes the window', async () => {
      setFlag(false)
      vi.useFakeTimers()
      vi.spyOn(window, 'close').mockImplementation(() => {})
      fetchBookById.mockResolvedValue(book)

      const wrapper = mountView()
      await flushPromises()
      await wrapper.find('.pdf-viewer__close').trigger('click')
      vi.advanceTimersByTime(500)

      expect(window.close).toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
      vi.useRealTimers()
    })

    it('does not open a backend-style URL in the original reader', async () => {
      setFlag(false)
      fetchBookById.mockResolvedValue({ ...book, pdfUrl: '/api/books/1/pdf' })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('.pdf-reader-stub').exists()).toBe(false)
      expect(wrapper.find('.book-pdf-view__error').exists()).toBe(true)
    })

    it('shows the enhanced bar around the Drive preview in mock mode', async () => {
      fetchBookById.mockResolvedValue(book)

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('.pdf-reader__bar').exists()).toBe(true)
      expect(wrapper.find('.pdf-reader__frame').exists()).toBe(true)
    })
  })
})

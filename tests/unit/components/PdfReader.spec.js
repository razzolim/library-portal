import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createTestI18n } from '../test-utils.js'

const renderMock = vi.fn()

function makePdf(numPages = 10) {
  return {
    numPages,
    getOutline: async () => [{ title: 'Chapter 1', dest: [{ num: 4 }], items: [] }],
    getPageIndex: async () => 3,
    getPage: async (n) => ({
      pageNumber: n,
      getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
      getTextContent: async () => ({ items: [{ str: n === 4 ? 'needle in a haystack' : 'plain text' }] }),
      render: (params) => {
        renderMock(n, params)
        return { promise: Promise.resolve(), cancel: vi.fn() }
      }
    })
  }
}

vi.mock('../../../src/utils/pdf.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, openPdf: vi.fn() }
})

vi.mock('../../../src/api/reader.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchProgress: vi.fn(),
    saveProgress: vi.fn(),
    saveProgressOnExit: vi.fn(),
    fetchBookmarks: vi.fn(),
    addBookmark: vi.fn(),
    removeBookmark: vi.fn(),
    updateReaderPreferences: vi.fn().mockResolvedValue({ success: true })
  }
})

import { openPdf } from '../../../src/utils/pdf.js'
import * as readerApi from '../../../src/api/reader.js'
import PdfReader from '../../../src/components/PdfReader.vue'
import { useAuthStore } from '../../../src/stores/auth.js'

const BOOK = { id: 7, title: 'Dom Casmurro', author: 'Machado de Assis' }

const mounted = []

async function mountReader() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.user = { username: 'reader', role: 'reader' }
  auth.token = 'tkn'

  const wrapper = mount(PdfReader, {
    props: { book: BOOK, pdfUrl: 'http://localhost:3000/api/books/7/pdf' },
    global: { plugins: [createTestI18n('en'), pinia] },
    attachTo: document.body
  })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, auth }
}

describe('PdfReader', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    vi.clearAllMocks()
    openPdf.mockResolvedValue({ pdf: makePdf(), destroy: vi.fn() })
    readerApi.fetchProgress.mockResolvedValue({ page: 1 })
    readerApi.fetchBookmarks.mockResolvedValue([])
    readerApi.saveProgress.mockResolvedValue({ success: true })
    readerApi.updateReaderPreferences.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    // Readers listen on `document`; leaving them mounted would leak into the next test.
    mounted.splice(0).forEach((w) => w.unmount())
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('opens the PDF with the user token and renders page 1', async () => {
    const { wrapper } = await mountReader()

    expect(openPdf).toHaveBeenCalledWith('http://localhost:3000/api/books/7/pdf', 'tkn')
    expect(renderMock).toHaveBeenCalledWith(1, expect.anything())
    expect(wrapper.find('.reader-controls').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('Dom Casmurro')
    expect(document.title).toBe('Dom Casmurro · Library Portal')
  })

  it('resumes from the saved page and says so', async () => {
    readerApi.fetchProgress.mockResolvedValue({ page: 4 })

    const { wrapper } = await mountReader()

    expect(renderMock).toHaveBeenCalledWith(4, expect.anything())
    expect(wrapper.find('.pdf-reader__toast').text()).toBe('Continuing from page 4')
    expect(wrapper.find('#reader-page-input').element.value).toBe('4')
  })

  it('clamps a saved page that is beyond the book', async () => {
    readerApi.fetchProgress.mockResolvedValue({ page: 999 })

    await mountReader()

    expect(renderMock).toHaveBeenCalledWith(10, expect.anything())
  })

  it('saves progress once after the reader stops turning pages', async () => {
    const { wrapper } = await mountReader()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await flushPromises()
    expect(readerApi.saveProgress).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2600)

    expect(readerApi.saveProgress).toHaveBeenCalledTimes(1)
    expect(readerApi.saveProgress).toHaveBeenCalledWith(7, { page: 3, totalPages: 10 })
    wrapper.unmount()
  })

  it('sends the last position when the reader is left with unsaved progress', async () => {
    const { wrapper } = await mountReader()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }))
    await flushPromises()

    wrapper.unmount()

    expect(readerApi.saveProgressOnExit).toHaveBeenCalledWith(7, { page: 10, totalPages: 10 }, 'tkn')
  })

  it('does not save anything when the page never changed', async () => {
    const { wrapper } = await mountReader()

    wrapper.unmount()

    expect(readerApi.saveProgressOnExit).not.toHaveBeenCalled()
  })

  it('Escape closes the panel but never the reader', async () => {
    const { wrapper } = await mountReader()
    await wrapper.find('[aria-pressed]').trigger('click')
    expect(wrapper.find('.reader-side').exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()

    expect(wrapper.find('.reader-side').exists()).toBe(false)
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('jumps to a chapter from the contents', async () => {
    const { wrapper } = await mountReader()
    await wrapper.find('[aria-pressed]').trigger('click')
    await flushPromises()

    await wrapper.find('.reader-side__item').trigger('click')
    await flushPromises()

    expect(renderMock).toHaveBeenLastCalledWith(4, expect.anything())
  })

  it('adds and removes bookmarks', async () => {
    readerApi.addBookmark.mockResolvedValue({
      success: true,
      bookmark: { id: 5, page: 1, note: null }
    })
    readerApi.removeBookmark.mockResolvedValue({ success: true })
    const { wrapper } = await mountReader()
    await wrapper.find('[aria-pressed]').trigger('click')
    await wrapper.findAll('.reader-side__tab')[1].trigger('click')

    await wrapper.find('.reader-side__action').trigger('click')
    await flushPromises()

    expect(readerApi.addBookmark).toHaveBeenCalledWith(7, { page: 1 })
    expect(wrapper.find('.reader-side__action').text()).toBe('Page 1 is bookmarked')

    await wrapper.find('.reader-side__remove').trigger('click')
    await flushPromises()

    expect(readerApi.removeBookmark).toHaveBeenCalledWith(7, 5)
    expect(wrapper.find('.reader-side__empty').text()).toBe('No bookmarks yet.')
  })

  it('shows a translated message when a bookmark cannot be added', async () => {
    readerApi.addBookmark.mockResolvedValue({ success: false, errorKey: 'reader.bookmarkLimit' })
    const { wrapper } = await mountReader()
    await wrapper.find('[aria-pressed]').trigger('click')
    await wrapper.findAll('.reader-side__tab')[1].trigger('click')

    await wrapper.find('.reader-side__action').trigger('click')
    await flushPromises()

    expect(wrapper.find('.reader-side__error').text()).toBe(
      'This book has too many bookmarks. Remove one first.'
    )
  })

  it('searches the text and jumps to a result', async () => {
    const { wrapper } = await mountReader()
    await wrapper.find('.pdf-reader__icon-btn:not([aria-pressed]):not(.pdf-reader__back)').trigger('click')
    await flushPromises()

    await wrapper.find('#reader-search-input').setValue('needle')
    await wrapper.find('.reader-side__search').trigger('submit')
    await flushPromises()

    const result = wrapper.find('.reader-side__item--stack')
    expect(result.text()).toContain('Page 4')
    await result.trigger('click')
    await flushPromises()
    expect(renderMock).toHaveBeenLastCalledWith(4, expect.anything())
  })

  it('persists the dark page choice', async () => {
    const { wrapper, auth } = await mountReader()

    await wrapper.find('.reader-controls__group .reader-controls__btn:last-child').trigger('click')

    expect(wrapper.find('.pdf-reader__canvas--dark').exists()).toBe(true)
    expect(readerApi.updateReaderPreferences).toHaveBeenCalledWith({ pageTheme: 'dark' })
    expect(auth.readerPreferences.pageTheme).toBe('dark')
  })

  it('shows an error panel with a not-found message and retries', async () => {
    openPdf.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 404 }))

    const { wrapper } = await mountReader()

    expect(wrapper.find('[role="alert"]').text()).toContain('no readable file')
    expect(wrapper.find('.reader-controls').exists()).toBe(false)

    await wrapper.find('.pdf-reader__btn--primary').trigger('click')
    await flushPromises()

    expect(openPdf).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.reader-controls').exists()).toBe(true)
  })

  it('emits back and close from the bar', async () => {
    const { wrapper } = await mountReader()

    await wrapper.find('.pdf-reader__back').trigger('click')
    await wrapper.find('.pdf-reader__close').trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

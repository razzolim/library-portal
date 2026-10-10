import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountWithI18n } from '../test-utils.js'
import BookPdfViewer from '../../../src/components/BookPdfViewer.vue'

const PREVIEW_URL = 'https://drive.google.com/file/d/1cElC7xqVArPo9jZMWDksRHtIwCxSq-qi/preview'
const BOOK = { id: 1, title: 'The Pragmatic Programmer', author: 'Andrew Hunt & David Thomas' }

function mountViewer(props = {}) {
  return mountWithI18n(BookPdfViewer, {
    props: { previewUrl: PREVIEW_URL, book: BOOK, ...props }
  })
}

describe('BookPdfViewer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the iframe with the preview URL and a descriptive title', () => {
    const iframe = mountViewer().find('.pdf-reader__frame')

    expect(iframe.attributes('src')).toBe(PREVIEW_URL)
    expect(iframe.attributes('title')).toBe('The Pragmatic Programmer (reader)')
  })

  it('shows the book title and author in a page heading', () => {
    const wrapper = mountViewer()

    expect(wrapper.find('h1').text()).toBe(BOOK.title)
    expect(wrapper.find('.pdf-reader__author').text()).toBe(BOOK.author)
  })

  it('is a regular page, not a modal dialog', () => {
    const wrapper = mountViewer()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.find('main').exists()).toBe(true)
  })

  it('sets the document title to the book', () => {
    mountViewer()

    expect(document.title).toBe('The Pragmatic Programmer · Library Portal')
  })

  it('emits close from the close button and back from the back button', async () => {
    const wrapper = mountViewer()

    await wrapper.find('.pdf-reader__close').trigger('click')
    await wrapper.find('.pdf-reader__back').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('does not close when Escape is pressed or the page is right-clicked', () => {
    const wrapper = mountViewer()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    const contextMenu = new Event('contextmenu', { bubbles: true, cancelable: true })
    document.dispatchEvent(contextMenu)

    expect(wrapper.emitted('close')).toBeUndefined()
    expect(contextMenu.defaultPrevented).toBe(false)
  })

  it('shows a loading state, then hides it once the iframe loads', async () => {
    const wrapper = mountViewer()
    expect(wrapper.find('.pdf-reader__loading').exists()).toBe(true)

    await wrapper.find('.pdf-reader__frame').trigger('load')

    expect(wrapper.find('.pdf-reader__loading').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('shows an error with retry and back when the iframe never loads', async () => {
    const wrapper = mountViewer()

    await vi.advanceTimersByTimeAsync(20000)

    const alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBe(true)
    expect(wrapper.find('.pdf-reader__loading').exists()).toBe(false)

    await alert.find('.pdf-reader__btn:last-child').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('does not time out once the iframe has loaded', async () => {
    const wrapper = mountViewer()

    await wrapper.find('.pdf-reader__frame').trigger('load')
    await vi.advanceTimersByTimeAsync(30000)

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('reloads the iframe and clears the error on retry', async () => {
    const wrapper = mountViewer()
    await vi.advanceTimersByTimeAsync(20000)
    const firstFrame = wrapper.find('.pdf-reader__frame').element

    await wrapper.find('.pdf-reader__btn--primary').trigger('click')

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('.pdf-reader__loading').exists()).toBe(true)
    expect(wrapper.find('.pdf-reader__frame').element).not.toBe(firstFrame)
  })

  it('hides the fullscreen button when fullscreen is unavailable', () => {
    expect(mountViewer().find('[aria-pressed]').exists()).toBe(false)
  })

  it('toggles fullscreen when available', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true })
    const wrapper = mountViewer()
    const request = vi.fn().mockResolvedValue()
    wrapper.element.requestFullscreen = request

    await wrapper.find('[aria-pressed]').trigger('click')

    expect(request).toHaveBeenCalled()
    delete document.fullscreenEnabled
  })
})

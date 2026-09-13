import { describe, it, expect, vi, afterEach } from 'vitest'
import { mountWithI18n } from '../test-utils.js'
import { flushPromises } from '@vue/test-utils'
import BookPdfViewer from '../../../src/components/BookPdfViewer.vue'

const PREVIEW_URL = 'https://drive.google.com/file/d/1cElC7xqVArPo9jZMWDksRHtIwCxSq-qi/preview'

function mountViewer(props = {}) {
  return mountWithI18n(BookPdfViewer, {
    props: { previewUrl: PREVIEW_URL, ...props }
  })
}

describe('BookPdfViewer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the iframe with the preview URL', () => {
    const wrapper = mountViewer()

    const iframe = wrapper.find('.pdf-viewer__frame')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toBe(PREVIEW_URL)
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = mountViewer()

    await wrapper.find('.pdf-viewer__close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when the overlay is clicked', async () => {
    const wrapper = mountViewer()

    await wrapper.find('.pdf-viewer-overlay').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when the Escape key is pressed', async () => {
    const wrapper = mountViewer()
    await flushPromises()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('shows a loading state initially', () => {
    const wrapper = mountViewer()

    expect(wrapper.find('.pdf-viewer__loading').exists()).toBe(true)
  })

  it('hides the loading state after the iframe loads', async () => {
    const wrapper = mountViewer()

    await wrapper.find('.pdf-viewer__frame').trigger('load')

    expect(wrapper.find('.pdf-viewer__loading').exists()).toBe(false)
    expect(wrapper.find('.pdf-viewer__frame').exists()).toBe(true)
  })
})

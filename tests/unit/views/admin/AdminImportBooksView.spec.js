import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { createTestI18n } from '../../test-utils.js'
import AdminImportBooksView from '../../../../src/views/admin/AdminImportBooksView.vue'
import { importBooks } from '../../../../src/api/admin.js'

vi.mock('../../../../src/api/admin.js', () => ({ importBooks: vi.fn() }))

const VALID = 'title,author,status\nA,B,available\nC,D,borrowed\n'

function mountView() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/library', name: 'library', component: { template: '<div />' } }
    ]
  })
  return mount(AdminImportBooksView, {
    global: { plugins: [createTestI18n('en'), router, createPinia()] }
  })
}

async function pickFile(wrapper, content, name = 'books.csv') {
  const input = wrapper.find('input[type="file"]')
  const file = new File([content], name, { type: 'text/csv' })
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  // jsdom reads files through FileReader, which resolves on a later task.
  await vi.waitFor(() => expect(wrapper.find('.admin-import__file-meta').text()).not.toBe(''))
  await new Promise((resolve) => setTimeout(resolve, 20))
  await flushPromises()
}

describe('AdminImportBooksView', () => {
  beforeEach(() => importBooks.mockReset())

  it('asks for a file when submitting without one', async () => {
    const wrapper = mountView()
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Choose a CSV file to import.')
    expect(importBooks).not.toHaveBeenCalled()
  })

  it('shows the number of books found and imports the file', async () => {
    importBooks.mockResolvedValue({ success: true, imported: 2 })
    const wrapper = mountView()
    await pickFile(wrapper, VALID)

    expect(wrapper.text()).toContain('books.csv')
    expect(wrapper.text()).toContain('2 books found')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(importBooks).toHaveBeenCalledWith(VALID, expect.anything())
    expect(wrapper.find('[role="status"]').text()).toContain('2 books were imported.')
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('blocks files that are not CSV or have a bad header before calling the API', async () => {
    const wrapper = mountView()
    await pickFile(wrapper, VALID, 'books.txt')
    expect(wrapper.text()).toContain('.csv extension')

    await wrapper.find('.admin-import__remove').trigger('click')
    await pickFile(wrapper, 'title,foo\nx,y\n')
    expect(wrapper.text()).toContain('Missing columns: author, status.')
    expect(wrapper.text()).toContain('Unknown columns: foo.')

    await wrapper.find('form').trigger('submit')
    expect(importBooks).not.toHaveBeenCalled()
  })

  it('lists the backend row errors', async () => {
    importBooks.mockResolvedValue({
      success: false,
      errorKey: 'admin.books.import.invalidRows',
      errors: [{ line: 3, fields: { title: 'required', year: 'invalid_type' } }]
    })
    const wrapper = mountView()
    await pickFile(wrapper, VALID)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('3')
    expect(rows[0].text()).toContain('title')
    expect(rows[0].text()).toContain('This value is required.')
    expect(wrapper.find('[role="alert"]').text()).toContain('Some rows are invalid.')
  })

  it('shows a generic error for an unknown failure', async () => {
    importBooks.mockResolvedValue({ success: false, errorKey: 'something.unexpected' })
    const wrapper = mountView()
    await pickFile(wrapper, VALID)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to import the books.')
  })
})

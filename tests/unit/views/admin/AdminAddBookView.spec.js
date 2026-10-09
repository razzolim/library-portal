import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { createTestI18n } from '../../test-utils.js'
import AdminAddBookView from '../../../../src/views/admin/AdminAddBookView.vue'
import { useAuthStore } from '../../../../src/stores/auth.js'
import { createBook } from '../../../../src/api/admin.js'

vi.mock('../../../../src/api/admin.js', () => ({
  createBook: vi.fn()
}))

vi.mock('../../../../src/api/books.js', () => ({
  fetchBooks: vi.fn().mockResolvedValue([
    { id: 1, genre: 'Fiction' },
    { id: 2, genre: 'DevOps' },
    { id: 3, genre: 'Fiction' }
  ])
}))

function mountView() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/admin/books/new', name: 'admin-add-book', component: AdminAddBookView },
      { path: '/library/:id', name: 'book-detail', component: { template: '<div />' } }
    ]
  })
  const pinia = createPinia()
  const auth = useAuthStore(pinia)
  auth.user = { id: 2, username: 'admin', role: 'admin' }
  auth.token = 'mock-token'

  return mount(AdminAddBookView, {
    global: { plugins: [createTestI18n('en'), router, pinia] }
  })
}

describe('AdminAddBookView', () => {
  beforeEach(() => {
    createBook.mockReset()
  })

  it('suggests the existing genres without duplicates', async () => {
    const wrapper = mountView()
    await flushPromises()

    const options = wrapper.findAll('#admin-book-genres option').map((o) => o.attributes('value'))
    expect(options).toEqual(['DevOps', 'Fiction'])
  })

  it('requires title and author', async () => {
    const wrapper = mountView()
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Enter the book title.')
    expect(wrapper.text()).toContain("Enter the author's name.")
    expect(createBook).not.toHaveBeenCalled()
  })

  it('validates the year, ISBN and PDF link formats', async () => {
    const wrapper = mountView()
    await wrapper.find('#admin-book-title').setValue('Title')
    await wrapper.find('#admin-book-author').setValue('Author')
    await wrapper.find('#admin-book-year').setValue('99999')
    await wrapper.find('#admin-book-isbn').setValue('abc')
    await wrapper.find('#admin-book-pdf-url').setValue('not a url')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Enter a year between 0 and')
    expect(wrapper.text()).toContain('Enter a valid ISBN')
    expect(wrapper.text()).toContain('Enter a valid URL')
    expect(createBook).not.toHaveBeenCalled()
  })

  it('submits the book, shows a link to it, and clears the form', async () => {
    createBook.mockResolvedValue({ success: true, book: { id: 13, title: 'Refactoring' } })
    const wrapper = mountView()
    await wrapper.find('#admin-book-title').setValue('Refactoring')
    await wrapper.find('#admin-book-author').setValue('Martin Fowler')
    await wrapper.find('#admin-book-year').setValue('2018')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createBook).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Refactoring', author: 'Martin Fowler', year: 2018, status: 'available', isbn: null }),
      { uploadedBy: 'admin' }
    )
    expect(wrapper.text()).toContain('"Refactoring" was added to the library.')
    expect(wrapper.find('a[href="/library/13"]').exists()).toBe(true)
    expect(wrapper.find('#admin-book-title').element.value).toBe('')
  })

  it('shows the mapped error for a duplicate ISBN', async () => {
    createBook.mockResolvedValue({ success: false, errorKey: 'admin.books.duplicateIsbn' })
    const wrapper = mountView()
    await wrapper.find('#admin-book-title').setValue('Copy')
    await wrapper.find('#admin-book-author').setValue('Someone')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('A book with this ISBN already exists.')
  })
})

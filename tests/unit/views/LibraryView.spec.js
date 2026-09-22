import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import { createTestI18n } from '../test-utils.js'
import LibraryView from '../../../src/views/LibraryView.vue'

const books = [
  {
    id: 1,
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt & David Thomas',
    year: 1999,
    genre: 'Software Engineering',
    status: 'available',
    isbn: '978-0201616224',
    coverColor: '#4a5568',
    summary: 'A classic guide for software developers.'
  },
  {
    id: 2,
    title: 'Continuous Delivery',
    author: 'Jez Humble & David Farley',
    year: 2010,
    genre: 'DevOps',
    status: 'available',
    isbn: '978-0321601919',
    coverColor: '#276749',
    summary: 'Describes practices for building and deploying software.'
  },
  {
    id: 3,
    title: 'Building Microservices',
    author: 'Sam Newman',
    year: 2015,
    genre: 'Software Architecture',
    status: 'available',
    isbn: '978-1491950358',
    coverColor: '#702459',
    summary: 'Practical guidance on microservices.'
  }
]

vi.mock('../../../src/api/books.js', () => ({
  fetchBooks: vi.fn()
}))

import { fetchBooks } from '../../../src/api/books.js'

function createRouterForLibrary() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/library', name: 'library', component: LibraryView },
      { path: '/library/:id', name: 'book-detail', component: { template: '<div />' } }
    ]
  })
}

async function mountLibraryView() {
  const i18n = createTestI18n('en')
  const router = createRouterForLibrary()
  const pinia = createPinia()

  await router.push('/library')
  await router.isReady()

  const wrapper = mount(LibraryView, {
    global: {
      plugins: [i18n, router, pinia]
    }
  })

  return { wrapper, router }
}

describe('LibraryView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    fetchBooks.mockResolvedValue(books)
  })

  it('renders the list of books after loading', async () => {
    const { wrapper } = await mountLibraryView()
    await flushPromises()

    expect(wrapper.findAll('.book-card').length).toBe(books.length)
  })

  it('filters books by search query', async () => {
    const { wrapper } = await mountLibraryView()
    await flushPromises()

    const search = wrapper.find('.library-view__search')
    await search.setValue('Continuous')
    await nextTick()

    expect(wrapper.findAll('.book-card').length).toBe(1)
    expect(wrapper.find('.book-card__title').text()).toBe('Continuous Delivery')
  })

  it('populates the category filter with unique genres', async () => {
    const { wrapper } = await mountLibraryView()
    await flushPromises()

    const options = wrapper.find('.library-view__category').findAll('option')
    const values = options.map((option) => option.element.value)

    expect(values[0]).toBe('')
    expect(values.slice(1).sort()).toEqual(['DevOps', 'Software Architecture', 'Software Engineering'].sort())
  })

  it('filters books by selected category', async () => {
    const { wrapper } = await mountLibraryView()
    await flushPromises()

    const categorySelect = wrapper.find('.library-view__category')
    await categorySelect.setValue('DevOps')
    await nextTick()

    const cards = wrapper.findAll('.book-card')
    expect(cards.length).toBe(1)
    expect(cards[0].find('.book-card__title').text()).toBe('Continuous Delivery')
  })

  it('combines search and category filters', async () => {
    const { wrapper } = await mountLibraryView()
    await flushPromises()

    await wrapper.find('.library-view__search').setValue('Pragmatic')
    await wrapper.find('.library-view__category').setValue('Software Engineering')
    await nextTick()

    const cards = wrapper.findAll('.book-card')
    expect(cards.length).toBe(1)
    expect(cards[0].find('.book-card__title').text()).toBe('The Pragmatic Programmer')
  })

  it('shows empty state when no books match the filters', async () => {
    const { wrapper } = await mountLibraryView()
    await flushPromises()

    await wrapper.find('.library-view__search').setValue('Pragmatic')
    await wrapper.find('.library-view__category').setValue('DevOps')
    await nextTick()

    expect(wrapper.find('.library-view__empty').exists()).toBe(true)
    expect(wrapper.findAll('.book-card').length).toBe(0)
  })

  it('updates the books count based on filters', async () => {
    const { wrapper } = await mountLibraryView()
    await flushPromises()

    expect(wrapper.find('.library-view__count').text()).toContain('3 books')

    await wrapper.find('.library-view__category').setValue('DevOps')
    await nextTick()

    expect(wrapper.find('.library-view__count').text()).toContain('1 book')
  })

  it('toggles between grid and list view', async () => {
    const { wrapper } = await mountLibraryView()
    await flushPromises()

    expect(wrapper.find('.library-view__grid').exists()).toBe(true)
    expect(wrapper.findAll('.book-card').length).toBe(books.length)

    const listBtn = wrapper.findAll('.library-view__view-btn').find((btn) => btn.attributes('title')?.includes('List'))
    await listBtn.trigger('click')
    await nextTick()

    expect(wrapper.find('.library-view__list').exists()).toBe(true)
    expect(wrapper.findAll('.book-list-item').length).toBe(books.length)

    const gridBtn = wrapper.findAll('.library-view__view-btn').find((btn) => btn.attributes('title')?.includes('Grid'))
    await gridBtn.trigger('click')
    await nextTick()

    expect(wrapper.find('.library-view__grid').exists()).toBe(true)
    expect(wrapper.findAll('.book-card').length).toBe(books.length)
  })
})

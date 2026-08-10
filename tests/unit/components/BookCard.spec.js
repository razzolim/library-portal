import { describe, it, expect } from 'vitest'
import { mountWithI18n } from '../test-utils.js'
import BookCard from '../../../src/components/BookCard.vue'
import { createRouter, createWebHistory } from 'vue-router'

const book = {
  id: 1,
  title: 'The Pragmatic Programmer',
  author: 'Andrew Hunt & David Thomas',
  year: 1999,
  genre: 'Software Engineering',
  status: 'available',
  isbn: '978-0201616224',
  coverColor: '#4a5568'
}

function mountCard(props = {}) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/library/:id', name: 'book-detail', component: { template: '<div />' } }
    ]
  })

  return mountWithI18n(BookCard, {
    props: { book, ...props },
    global: {
      plugins: [router]
    }
  })
}

describe('BookCard', () => {
  it('renders book title and author', () => {
    const wrapper = mountCard()

    expect(wrapper.find('.book-card__title').text()).toBe(book.title)
    expect(wrapper.find('.book-card__author').text()).toBe(book.author)
  })

  it('renders status label', () => {
    const wrapper = mountCard()
    expect(wrapper.find('.book-card__status').text()).toBe('Available')
  })

  it('links to the book detail route', () => {
    const wrapper = mountCard()
    const link = wrapper.find('.book-card')

    expect(link.attributes('href')).toBe('/library/1')
  })
})

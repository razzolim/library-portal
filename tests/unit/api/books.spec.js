import { describe, it, expect } from 'vitest'
import { authenticate, fetchBooks, fetchBookById, logout } from '../../../src/api/books.js'
import books from '../../../src/mocks/books.json'

describe('Books API', () => {
  it('authenticates valid credentials', async () => {
    const result = await authenticate({ username: 'reader', password: 'reader' })

    expect(result.success).toBe(true)
    expect(result.user.username).toBe('reader')
    expect(result.token).toBeTruthy()
  })

  it('rejects invalid credentials', async () => {
    const result = await authenticate({ username: 'wrong', password: 'wrong' })

    expect(result.success).toBe(false)
    expect(result.errorKey).toBe('login.invalidCredentials')
  })

  it('returns a list of books', async () => {
    const result = await fetchBooks()

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(books.length)
  })

  it('returns books with expected fields', async () => {
    const result = await fetchBooks()
    const book = result[0]

    expect(book).toHaveProperty('id')
    expect(book).toHaveProperty('title')
    expect(book).toHaveProperty('author')
    expect(book).toHaveProperty('year')
    expect(book).toHaveProperty('genre')
    expect(book).toHaveProperty('status')
    expect(book).toHaveProperty('isbn')
  })

  it('returns a book by id', async () => {
    const result = await fetchBookById(1)

    expect(result).toBeTruthy()
    expect(result.id).toBe(1)
  })

  it('returns a book with pdfUrl field', async () => {
    const result = await fetchBookById(1)

    expect(result).toHaveProperty('pdfUrl')
  })

  it('returns a book with a valid pdfUrl when available', async () => {
    const result = await fetchBookById(1)

    expect(result.pdfUrl).toContain('drive.google.com')
  })

  it('returns null for unknown id', async () => {
    const result = await fetchBookById(99999)

    expect(result).toBeNull()
  })

  it('returns success on logout', async () => {
    const result = await logout()

    expect(result.success).toBe(true)
  })
})

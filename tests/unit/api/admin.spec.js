import { describe, it, expect } from 'vitest'
import { resetUserPassword, createBook } from '../../../src/api/admin.js'
import { fetchBooks } from '../../../src/api/books.js'

describe('Admin API (mock mode)', () => {
  it('resets the password of an existing user', async () => {
    const result = await resetUserPassword({ username: 'reader', newPassword: 'new-password' })

    expect(result).toEqual({ success: true, username: 'reader' })
  })

  it('returns userNotFound for an unknown username', async () => {
    const result = await resetUserPassword({ username: 'ghost', newPassword: 'new-password' })

    expect(result.success).toBe(false)
    expect(result.errorKey).toBe('admin.resetPassword.userNotFound')
  })

  it('creates a book with a new id and upload metadata', async () => {
    const before = await fetchBooks()
    const result = await createBook(
      { title: 'Refactoring', author: 'Martin Fowler', status: 'available', isbn: '978-0134757599' },
      { uploadedBy: 'admin' }
    )

    expect(result.success).toBe(true)
    expect(result.book.id).toBe(Math.max(...before.map((b) => b.id)) + 1)
    expect(result.book.uploadedBy).toBe('admin')
    expect(result.book.uploadedAt).toBeTruthy()

    const after = await fetchBooks()
    expect(after).toHaveLength(before.length + 1)
  })

  it('rejects a book whose ISBN already exists', async () => {
    const [existing] = await fetchBooks()
    const result = await createBook({ title: 'Copy', author: 'Someone', status: 'available', isbn: existing.isbn })

    expect(result.success).toBe(false)
    expect(result.errorKey).toBe('admin.books.duplicateIsbn')
  })
})

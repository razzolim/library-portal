import { describe, it, expect } from 'vitest'
import {
  resetUserPassword,
  createBook,
  fetchUsers,
  updateUserEmail,
  setUserEnabled,
  deleteUser
} from '../../../src/api/admin.js'
import { fetchBooks, authenticate } from '../../../src/api/books.js'

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

describe('Admin API - user management (mock mode)', () => {
  it('paginates users and never exposes passwords', async () => {
    const first = await fetchUsers({ page: 1, pageSize: 5 })
    const second = await fetchUsers({ page: 2, pageSize: 5 })

    expect(first.items).toHaveLength(5)
    expect(first.total).toBeGreaterThan(5)
    expect(second.items[0].username).not.toBe(first.items[0].username)
    expect(first.items[0]).not.toHaveProperty('password')
    expect(first.items[0]).toHaveProperty('email')
    expect(first.items[0]).toHaveProperty('enabled')
  })

  it('filters users by username, name, or email', async () => {
    const byName = await fetchUsers({ query: 'ALICE' })
    expect(byName.total).toBe(1)
    expect(byName.items[0].username).toBe('ajohnson')

    const byEmail = await fetchUsers({ query: 'bcarvalho@' })
    expect(byEmail.items.map((u) => u.username)).toEqual(['bcarvalho'])
  })

  it('updates a user email and rejects duplicates', async () => {
    const ok = await updateUserEmail('ajohnson', 'alice.new@example.com')
    expect(ok.success).toBe(true)
    expect(ok.user.email).toBe('alice.new@example.com')

    const dup = await updateUserEmail('bcarvalho', 'ALICE.NEW@example.com')
    expect(dup).toEqual({ success: false, errorKey: 'admin.users.duplicateEmail' })

    const missing = await updateUserEmail('ghost', 'x@example.com')
    expect(missing.errorKey).toBe('admin.users.notFound')
  })

  it('disables a user, blocks their login, and re-enables them', async () => {
    const off = await setUserEnabled('cmendes', false, { actor: 'admin' })
    expect(off.user.enabled).toBe(false)

    const blocked = await authenticate({ username: 'cmendes', password: 'cmendes-pass' })
    expect(blocked).toEqual({ success: false, errorKey: 'login.accountDisabled' })

    await setUserEnabled('cmendes', true, { actor: 'admin' })
    const allowed = await authenticate({ username: 'cmendes', password: 'cmendes-pass' })
    expect(allowed.success).toBe(true)
  })

  it('does not let an admin disable or delete their own account', async () => {
    expect(await setUserEnabled('admin', false, { actor: 'admin' })).toEqual({
      success: false,
      errorKey: 'admin.users.cannotModifySelf'
    })
    expect((await deleteUser('admin', { actor: 'admin' })).errorKey).toBe('admin.users.cannotModifySelf')
  })

  it('deletes a user', async () => {
    const before = (await fetchUsers()).total
    const result = await deleteUser('dsouza', { actor: 'admin' })

    expect(result.success).toBe(true)
    expect((await fetchUsers()).total).toBe(before - 1)
    expect((await deleteUser('dsouza', { actor: 'admin' })).errorKey).toBe('admin.users.notFound')
  })
})

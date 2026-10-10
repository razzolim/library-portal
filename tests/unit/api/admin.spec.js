import { describe, it, expect } from 'vitest'
import {
  resetUserPassword,
  createBook,
  fetchUsers,
  updateUserEmail,
  setUserEnabled,
  deleteUser,
  importBooks,
  exportBooks,
  fetchFeatureFlags,
  createFeatureFlag,
  setFeatureFlagEnabled,
  deleteFeatureFlag
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

  it('includes the last login, or null for users who never signed in', async () => {
    const { items } = await fetchUsers({ pageSize: 100 })

    expect(items.find((u) => u.username === 'ajohnson').lastLoginAt).toBe('2026-10-08T13:02:47.000Z')
    expect(items.find((u) => u.username === 'ksmith').lastLoginAt).toBeNull()
  })

  it('orders users by name by default', async () => {
    const { items } = await fetchUsers({ pageSize: 100 })
    const names = items.map((u) => u.fullName.toLowerCase())

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it('sorts by last login across every page, never-signed-in users counting as oldest', async () => {
    const newest = await fetchUsers({ pageSize: 100, sort: 'lastLoginAt', order: 'desc' })
    const oldest = await fetchUsers({ pageSize: 100, sort: 'lastLoginAt', order: 'asc' })
    const times = (items) => items.map((u) => (u.lastLoginAt ? Date.parse(u.lastLoginAt) : -Infinity))

    const desc = times(newest.items)
    expect(desc).toEqual([...desc].sort((a, b) => b - a))
    expect(newest.items.slice(-2).every((u) => u.lastLoginAt === null)).toBe(true)

    const asc = times(oldest.items)
    expect(asc).toEqual([...asc].sort((a, b) => a - b))
    expect(oldest.items.slice(0, 2).every((u) => u.lastLoginAt === null)).toBe(true)

    const firstPage = await fetchUsers({ page: 1, pageSize: 5, sort: 'lastLoginAt', order: 'desc' })
    expect(firstPage.items.map((u) => u.username)).toEqual(newest.items.slice(0, 5).map((u) => u.username))
  })

  it('ignores unknown sort fields', async () => {
    const unknown = await fetchUsers({ pageSize: 100, sort: 'password' })
    const byName = await fetchUsers({ pageSize: 100 })

    expect(unknown.items.map((u) => u.username)).toEqual(byName.items.map((u) => u.username))
  })

  it('records the last login when a user signs in', async () => {
    const before = Date.now()
    await authenticate({ username: 'lmartins', password: 'lmartins-pass' })
    const { items } = await fetchUsers({ query: 'lmartins' })

    expect(Date.parse(items[0].lastLoginAt)).toBeGreaterThanOrEqual(before - 1000)
  })
})

describe('importBooks (mock mode)', () => {
  const header = 'title,author,status,isbn\n'

  it('imports every valid row and exposes the books', async () => {
    const before = await fetchBooks()
    const result = await importBooks(`${header}Imp A,Au,available,978-1111111111\nImp B,Au,borrowed,\n`, { uploadedBy: 'admin' })

    expect(result).toEqual({ success: true, imported: 2 })
    expect(await fetchBooks()).toHaveLength(before.length + 2)
  })

  it('is all-or-nothing and reports the offending lines', async () => {
    const before = await fetchBooks()
    const result = await importBooks(`${header}Ok,Au,available,\n,Au,weird,\n`)

    expect(result.success).toBe(false)
    expect(result.errorKey).toBe('admin.books.import.invalidRows')
    expect(result.errors).toEqual([{ line: 3, fields: { title: 'required', status: 'invalid' } }])
    expect(await fetchBooks()).toHaveLength(before.length)
  })

  it('rejects ISBNs already in the catalog and repeated in the file', async () => {
    await importBooks(`${header}Dup,Au,available,978-2222222222\n`)
    const existing = await importBooks(`${header}Dup2,Au,available,9782222222222\n`)
    expect(existing.errorKey).toBe('admin.books.import.duplicateIsbn')

    const repeated = await importBooks(`${header}X,Au,available,978-3333333333\nY,Au,available,9783333333333\n`)
    expect(repeated.errors[0].fields.isbn).toBe('duplicate_in_file')
  })

  it('rejects bad headers, empty files and too many rows', async () => {
    expect((await importBooks('title,foo\nx,y\n')).errorKey).toBe('admin.books.import.invalidHeader')
    expect((await importBooks('')).errorKey).toBe('admin.books.import.invalidFile')
    const many = header + 'T,A,available,\n'.repeat(501)
    expect((await importBooks(many)).errorKey).toBe('admin.books.import.tooManyRows')
  })
})

describe('exportBooks (mock mode)', () => {
  it('returns a CSV blob with every book', async () => {
    const books = await fetchBooks()
    const result = await exportBooks()

    expect(result.success).toBe(true)
    const text = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsText(result.blob)
    })
    expect(text.replace(/^\uFEFF/, '').startsWith('title,author,status')).toBe(true)
    expect(text.trim().split(/\r\n(?=[^\r\n]*,)/).length).toBeGreaterThan(0)
    expect(text).toContain(books[0].title)
  })

  it('creates, toggles and deletes a feature flag', async () => {
    const created = await createFeatureFlag({ key: 'test-flag', description: 'Testing' }, { actor: 'admin' })
    expect(created.success).toBe(true)
    expect(created.flag).toMatchObject({ key: 'test-flag', enabled: false, updatedBy: 'admin' })

    const toggled = await setFeatureFlagEnabled('test-flag', true, { actor: 'admin' })
    expect(toggled.flag.enabled).toBe(true)
    expect((await fetchFeatureFlags()).find((f) => f.key === 'test-flag').enabled).toBe(true)

    expect(await deleteFeatureFlag('test-flag')).toEqual({ success: true })
    expect((await fetchFeatureFlags()).some((f) => f.key === 'test-flag')).toBe(false)
  })

  it('rejects invalid and duplicate feature flag keys', async () => {
    expect((await createFeatureFlag({ key: 'Not Valid' })).errorKey).toBe('admin.featureFlags.invalidKey')

    const [existing] = await fetchFeatureFlags()
    expect((await createFeatureFlag({ key: existing.key })).errorKey).toBe('admin.featureFlags.duplicateKey')
  })

  it('returns notFound when toggling or deleting an unknown flag', async () => {
    expect((await setFeatureFlagEnabled('ghost', true)).errorKey).toBe('admin.featureFlags.notFound')
    expect((await deleteFeatureFlag('ghost')).errorKey).toBe('admin.featureFlags.notFound')
  })
})

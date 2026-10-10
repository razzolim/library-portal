import client from './client.js'
import books from '../mocks/books.json'
import users from '../mocks/users.json'

const MOCK_DELAY_MS = 500

/**
 * Whether the API layer should use the in-memory mocks instead of the real backend.
 * Defaults to true when the variable is not defined (e.g. during tests or when the
 * backend is not yet available).
 */
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Maps a backend error response to `{ success: false, errorKey }` when the
 * backend provides an `errorKey`; otherwise rethrows so the caller shows a
 * generic error.
 */
function toErrorResult(err) {
  if (err.response?.data?.errorKey) {
    return { success: false, errorKey: err.response.data.errorKey }
  }
  if (err.response?.status === 403) {
    return { success: false, errorKey: 'admin.forbidden' }
  }
  throw err
}

/**
 * Admin: reset another user's password.
 * PATCH /admin/users/:username/password — requires the `admin` role.
 * In mock mode, only usernames defined in users.json are accepted. The mock
 * data is not modified, so the demo credentials keep working.
 */
export async function resetUserPassword({ username, newPassword }) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    const user = users.find((u) => u.username === username)
    if (!user) {
      return { success: false, errorKey: 'admin.resetPassword.userNotFound' }
    }
    return { success: true, username: user.username }
  }

  try {
    const { data } = await client.patch(
      `/admin/users/${encodeURIComponent(username)}/password`,
      { newPassword }
    )
    return data
  } catch (err) {
    return toErrorResult(err)
  }
}

/**
 * Admin: add a new book to the collection.
 * POST /books — requires the `admin` role.
 * In mock mode, the book is appended to the in-memory list so it shows up in
 * the library until the page is reloaded.
 */
export async function createBook(book, { uploadedBy } = {}) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)

    if (book.isbn && books.some((b) => b.isbn === book.isbn)) {
      return { success: false, errorKey: 'admin.books.duplicateIsbn' }
    }

    const id = Math.max(0, ...books.map((b) => Number(b.id) || 0)) + 1
    const created = {
      ...book,
      id,
      uploadedBy: uploadedBy || null,
      uploadedAt: new Date().toISOString()
    }
    books.push(created)
    return { success: true, book: created }
  }

  try {
    const { data } = await client.post('/books', book)
    return data
  } catch (err) {
    return toErrorResult(err)
  }
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email ?? null,
    role: user.role,
    enabled: user.enabled !== false,
    lastLoginAt: user.lastLoginAt ?? null
  }
}

/** Columns the user list can be sorted by (whitelisted by the backend too). */
export const USER_SORT_FIELDS = ['lastLoginAt']

// "Never signed in" (null) counts as the oldest sign-in: first when ascending, last when descending.
function compareLastLogin(a, b, order) {
  const timeA = a.lastLoginAt ? Date.parse(a.lastLoginAt) : -Infinity
  const timeB = b.lastLoginAt ? Date.parse(b.lastLoginAt) : -Infinity
  if (timeA === timeB) return compareByName(a, b)
  return order === 'asc' ? (timeA < timeB ? -1 : 1) : (timeA > timeB ? -1 : 1)
}

// The backend's default order: ORDER BY LOWER(fullName), id.
function compareByName(a, b) {
  return a.fullName.toLowerCase().localeCompare(b.fullName.toLowerCase()) || a.id - b.id
}

/**
 * Admin: list users (paginated, optionally filtered and sorted).
 * GET /admin/users?page=1&pageSize=12&query=&sort=lastLoginAt&order=desc
 * Pages start at 1. `query` matches username, full name, or email.
 * `sort` is one of USER_SORT_FIELDS; without it the backend's default order applies.
 * `order` is `asc` or `desc` (default `desc`). Sorting happens on the server so it
 * spans every page, not just the one on screen.
 * Resolves to `{ items, total, page, pageSize }`.
 */
export async function fetchUsers({ page = 1, pageSize = 12, query = '', sort, order = 'desc' } = {}) {
  const sortField = USER_SORT_FIELDS.includes(sort) ? sort : undefined

  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    const needle = query.trim().toLowerCase()
    const matches = users.filter((u) =>
      !needle ||
      [u.username, u.fullName, u.email].some((v) => (v || '').toLowerCase().includes(needle))
    )
    matches.sort(sortField === 'lastLoginAt' ? (a, b) => compareLastLogin(a, b, order) : compareByName)
    const start = (page - 1) * pageSize
    return {
      items: matches.slice(start, start + pageSize).map(toPublicUser),
      total: matches.length,
      page,
      pageSize
    }
  }

  const params = { page, pageSize, query: query || undefined }
  if (sortField) {
    params.sort = sortField
    params.order = order === 'asc' ? 'asc' : 'desc'
  }
  const { data } = await client.get('/admin/users', { params })
  return data
}

/**
 * Admin: change a user's email.
 * PATCH /admin/users/:username  { email }
 */
export async function updateUserEmail(username, email) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    const user = users.find((u) => u.username === username)
    if (!user) return { success: false, errorKey: 'admin.users.notFound' }
    const taken = users.some((u) => u !== user && (u.email || '').toLowerCase() === email.toLowerCase())
    if (taken) return { success: false, errorKey: 'admin.users.duplicateEmail' }
    user.email = email
    return { success: true, user: toPublicUser(user) }
  }

  try {
    const { data } = await client.patch(`/admin/users/${encodeURIComponent(username)}`, { email })
    return data
  } catch (err) {
    return toErrorResult(err)
  }
}

/**
 * Admin: disable or re-enable a user.
 * PATCH /admin/users/:username  { enabled }
 * `actor` (the signed-in admin's username) is only used by the mock to
 * reproduce the backend's "cannot modify yourself" rule.
 */
export async function setUserEnabled(username, enabled, { actor } = {}) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    const user = users.find((u) => u.username === username)
    if (!user) return { success: false, errorKey: 'admin.users.notFound' }
    if (!enabled && username === actor) return { success: false, errorKey: 'admin.users.cannotModifySelf' }
    user.enabled = enabled
    return { success: true, user: toPublicUser(user) }
  }

  try {
    const { data } = await client.patch(`/admin/users/${encodeURIComponent(username)}`, { enabled })
    return data
  } catch (err) {
    return toErrorResult(err)
  }
}

/**
 * Admin: permanently delete a user.
 * DELETE /admin/users/:username
 */
export async function deleteUser(username, { actor } = {}) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    const index = users.findIndex((u) => u.username === username)
    if (index === -1) return { success: false, errorKey: 'admin.users.notFound' }
    if (username === actor) return { success: false, errorKey: 'admin.users.cannotModifySelf' }
    users.splice(index, 1)
    return { success: true }
  }

  try {
    const { data } = await client.delete(`/admin/users/${encodeURIComponent(username)}`)
    return data ?? { success: true }
  } catch (err) {
    return toErrorResult(err)
  }
}

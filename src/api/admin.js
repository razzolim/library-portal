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

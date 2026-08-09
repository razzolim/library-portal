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
 * Authentication.
 * When VITE_USE_MOCK_API is true, only the credentials defined in users.json will succeed.
 * When it is false, the request is forwarded to the real backend at POST /auth/login.
 */
export async function authenticate({ username, password }) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)

    const user = users.find(
      (u) => u.username === username && u.password === password
    )

    if (!user) {
      return { success: false, errorKey: 'login.invalidCredentials' }
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      },
      token: `mock-token-${user.id}-${Date.now()}`
    }
  }

  const { data } = await client.post('/auth/login', { username, password })
  return data
}

/**
 * Book list API.
 * Returns the full list of books either from the mock JSON or from GET /books.
 */
export async function fetchBooks() {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    return [...books]
  }

  const { data } = await client.get('/books')
  return data
}

/**
 * Single book API.
 * Returns one book from the mock JSON or from GET /books/:id.
 */
export async function fetchBookById(id) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    const book = books.find((b) => b.id === id)
    return book || null
  }

  const { data } = await client.get(`/books/${id}`)
  return data
}

/**
 * Logout API.
 * Sends a POST to /auth/logout with the Authorization header and no body.
 * In mock mode, the request is skipped and resolves immediately.
 */
export async function logout() {
  if (USE_MOCK_API) {
    return { success: true }
  }

  await client.post('/auth/logout')
  return { success: true }
}

import client from './client.js'

const MOCK_DELAY_MS = 150

/**
 * Same switch as src/api/books.js: mocks unless VITE_USE_MOCK_API is exactly 'false'.
 */
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'

const MAX_BOOKMARKS_PER_BOOK = 200

export const DEFAULT_READER_PREFERENCES = Object.freeze({
  pageTheme: 'light',
  zoom: 'fit-width'
})

// In-memory state for mock mode (lives until reload, like the other mocks).
const mockProgress = new Map()
const mockBookmarks = new Map()
let mockBookmarkId = 1

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function emptyProgress(bookId) {
  return { bookId, page: 1, totalPages: null, percent: 0, updatedAt: null }
}

function errorResult(err, fallbackKey = 'reader.error') {
  return { success: false, errorKey: err.response?.data?.errorKey || fallbackKey }
}

/**
 * GET /books/:id/progress. Never 404s for a book that exists: an unopened book
 * comes back as page 1. Resolves to page 1 on any failure so a flaky request
 * never blocks reading.
 */
export async function fetchProgress(bookId) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    return { ...(mockProgress.get(bookId) || emptyProgress(bookId)) }
  }

  try {
    const { data } = await client.get(`/books/${bookId}/progress`)
    return data
  } catch (err) {
    return emptyProgress(bookId)
  }
}

/**
 * PUT /books/:id/progress. Resolves to `{ success, progress }` or `{ success: false, errorKey }`.
 */
export async function saveProgress(bookId, { page, totalPages }) {
  if (USE_MOCK_API) {
    const progress = {
      bookId,
      page,
      totalPages,
      percent: Math.round((page / totalPages) * 10000) / 100,
      updatedAt: new Date().toISOString()
    }
    mockProgress.set(bookId, progress)
    return { success: true, progress }
  }

  try {
    const { data } = await client.put(`/books/${bookId}/progress`, { page, totalPages })
    return data
  } catch (err) {
    return errorResult(err)
  }
}

/**
 * Last save, sent while the tab is closing. A normal axios request can be
 * cancelled by the browser at that point; `fetch` with `keepalive` is not.
 */
export function saveProgressOnExit(bookId, { page, totalPages }, token) {
  if (USE_MOCK_API) {
    saveProgress(bookId, { page, totalPages })
    return
  }

  try {
    fetch(`${client.defaults.baseURL}/books/${bookId}/progress`, {
      method: 'PUT',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ page, totalPages })
    }).catch(() => {})
  } catch (err) {
    // Best effort only.
  }
}

/**
 * GET /books/:id/bookmarks → array ordered by page.
 */
export async function fetchBookmarks(bookId) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    return [...(mockBookmarks.get(bookId) || [])]
  }

  try {
    const { data } = await client.get(`/books/${bookId}/bookmarks`)
    return data.items || []
  } catch (err) {
    return []
  }
}

/**
 * POST /books/:id/bookmarks. Bookmarking a page that already has one updates its note.
 */
export async function addBookmark(bookId, { page, note }) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    const list = mockBookmarks.get(bookId) || []
    const existing = list.find((b) => b.page === page)
    if (existing) {
      existing.note = note ?? existing.note
      return { success: true, bookmark: { ...existing } }
    }
    if (list.length >= MAX_BOOKMARKS_PER_BOOK) {
      return { success: false, errorKey: 'reader.bookmarkLimit' }
    }
    const bookmark = {
      id: mockBookmarkId++,
      page,
      note: note || null,
      createdAt: new Date().toISOString()
    }
    list.push(bookmark)
    list.sort((a, b) => a.page - b.page)
    mockBookmarks.set(bookId, list)
    return { success: true, bookmark: { ...bookmark } }
  }

  try {
    const { data } = await client.post(`/books/${bookId}/bookmarks`, { page, note })
    return data
  } catch (err) {
    return errorResult(err)
  }
}

/**
 * DELETE /books/:id/bookmarks/:bookmarkId.
 */
export async function removeBookmark(bookId, bookmarkId) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    const list = mockBookmarks.get(bookId) || []
    mockBookmarks.set(bookId, list.filter((b) => b.id !== bookmarkId))
    return { success: true }
  }

  try {
    const { data } = await client.delete(`/books/${bookId}/bookmarks/${bookmarkId}`)
    return data
  } catch (err) {
    return errorResult(err)
  }
}

/**
 * PATCH /me with `readerPreferences`. Send only what changed.
 */
export async function updateReaderPreferences(preferences) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    return { success: true, readerPreferences: { ...DEFAULT_READER_PREFERENCES, ...preferences } }
  }

  try {
    const { data } = await client.patch('/me', { readerPreferences: preferences })
    return data
  } catch (err) {
    return errorResult(err)
  }
}

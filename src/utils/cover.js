/**
 * Book cover helpers.
 *
 * A real cover image is shown when one can be found; otherwise the book gets a
 * printed cover with its title and author on the book's color.
 */

export const DEFAULT_COVER_COLOR = '#3b82f6'

/**
 * Real cover image URL for a book. A backend-provided `coverUrl` wins; otherwise,
 * when VITE_COVERS_BASE_URL is set (e.g. the Open Library Covers API), the image
 * is looked up by ISBN. Returns null when there is nothing to try.
 *
 * @param {object} book
 * @param {'S'|'M'|'L'} size Open Library image size
 * @param {string} baseUrl
 */
export function getCoverImageUrl(book, size = 'M', baseUrl = import.meta.env.VITE_COVERS_BASE_URL) {
  if (book?.coverUrl) return book.coverUrl

  const isbn = book?.isbn?.replace(/[^0-9Xx]/g, '')
  if (!baseUrl || !isbn) return null

  // `default=false` makes Open Library answer 404 instead of a blank placeholder.
  return `${baseUrl.replace(/\/$/, '')}/${isbn}-${size}.jpg?default=false`
}

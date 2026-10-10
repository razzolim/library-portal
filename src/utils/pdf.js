/**
 * PDF reader helpers. The pdf.js library is loaded on demand so the (large)
 * library and its worker stay out of every other page's bundle.
 */

const MIN_ZOOM = 50
const MAX_ZOOM = 400
const ZOOM_STEP = 25
// Rough pace for the "time left" hint. It is an estimate, not a measurement.
const MINUTES_PER_PAGE = 2
const MAX_SEARCH_RESULTS = 100

export function isNumericZoom(zoom) {
  return typeof zoom === 'number' && Number.isFinite(zoom)
}

export function clampZoom(percent) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(percent)))
}

/**
 * Scale (1 = 100%) to render a page at, for a zoom mode and the space available.
 * @param {'fit-width'|'fit-page'|number} zoom
 */
export function computeScale(zoom, page, container) {
  if (isNumericZoom(zoom)) {
    return clampZoom(zoom) / 100
  }
  const byWidth = container.width / page.width
  if (zoom === 'fit-page') {
    return Math.min(byWidth, container.height / page.height)
  }
  return byWidth
}

/**
 * Next numeric zoom after a +/- step, starting from the zoom currently on screen.
 */
export function stepZoom(currentPercent, direction) {
  return clampZoom(currentPercent + direction * ZOOM_STEP)
}

export function clampPage(page, total) {
  const n = Math.round(Number(page))
  if (!Number.isFinite(n) || !total) return 1
  return Math.min(total, Math.max(1, n))
}

/**
 * Time left as `{ hours, minutes }` or null when the book is finished.
 */
export function estimateTimeLeft(page, total) {
  const remaining = total - page
  if (!total || remaining <= 0) return null
  const minutes = Math.round((remaining * MINUTES_PER_PAGE) / 5) * 5 || 5
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 }
}

export function percentRead(page, total) {
  if (!total) return 0
  return Math.round((page / total) * 100)
}

/**
 * Open a PDF from a URL with the user's Bearer token.
 * @returns {Promise<{ pdf: object, destroy: () => void }>}
 */
export async function openPdf(url, token) {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const task = pdfjs.getDocument({
    url,
    httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined
  })
  const pdf = await task.promise
  return { pdf, destroy: () => task.destroy() }
}

/**
 * Flatten pdf.js' nested outline into `[{ title, page, depth }]`.
 * Entries whose destination can't be resolved are dropped.
 */
export async function loadOutline(pdf) {
  const outline = await pdf.getOutline()
  if (!outline) return []

  const flat = []
  async function walk(items, depth) {
    for (const item of items) {
      try {
        const dest = typeof item.dest === 'string' ? await pdf.getDestination(item.dest) : item.dest
        if (dest) {
          const ref = dest[0]
          const index = typeof ref === 'object' ? await pdf.getPageIndex(ref) : ref
          flat.push({ title: item.title, page: index + 1, depth })
        }
      } catch (err) {
        // Broken destination: skip the entry.
      }
      if (item.items?.length) {
        await walk(item.items, depth + 1)
      }
    }
  }
  await walk(outline, 0)
  return flat
}

function snippetAround(text, index, length) {
  const start = Math.max(0, index - 30)
  const end = Math.min(text.length, index + length + 50)
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

/**
 * Case-insensitive text search. Resolves to `[{ page, snippet }]` (first hit per page).
 * Pass `isCancelled` to stop early when the user starts another search.
 */
export async function searchPdf(pdf, query, isCancelled = () => false) {
  const needle = query.trim().toLowerCase()
  if (!needle) return []

  const results = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    if (isCancelled() || results.length >= MAX_SEARCH_RESULTS) break

    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items.map((item) => item.str).join(' ').replace(/\s+/g, ' ')
    const index = text.toLowerCase().indexOf(needle)
    if (index !== -1) {
      results.push({ page: pageNumber, snippet: snippetAround(text, index, needle.length) })
    }
  }
  return results
}

/**
 * Where the reader should load the PDF from.
 * Relative URLs (`/api/books/12/pdf`) resolve against the API base URL.
 */
export function resolvePdfUrl(pdfUrl, apiBaseUrl) {
  try {
    return new URL(pdfUrl, apiBaseUrl).href
  } catch (err) {
    return null
  }
}

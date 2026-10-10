/**
 * Minimal RFC 4180 CSV helpers used by the admin book import.
 */

export const IMPORT_MAX_BYTES = 1024 * 1024
export const IMPORT_MAX_ROWS = 500
export const IMPORT_REQUIRED_COLUMNS = ['title', 'author', 'status']
export const IMPORT_OPTIONAL_COLUMNS = ['genre', 'year', 'isbn', 'pdfUrl', 'summary', 'coverColor']

export const IMPORT_TEMPLATE_CSV = [
  'title,author,status,genre,year,isbn,pdfUrl,summary,coverColor',
  'Refactoring,Martin Fowler,available,Software Engineering,2018,978-0134757599,https://example.com/refactoring.pdf,Improving the design of existing code.,#2b6cb0',
  '"Design Patterns: Elements of Reusable Object-Oriented Software","Gamma, Helm, Johnson & Vlissides",available,Software Engineering,1994,978-0201633610,,"A catalog of 23 classic patterns, with ""quotes"" and commas handled by CSV quoting.",',
  'The Mythical Man-Month,Frederick P. Brooks Jr.,borrowed,Software Engineering,1975,0-201-83595-9,,,#553c9a',
  ''
].join('\r\n')

/**
 * Parses CSV text into rows of cells. Blank lines are skipped and a leading
 * BOM is removed. Each row keeps the 1-based `line` it started on.
 * Returns `{ rows: [{ line, cells }], unterminated }`.
 */
export function parseCsv(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows = []
  let cells = []
  let cell = ''
  let inQuotes = false
  let line = 1
  let rowLine = 1

  const endRow = () => {
    cells.push(cell)
    if (!(cells.length === 1 && cells[0].trim() === '')) rows.push({ line: rowLine, cells })
    cells = []
    cell = ''
  }

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (inQuotes) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        if (char === '\n') line++
        cell += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      cells.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      endRow()
      line++
      rowLine = line
    } else {
      cell += char
    }
  }
  if (cell !== '' || cells.length > 0) endRow()

  return { rows, unterminated: inQuotes }
}

/**
 * Quick client-side look at a CSV file before upload: header problems and the
 * number of data rows. The backend remains the source of truth.
 * Returns `{ header, rowCount, missing, unknown, duplicated, unterminated }`.
 */
export function inspectBooksCsv(text) {
  const { rows, unterminated } = parseCsv(text)
  const header = rows.length ? rows[0].cells.map((c) => c.trim()) : []
  const allowed = [...IMPORT_REQUIRED_COLUMNS, ...IMPORT_OPTIONAL_COLUMNS]
  return {
    header,
    rowCount: Math.max(0, rows.length - 1),
    missing: IMPORT_REQUIRED_COLUMNS.filter((c) => !header.includes(c)),
    unknown: [...new Set(header.filter((c) => !allowed.includes(c)))],
    duplicated: [...new Set(header.filter((c, i) => header.indexOf(c) !== i))],
    unterminated
  }
}

# Backend Spec: Export Books to CSV (Admin)

This document describes everything the backend needs to provide for the **Export all books** button in the portal's admin area (**Admin → Import books**). The frontend already calls this endpoint when `VITE_USE_MOCK_API=false`.

It is the counterpart of `POST /books/import` (backend `documents/backend-api-specification.md` §3.4) and deliberately uses the **same CSV format**, so an exported file can be re-imported.

---

## 1. Endpoint

| | |
|---|---|
| **Method / path** | `GET /api/books/export` |
| **Authentication** | Required: `Authorization: Bearer <token>` (validated like every protected route, including revoked tokens). |
| **Authorization** | `admin` role only. Non-admins get `403` + `{ "success": false, "errorKey": "admin.forbidden" }` (never `401`). |
| **Rate limit** | 10 requests/minute per admin → `429` + `admin.rateLimited` (same limiter settings as the import endpoint). |
| **Request** | No body, no query parameters. The frontend sends `Accept: text/csv`. |
| **Scope** | **Every** book in the catalog. No pagination and **no row limit** (the 500-row limit applies to import only). |

The portal sends the token in the `Authorization` header, so the file is fetched with an authenticated XHR and saved by the browser as a Blob. Do **not** require a URL-embedded token or a cookie.

## 2. Success response (HTTP 200)

Headers:

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="books-YYYY-MM-DD.csv"
Cache-Control: no-store
```

- `YYYY-MM-DD` is the server date (UTC). The frontend names the saved file itself, so the header is informational, but it must be present for non-portal clients such as `curl -OJ`.
- Optional but recommended: `X-Total-Count: <number of data rows>`.
- If the frontend origin differs from the API origin, CORS must allow it: add `Access-Control-Expose-Headers: Content-Disposition, X-Total-Count`.
- An empty catalog still returns `200` with the header row only.

## 3. CSV format

Mirror the import format exactly, so exports re-import cleanly:

- **Encoding**: UTF-8 **with a BOM** (`EF BB BF`) so Excel opens accents correctly. (The importer already accepts a BOM.)
- **Delimiter**: comma. **Line endings**: CRLF, including after the last row.
- **Quoting**: RFC 4180. Wrap a cell in `"` when it contains a comma, a double quote, CR or LF; escape `"` as `""`. Do not quote other cells.
- **Header** (always first, always exactly this order, case-sensitive):

  ```
  title,author,status,genre,year,isbn,pdfUrl,summary,coverColor
  ```

- **Rows**: one per book, ordered by `id` ascending (stable and deterministic).
- **Null values**: an empty cell (never the text `null`).

| Column | Source | Notes |
|---|---|---|
| `title` | `books.title` | |
| `author` | `books.author` | |
| `status` | `books.status` | `available` or `borrowed`. |
| `genre` | `books.genre` | Empty if null. |
| `year` | `books.year` | Integer, empty if null. |
| `isbn` | `books.isbn` | As stored (with hyphens if stored so). Empty if null. |
| `pdfUrl` | `books.pdfUrl` | **Include it.** `GET /books` omits it, but the export must not. Empty if null. |
| `summary` | `books.summary` | **Include it.** May contain commas, quotes and line breaks, so it must be quoted properly. Empty if null. |
| `coverColor` | `books.coverColor` | `#RRGGBB`. |

Columns that exist in the database but are **not** exported: `id`, `uploadedBy`, `uploadedAt` (the importer rejects unknown columns, and it sets those itself).

### 3.1 Spreadsheet formula injection

Book data is user-supplied, so a title such as `=HYPERLINK(...)` could execute when an admin opens the file in Excel or Sheets. For every **text** cell (`title`, `author`, `genre`, `isbn`, `pdfUrl`, `summary`, `coverColor`), if the value starts with `=`, `+`, `-`, `@`, TAB or CR, **prefix it with a single apostrophe** (`'`) before CSV quoting. Do not prefix `year`, and do not prefix values that are plain numbers (e.g. `-5`). The mock in the portal (`booksToCsv` in `src/utils/csv.js`) behaves exactly like this, so use it as the reference.

Consequence: re-importing such a value keeps the apostrophe. This is accepted; it only affects values that start with those characters.

### 3.2 Example

```
title,author,status,genre,year,isbn,pdfUrl,summary,coverColor
Refactoring,Martin Fowler,available,Software Engineering,2018,978-0134757599,https://example.com/refactoring.pdf,Improving the design of existing code.,#2b6cb0
"Design Patterns: Elements of Reusable Object-Oriented Software","Gamma, Helm, Johnson & Vlissides",available,Software Engineering,1994,978-0201633610,,"A catalog of 23 classic patterns, with ""quotes"" and commas.",#4a5568
```

## 4. Error responses

Errors are JSON (`Content-Type: application/json`), not CSV, using the standard shape. The frontend reads `errorKey` from the body.

| HTTP | `errorKey` | When |
|---|---|---|
| 401 | n/a | Missing, invalid or revoked token (standard behavior; the portal logs the user out). |
| 403 | `admin.forbidden` | Caller is not an admin. |
| 429 | `admin.rateLimited` | Rate limit exceeded. |
| 500 | n/a | Unexpected failure. The portal shows a generic message. |

## 5. Performance

- **Stream** the response (cursor or batched queries written to the response) instead of building the whole CSV in memory, since there is no row limit.
- Run the read in a single consistent snapshot (one transaction or one query) so the file does not mix states.
- Do not log the CSV contents.

## 6. Audit log

Write one audit-log entry per successful export, like other admin actions:

- action: `book.export`
- actor: the admin from the bearer token
- metadata: `{ "count": <rows exported> }`

If streaming makes the count unknown up front, write the entry after the stream completes. Do not write one for failed requests.

## 7. Example request

```bash
curl -OJ http://localhost:3000/api/books/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/csv"
```

From the browser (what the portal does, via axios with `responseType: 'blob'`):

```js
const res = await fetch('/api/books/export', { headers: { Authorization: `Bearer ${token}`, Accept: 'text/csv' } })
const blob = await res.blob()
```

## 8. Acceptance checklist

- [ ] `GET /books/export` is protected, admin-only (`403` + `admin.forbidden`), and rate-limited (`429` + `admin.rateLimited`).
- [ ] Returns `200` with `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment`, and `Cache-Control: no-store`.
- [ ] Body is UTF-8 with BOM, CRLF line endings, RFC 4180 quoting, and the exact header `title,author,status,genre,year,isbn,pdfUrl,summary,coverColor`.
- [ ] Includes **all** books ordered by `id`, including `summary` and `pdfUrl`; nulls are empty cells.
- [ ] Text cells starting with `=`, `+`, `-`, `@`, TAB or CR are prefixed with `'` (numbers and `year` excluded).
- [ ] Error responses are JSON with `errorKey`.
- [ ] CORS exposes `Content-Disposition` (and `X-Total-Count` if sent) when the origins differ.
- [ ] One `book.export` audit entry with `{ count }` per successful export.
- [ ] Round trip: a file exported from a catalog of ≤ 500 books is accepted by `POST /books/import` after the existing books are removed (or with ISBNs changed), with no header errors.
- [ ] Empty catalog returns the header row only.

# Backend Specification: Book Reader

This document defines everything the backend must provide for the **book reader** of the Library Portal (`/library/:id/read`). It builds on [`BACKEND_API.md`](../BACKEND_API.md) (authentication, books, error conventions) and [`backend-spec-admin.md`](./backend-spec-admin.md) (error shape, audit log).

---

## 0. Overview

### Rollout in three phases

| Phase | Frontend | Backend work |
|---|---|---|
| **A. Reader bar** (done in the frontend) | Slim portal bar (back, title, reload, full screen, close) above the Drive iframe, with real load-failure detection. | **None required.** Optional: §1 (proxy URL in `pdfUrl`). |
| **B. Own viewer (PDF.js)** | The portal renders the PDF itself: page navigation, zoom, outline, search, dark page mode, resume. | §1 PDF streaming, §2 reading progress, §3 bookmarks, §4 reader preferences, §5 book fields. |
| **C. Mobile reader** | Same viewer, touch gestures and a bottom control sheet. | Nothing new. Needs §1 range requests to be fast on slow connections. |

Phase B cannot start until §1 and §2 exist. Progress and "resume" cannot work with the Drive iframe, because the iframe cannot report the current page.

### New and changed endpoints

| Method | Endpoint | Purpose | Phase |
|---|---|---|---|
| `GET` | `/books/:id/pdf` | Stream the book's PDF (with HTTP range support). | B |
| `GET` | `/books/:id/progress` | Read the current user's reading position for a book. | B |
| `PUT` | `/books/:id/progress` | Save the current user's reading position. | B |
| `GET` | `/me/reading` | Books the user has started, most recent first ("Continue reading"). | B |
| `GET` | `/books/:id/bookmarks` | List the user's bookmarks for a book. | B |
| `POST` | `/books/:id/bookmarks` | Create a bookmark. | B |
| `DELETE` | `/books/:id/bookmarks/:bookmarkId` | Delete a bookmark. | B |
| `PATCH` | `/me` | **Extended:** also accepts `readerPreferences`. | B |
| `POST` | `/auth/login` | **Extended:** `user.readerPreferences` in the response. | B |
| `GET` | `/books`, `/books/:id` | **Extended:** new optional fields (§5). | B |

### Common rules
- All endpoints require a valid Bearer token (`Authorization: Bearer <token>`). Missing or expired token: `401`. The frontend then refreshes the token or redirects to `/login`.
- Reader data (progress, bookmarks, preferences) is **per user**. A user can only ever read or write their own. There is no admin access to it.
- Failures use `{ "success": false, "errorKey": "..." }`. All keys are listed in §6.
- Timestamps are ISO 8601 in UTC with milliseconds (`2026-10-10T18:30:00.000Z`).

---

## 1. PDF streaming — `GET /books/:id/pdf`

Replaces the raw Google Drive link. The browser must never see the Drive URL.

### Behavior
- Look up the book. Fetch the file from its storage (Drive, disk or object storage) on the server and **stream** it to the client. Do not buffer the whole file in memory.
- Any authenticated user may read any book that has a PDF. (If borrowing rules should restrict reading, define them here; today the frontend does not restrict by `status`.)

### Response headers

| Header | Value |
|---|---|
| `Content-Type` | `application/pdf` |
| `Content-Disposition` | `inline; filename="<slug>.pdf"` (use `inline`, never `attachment`) |
| `Accept-Ranges` | `bytes` |
| `Content-Length` | Size of the returned body. |
| `ETag` | Stable per file version. Support `If-None-Match` → `304`. |
| `Cache-Control` | `private, max-age=3600` (never `public`: the response is user-gated). |
| `X-Content-Type-Options` | `nosniff` |

### Range requests (required)
PDF.js loads only the pages it needs.

- `Range: bytes=START-END` → `206 Partial Content` with `Content-Range: bytes START-END/TOTAL`.
- `Range` beyond the file → `416` with `Content-Range: bytes */TOTAL`.
- Support `HEAD` (PDF.js probes with it).

### CORS
The frontend and API can be on different origins. Besides the normal CORS headers:

```
Access-Control-Allow-Headers: Authorization, Range, If-None-Match, Content-Type
Access-Control-Allow-Methods: GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS
Access-Control-Expose-Headers: Accept-Ranges, Content-Range, Content-Length, ETag
```

`PUT /books/:id/progress` is also sent with `fetch(..., { keepalive: true })` while the tab closes, so it needs a normal CORS preflight answer (`PUT` allowed, `Authorization` and `Content-Type` headers allowed) like every other endpoint here.

### Errors

| Status | Body | When |
|---|---|---|
| `401` | `{ "success": false }` | Not signed in. |
| `404` | `{ "success": false, "errorKey": "reader.notFound" }` | Book does not exist. |
| `404` | `{ "success": false, "errorKey": "reader.noPdf" }` | Book exists but has no PDF. |
| `502` | `{ "success": false, "errorKey": "reader.sourceUnavailable" }` | The storage behind the proxy failed (e.g. Drive quota or outage). Do not leak upstream error text or URLs. |

### `pdfUrl` during the transition
Keep the existing contract: `pdfUrl` is what the frontend loads. When the proxy exists, return it as a **relative or absolute URL to this endpoint** (`/api/books/12/pdf`) instead of the Drive link. A relative URL is resolved against the API base URL (`VITE_API_BASE_URL`), so `/api/books/12/pdf` and a base of `https://host/api` give `https://host/api/books/12/pdf`. The frontend sends the Bearer token itself, so the URL needs no signature. Books without a PDF keep `pdfUrl: null`.

> The frontend picks the viewer from `pdfUrl`: a Google Drive link opens the Drive iframe (phase A reader); any other URL opens the pdf.js reader (phase B) with the user's Bearer token. A book can therefore be migrated one at a time.

### Protection
This is a deterrent, not DRM; anyone who can read the PDF can save it.
- Rate-limit per user (suggested: 60 requests/minute; range requests count).
- Do not log the token or full URLs of upstream storage.

---

## 2. Reading progress

### Data model

Table `reading_progress` (names are suggestions):

| Column | Type | Notes |
|---|---|---|
| `user_id` | FK users | |
| `book_id` | FK books | |
| `page` | `INT NOT NULL` | 1-based page the user was on. |
| `total_pages` | `INT NOT NULL` | Page count when saved. |
| `percent` | `NUMERIC(5,2)` | `page / total_pages * 100`, computed by the backend. |
| `updated_at` | `TIMESTAMP NOT NULL` | Set by the backend on every write. |
| `first_opened_at` | `TIMESTAMP NOT NULL` | Set on the first write. |

Primary key: `(user_id, book_id)`. Deleting a book deletes its progress and bookmarks. Deleting a user deletes theirs.

### `GET /books/:id/progress`

**Response (200)**

```json
{
  "bookId": 1,
  "page": 24,
  "totalPages": 256,
  "percent": 9.38,
  "updatedAt": "2026-10-10T18:30:00.000Z"
}
```

If the user has never opened the book: `200` with `{ "bookId": 1, "page": 1, "totalPages": null, "percent": 0, "updatedAt": null }`. Do not return `404`, so the frontend needs no special case. Unknown book: `404` + `reader.notFound`.

### `PUT /books/:id/progress`

The frontend saves on page change, debounced (about once every 2–3 seconds) and once more when the tab is hidden or closed (`navigator.sendBeacon` / `fetch` with `keepalive`). Expect frequent small writes.

**Request body**

```json
{ "page": 24, "totalPages": 256 }
```

| Field | Rule |
|---|---|
| `page` | Integer, `1 ≤ page ≤ totalPages`. |
| `totalPages` | Integer, `≥ 1`. |

**Response (200)**

```json
{ "success": true, "progress": { "bookId": 1, "page": 24, "totalPages": 256, "percent": 9.38, "updatedAt": "2026-10-10T18:30:00.000Z" } }
```

- Idempotent: the last write wins. Ignore a write whose `updatedAt` would go backwards if the client sends `If-Unmodified-Since` (optional, not required).
- Validation failure: `400` + `reader.invalidProgress`.
- Rate-limit separately from §1 (suggested: 30 writes/minute/user). Over the limit: `429`; the frontend just retries later.

### `GET /me/reading`

Feeds a "Continue reading" row in the library. Returns books the user has opened, most recently read first.

**Query:** `limit` (default 10, max 50).

**Response (200)**

```json
{
  "items": [
    {
      "book": { "id": 1, "title": "The Pragmatic Programmer", "author": "Andrew Hunt & David Thomas", "coverColor": "#4a5568", "coverUrl": null, "isbn": "978-0201616224" },
      "page": 24,
      "totalPages": 256,
      "percent": 9.38,
      "updatedAt": "2026-10-10T18:30:00.000Z"
    }
  ]
}
```

`book` has the same fields the library grid needs to draw a cover. Exclude books that no longer exist. A book finished (`percent ≥ 99`) is still returned; the frontend decides how to show it.

---

## 3. Bookmarks

Table `bookmarks`:

| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `user_id`, `book_id` | FKs | |
| `page` | `INT NOT NULL` | 1-based. |
| `note` | `VARCHAR(500)` NULL | Optional text, trimmed. |
| `created_at` | `TIMESTAMP NOT NULL` | |

Unique on `(user_id, book_id, page)`: one bookmark per page. Limit: 200 per user per book.

### `GET /books/:id/bookmarks`
**Response (200)** — ordered by `page` ascending.

```json
{
  "items": [
    { "id": 17, "page": 24, "note": "Tracer bullets", "createdAt": "2026-10-10T18:31:00.000Z" }
  ]
}
```

### `POST /books/:id/bookmarks`
**Request**

```json
{ "page": 24, "note": "Tracer bullets" }
```

**Response (201)** — `{ "success": true, "bookmark": { …same shape as above… } }`.

If a bookmark already exists on that page, update its `note` and return `200` with the existing bookmark (so the frontend can treat "bookmark this page" as safe to repeat).

Errors: `400` + `reader.invalidBookmark` (page out of range or note too long), `409` + `reader.bookmarkLimit`, `404` + `reader.notFound`.

### `DELETE /books/:id/bookmarks/:bookmarkId`
**Response (200)** — `{ "success": true }`. A bookmark that doesn't exist or belongs to someone else returns `404` + `reader.bookmarkNotFound` (never reveal other users' ids).

---

## 4. Reader preferences

Stored on the user and sent with the profile so the reader opens the way the user left it, on any device.

### Shape

```json
{
  "pageTheme": "light",
  "zoom": "fit-width"
}
```

| Field | Allowed values | Default |
|---|---|---|
| `pageTheme` | `"light"` or `"dark"` (dark inverts the rendered page) | `"light"` |
| `zoom` | `"fit-width"`, `"fit-page"`, or a number from `50` to `400` (percent) | `"fit-width"` |

### Changes to existing endpoints
- `POST /auth/login` → `user.readerPreferences` (object above, defaults filled in for users who never set it).
- `PATCH /me` → accepts `readerPreferences` next to the existing `locale`. Both are optional; send only what changed. A partial `readerPreferences` merges into the stored one.

**Request**

```json
{ "readerPreferences": { "pageTheme": "dark" } }
```

**Response (200)**

```json
{ "success": true, "readerPreferences": { "pageTheme": "dark", "zoom": "fit-width" } }
```

Unknown keys or values outside the table: `400` + `reader.invalidPreferences`. The existing `PATCH /me` behavior for `locale` does not change.

---

## 5. Book fields

Add to the book object returned by `GET /books` and `GET /books/:id`:

| Field | Type | Notes |
|---|---|---|
| `pageCount` | number, optional | Page count of the PDF. Lets the library show "256 pages" and lets the reader show "time left" before the file has loaded. Fill it when the PDF is uploaded or imported; the CSV import may leave it empty. |
| `hasPdf` | boolean | `true` when the book has a readable PDF. Lets the UI hide **Read online** without relying on `pdfUrl`. Derived by the backend. |

No other book fields change. The table of contents and text search are read from the PDF by the frontend; the backend does not need to extract them.

---

## 6. Error keys

| `errorKey` | Status | Meaning |
|---|---|---|
| `reader.notFound` | 404 | Book does not exist. |
| `reader.noPdf` | 404 | Book has no PDF. |
| `reader.sourceUnavailable` | 502 | Storage behind the PDF proxy failed. |
| `reader.invalidProgress` | 400 | `page` or `totalPages` invalid. |
| `reader.invalidBookmark` | 400 | Bookmark page or note invalid. |
| `reader.bookmarkLimit` | 409 | More than 200 bookmarks on this book. |
| `reader.bookmarkNotFound` | 404 | Bookmark missing or not the caller's. |
| `reader.invalidPreferences` | 400 | Unknown preference or bad value. |

The frontend maps these keys to translated messages (English and Portuguese) and falls back to a generic message for anything else.

---

## 7. Security and privacy checklist

- Authorization is by token on every endpoint here; there is no signed URL.
- Per-user data is always filtered by the token's user id, never by an id in the request.
- Reading history is personal. Do not expose it to other users or include it in admin screens or exports.
- Do not log PDF bytes, tokens or the upstream storage URL.
- Keep the Drive (or storage) credentials server-side only.

## 8. Suggested acceptance checks

1. `curl -H "Authorization: Bearer …" -H "Range: bytes=0-1023" /api/books/1/pdf` returns `206` with `Content-Range`.
2. The same call without a token returns `401`; for a book without a PDF returns `404` + `reader.noPdf`.
3. `PUT /books/1/progress {"page":24,"totalPages":256}` then `GET` returns the same page. A second user still sees page 1.
4. `PUT … {"page":300,"totalPages":256}` returns `400` + `reader.invalidProgress`.
5. Creating a bookmark twice on one page keeps one row.
6. `PATCH /me {"readerPreferences":{"pageTheme":"dark"}}` keeps the stored `zoom`.
7. Deleting a book removes its progress and bookmarks.

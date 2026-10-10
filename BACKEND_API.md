# Backend API Contract

This document defines the endpoints the Library Portal frontend expects from a real backend. The frontend switches from mock data to real API calls when `VITE_USE_MOCK_API=false` (or when running `npm run dev:backend`).

## Base URL

The base URL is configured via the `VITE_API_BASE_URL` environment variable in the frontend. Example:

```
http://localhost:3000/api
```

All endpoints documented below are relative to this base URL.

## Authentication

The frontend stores a Bearer token after login and sends it on every request in the `Authorization` header:

```
Authorization: Bearer <token>
```

### `POST /auth/login`

Authenticate a user and return a token.

**Request body**

```json
{
  "username": "reader",
  "password": "reader",
  "rememberMe": true
}
```

`rememberMe` indicates whether the session should persist across browser restarts. The frontend uses this value to decide between `localStorage` (persistent) and `sessionStorage` (session-only) token storage when tokens are returned in the response body.

**Success response (200)**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "reader",
    "fullName": "Demo Reader",
    "role": "reader",
    "locale": "en"
  },
  "token": "jwt-or-session-token",
  "rememberMe": true
}
```

`user.locale` is the user's preferred language (`en` or `pt-BR`). The frontend applies it after a successful login.

`user.role` is either `"reader"` or `"admin"`. The frontend shows the **Admin** menu entry and allows the `/admin` routes only when `role` is `"admin"`. This is a UX gate only: the backend **must** enforce the role on every admin endpoint (see [`documents/backend-spec-admin.md`](./documents/backend-spec-admin.md)).

`token` is **required** whenever `success` is `true` (`accessToken` is accepted as an alias). A success response without a token is treated as a failed login: the frontend shows an error and stays on `/login`, because the route guard has no token to authorize `/library` with.

**Failure response (200 with `success: false`, or 401)**

```json
{
  "success": false,
  "error": "Invalid username or password."
}
```

The frontend currently uses the `success` field to determine the result; the HTTP status may be 200 or 401.

**Disabled account (403)**

When the credentials are correct but an admin has disabled the account, respond with `403` and `{ "success": false, "errorKey": "login.accountDisabled" }`. The frontend shows a dedicated "account disabled" message. Any other 401/403 is shown as invalid credentials.

### `POST /auth/logout`

Invalidate the current session/token.

The frontend sends the token in the `Authorization` header.

**Response (200)**

```json
{
  "success": true
}
```

### `POST /auth/refresh`

Refresh the access token when a request returns 401.

**Response (200)**

```json
{
  "accessToken": "new-jwt-or-session-token"
}
```

The frontend retries the original request with the new token. If refresh fails, the frontend clears the session and redirects to `/login`.

### `PATCH /me`

Update the authenticated user's profile. Currently used to persist the preferred language.

**Request body**

```json
{
  "locale": "pt-BR"
}
```

**Response (200)**

```json
{
  "success": true,
  "locale": "pt-BR"
}
```

## Books

### `GET /books`

Return the full list of books.

**Response (200)**

```json
[
  {
    "id": 1,
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "year": 1925,
    "genre": "Fiction",
    "isbn": "978-0-7432-7356-5",
    "status": "available",
    "summary": "...",
    "pdfUrl": "https://drive.google.com/file/d/.../view"
  }
]
```

### `GET /books/:id`

Return a single book by ID.

**Response (200)**

```json
{
  "id": 1,
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "year": 1925,
  "genre": "Fiction",
  "isbn": "978-0-7432-7356-5",
  "status": "available",
  "summary": "...",
  "pdfUrl": "https://drive.google.com/file/d/.../view"
}
```

**Response when not found (404 or `null`)**

The frontend treats `null` or a 404 as a missing book.

## Book fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | number/string | yes | Unique identifier. |
| `title` | string | yes | Book title. |
| `author` | string | yes | Author name. |
| `year` | number | no | Publication year. |
| `genre` | string | no | Genre. |
| `isbn` | string | no | ISBN. |
| `status` | string | yes | `"available"` or `"borrowed"`. |
| `summary` | string | no | Book summary/description. |
| `pdfUrl` | string | no | Embeddable URL for the PDF reader. |
| `coverColor` | string | no | Hex color (e.g. `#4a5568`) used as the book tile background. |
| `coverUrl` | string | no | URL of the book's cover image. When missing, the frontend looks the cover up by ISBN (if `VITE_COVERS_BASE_URL` is set) and otherwise shows a printed cover with the title and author. |
| `uploadedBy` | string | no | Username of the admin who added the book. Set by the backend. |
| `uploadedAt` | string | no | ISO 8601 timestamp of when the book was added. Set by the backend. |

### `pdfUrl` contract

- The frontend loads `pdfUrl` in an iframe on the `/library/:id/read` route.
- Reader endpoints planned for the next phase (PDF streaming, reading progress, bookmarks, reader preferences) are specified in [`documents/backend-spec-reader.md`](./documents/backend-spec-reader.md).
- The URL must be embeddable (e.g., a Google Drive `/preview` URL or a backend proxy URL).
- **Recommended:** serve the PDF through a backend proxy so the original Google Drive URL is never exposed to the browser.

## Change log

### `GET /changelog`

Return a list of portal updates. The list should be ordered with the newest entry first.

**Response (200)**

```json
[
  {
    "id": "1",
    "version": "1.3.0",
    "date": "2026-08-15",
    "title": "Profile menu and account page",
    "description": "## What's new\n\n- The header now shows a **profile icon**...\n- Language settings moved to the Account page."
  }
]
```

### Change log entry fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string/number | yes | Unique identifier. |
| `version` | string | yes | Version or release label (e.g., `"1.3.0"`). |
| `date` | string | yes | Display date. `YYYY-MM-DD` is recommended. |
| `title` | string | yes | Short update title. |
| `description` | string | yes | **Markdown-formatted** description. The frontend renders it as sanitized HTML. |

## Admin

Endpoints used by the admin area (`/admin`). All of them require a valid Bearer token **and** a user whose `role` is `"admin"`; non-admins must receive `403` with `{ "success": false, "errorKey": "admin.forbidden" }` (never `401`).

| Method | Endpoint | Purpose |
|---|---|---|
| `PATCH` | `/admin/users/:username/password` | Reset another user's password. Body: `{ newPassword }`. |
| `POST` | `/books` | Add a new book. Returns `201` with `{ success, book }`. |
| `POST` | `/books/import` | Bulk-create books from a CSV. Raw `text/csv` body (≤ 1 MB, ≤ 500 rows), all-or-nothing. Returns `201` with `{ success, imported }`; failures return `errorKey` plus details (`errors`, `missing`, `unknown`, `duplicated`, `maxRows`, `maxBytes`). Full contract: backend `documents/backend-api-specification.md` §3.4. |
| `GET` | `/books/export` | Download every book as a `text/csv` file (same columns as the import template, including `summary` and `pdfUrl`). Admin only. Full spec: [`documents/backend-spec-admin-books-export.md`](./documents/backend-spec-admin-books-export.md). |
| `GET` | `/admin/users` | List users (`page`, `pageSize`, `query`, optional `sort=lastLoginAt` + `order=asc\|desc`) → `{ items, total, page, pageSize }`. Each user includes `lastLoginAt` (ISO 8601 or `null`). |
| `PATCH` | `/admin/users/:username` | Edit a user's `email` and/or `enabled` status. |
| `DELETE` | `/admin/users/:username` | Permanently delete a user. |
| `GET` | `/admin/feature-flags` | List feature flags → `{ items: [{ key, description, enabled, updatedAt, updatedBy }] }`. |
| `POST` | `/admin/feature-flags` | Create a flag. Body: `{ key, description?, enabled? }`. Returns `201` with `{ success, flag }`; `422` `admin.featureFlags.invalidKey`, `409` `admin.featureFlags.duplicateKey`. |
| `PATCH` | `/admin/feature-flags/:key` | Turn a flag on or off. Body: `{ enabled }`. Returns `{ success, flag }`; `404` `admin.featureFlags.notFound`. |
| `DELETE` | `/admin/feature-flags/:key` | Delete a flag. `404` `admin.featureFlags.notFound`. |

`GET /admin/feature-flags` is open to any signed-in user because the portal reads flag values from it (only `key` and `enabled` are needed); create, toggle and delete are admin-only. See the feature flags spec below.

Full specifications (request/response bodies, validation rules, error keys, security and audit requirements, suggested data model):

- Reset password and add book: [`documents/backend-spec-admin.md`](./documents/backend-spec-admin.md)
- Export books to CSV: [`documents/backend-spec-admin-books-export.md`](./documents/backend-spec-admin-books-export.md)
- User list, edit email, disable/enable, delete: [`documents/backend-spec-admin-users.md`](./documents/backend-spec-admin-users.md)
- Feature flags: [`documents/backend-spec-admin-feature-flags.md`](./documents/backend-spec-admin-feature-flags.md)

## Errors

- The frontend expects JSON responses for failed requests.
- For authentication failures, the frontend redirects the user to `/login`.
- For 401 responses, the frontend refreshes the token and, if that fails, redirects to `/login`.
- For 403 responses on admin endpoints, the frontend shows a "no permission" message and keeps the user on the page.
- For network or unexpected errors, the frontend displays a generic error message.

## Environment notes for the frontend

The frontend reads these variables to locate the backend:

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Full backend URL (e.g., `http://localhost:3000/api`). |
| `VITE_USE_MOCK_API` | `true` uses in-memory mocks; `false` calls this backend. |
| `VITE_COVERS_BASE_URL` | Optional. Cover image lookup by ISBN (e.g. `https://covers.openlibrary.org/b/isbn`). Not needed when the backend returns `coverUrl`. |

Keep `CORS` enabled for local development if the frontend (`http://localhost:5173`) and backend (`http://localhost:3000`) run on different ports.

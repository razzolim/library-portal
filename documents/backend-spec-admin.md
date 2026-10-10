# Backend Specification: Admin Area

This document defines the backend contract required to support the **Admin** area of the Library Portal frontend (`/admin`). The summary contract also lives in [`BACKEND_API.md`](../BACKEND_API.md#admin).

---

## 0. Overview

### Goal
Let users with the `admin` role manage the portal from inside the UI. The first tools are:

1. **Reset another user's password** (admin informs the username and the new password).
2. **Add a new book** to the collection.

More tools will be added over time, so the backend should treat "admin" as a general authorization layer rather than a per-endpoint special case.

### Current Frontend Behavior
- The user's role comes from `user.role` in the `POST /auth/login` response and is persisted with the session.
- When `role === "admin"`:
  - The profile dropdown in the header shows an **Admin** entry.
  - The `/admin`, `/admin/users/reset-password`, and `/admin/books/new` routes are accessible.
- Any other role is redirected to `/library` when trying to open an `/admin` route.
- The frontend check is **only a UX gate**. A user can edit their stored session to set `role: "admin"`, so the backend must enforce the role on every admin endpoint.

---

## 1. Authorization

### Requirements
1. **Store a role per user.** Supported values: `reader` (default) and `admin`.
   - Recommended: `role VARCHAR(20) NOT NULL DEFAULT 'reader'` with a `CHECK (role IN ('reader', 'admin'))`.
2. **Return the role on login.** `POST /auth/login` already returns `user.role`, so this needs no change.
3. **Enforce the role server-side** on every admin endpoint via middleware/guard (e.g. `requireRole('admin')`).
   - The role must come from the database or a signed token claim, never from the request body.
   - If the role lives in the JWT, a role change must not stay effective for longer than the access-token lifetime. Revoke the user's refresh tokens on role change.

### Status codes

| Situation | Status | Body |
|---|---|---|
| Missing, invalid, or expired token | `401` | Any. The frontend runs its refresh → logout flow. |
| Valid token, but the user is not an admin | `403` | `{ "success": false, "errorKey": "admin.forbidden" }` |

> Do **not** return `401` for a non-admin. The frontend would try to refresh the token and then log the user out, which is the wrong outcome for a permission error.

### Error shape (all admin endpoints)

```json
{
  "success": false,
  "errorKey": "admin.books.duplicateIsbn",
  "message": "Optional human-readable message for logs/debugging."
}
```

The frontend translates the `errorKey` values listed in this document. Unknown keys fall back to a generic translated error. `message` is never shown to the user.

---

## 2. Reset Another User's Password

### `PATCH /admin/users/:username/password`

`:username` is URL-encoded by the frontend (`encodeURIComponent`).

#### Request body
```json
{
  "newPassword": "a-new-strong-password"
}
```

#### Validation
| Rule | Error |
|---|---|
| `newPassword` is a string with length ≥ 8 (align with `PATCH /users/me/password`) | `400` `admin.resetPassword.weakPassword` |
| User with `:username` exists (case-sensitivity must match the login endpoint) | `404` `admin.resetPassword.userNotFound` |

The frontend already validates the length and the confirmation field. The backend must still validate both, because the frontend checks can be bypassed.

#### Success response (200)
```json
{
  "success": true,
  "username": "reader"
}
```

#### Behavior requirements
1. Hash the new password with the same algorithm used elsewhere (e.g. bcrypt/argon2). **Never** store or log the plaintext.
2. **Invalidate the target user's existing sessions/refresh tokens**, so anyone holding the old credentials is signed out.
3. Do **not** return the password in the response.
4. An admin may reset their own password through this endpoint, but the regular `PATCH /users/me/password` flow (which requires the current password) is preferred. Optional: reject self-reset with `400` `admin.resetPassword.useAccountPage`. The frontend shows a generic error for it today.
5. Rate-limit the endpoint per admin (e.g. 20 requests/minute) to limit damage from a compromised admin account.
6. Write an **audit log** entry (see §4).

#### Optional future fields
- `mustChangePassword: boolean` forces the user to choose a new password on next login. The frontend does not send this yet.

---

## 3. Add a New Book

### `POST /books`

This uses the same resource as `GET /books`. Only admins may call `POST`.

#### Request body
```json
{
  "title": "Refactoring",
  "author": "Martin Fowler",
  "genre": "Software Engineering",
  "year": 2018,
  "isbn": "978-0134757599",
  "status": "available",
  "pdfUrl": "https://drive.google.com/file/d/.../view",
  "summary": "Improving the design of existing code.",
  "coverColor": "#4a5568"
}
```

Empty optional fields are sent as `null`.

#### Field rules

| Field | Type | Required | Validation |
|---|---|---|---|
| `title` | string | yes | Trimmed, 1–255 chars. |
| `author` | string | yes | Trimmed, 1–255 chars. |
| `status` | string | yes | `"available"` or `"borrowed"`. |
| `genre` | string \| null | no | Trimmed, ≤ 100 chars. Free text: the UI suggests existing genres but allows new ones. |
| `year` | integer \| null | no | `0` ≤ year ≤ current year + 1. |
| `isbn` | string \| null | no | 10 or 13 digits after removing hyphens (last char may be `X` for ISBN-10). **Unique** across books. Recommended: store a normalized (hyphen-free) copy for the uniqueness check. |
| `pdfUrl` | string \| null | no | Absolute `http`/`https` URL, ≤ 2048 chars. See the [`pdfUrl` contract](../BACKEND_API.md#pdfurl-contract). |
| `summary` | string \| null | no | ≤ 2000 chars. Plain text. |
| `coverColor` | string \| null | no | Hex color `#RRGGBB`. Default `#4a5568` if null. |

Fields the client must **not** control (ignore them if sent): `id`, `uploadedBy`, `uploadedAt`.

#### Success response (201)
```json
{
  "success": true,
  "book": {
    "id": 13,
    "title": "Refactoring",
    "author": "Martin Fowler",
    "genre": "Software Engineering",
    "year": 2018,
    "isbn": "978-0134757599",
    "status": "available",
    "pdfUrl": "https://drive.google.com/file/d/.../view",
    "summary": "Improving the design of existing code.",
    "coverColor": "#4a5568",
    "uploadedBy": "admin",
    "uploadedAt": "2026-10-09T18:30:00.000Z"
  }
}
```

- `uploadedBy` = username of the authenticated admin.
- `uploadedAt` = server time, ISO 8601 UTC.
- The frontend links to `/library/:id` using `book.id`, so the book must be readable through `GET /books/:id` as soon as the response is sent.

#### Error responses

| Status | `errorKey` | When |
|---|---|---|
| `400` | `admin.books.invalidFields` | One or more fields fail validation. Include details: `"fields": { "year": "out_of_range" }`. |
| `403` | `admin.forbidden` | Caller is not an admin. |
| `409` | `admin.books.duplicateIsbn` | ISBN already exists. |

#### Behavior requirements
1. Write an **audit log** entry (see §4).
2. If the PDF proxy is implemented, store the original Drive URL server-side and return the proxy URL in `pdfUrl` (same contract as `GET /books`).

---

## 4. Audit Log (recommended)

Every admin action should be recorded so changes can be traced.

| Column | Example |
|---|---|
| `id` | `uuid` |
| `actor_user_id` | `2` |
| `action` | `user.password.reset`, `book.create` |
| `target_type` | `user`, `book` |
| `target_id` | `1`, `13` |
| `created_at` | `2026-10-09T18:30:00Z` |
| `ip` / `user_agent` | Optional. |
| `metadata` | JSONB. Never include passwords or tokens. |

No UI exists for this yet. A future admin tool ("Activity log") could read it through `GET /admin/audit-log`.

---

## 5. Extending the Admin Area

New admin tools should follow the same conventions so the frontend can plug them in with minimal work:

- Prefix user-management and other admin-only operations with `/admin/...`. Resource writes (e.g. `PUT /books/:id`, `DELETE /books/:id`) may stay on the resource path, guarded by the same role check.
- Return `{ success: true, ... }` on success and `{ success: false, errorKey }` on failure.
- Use `403` + `admin.forbidden` for authorization failures, never `401`.
- Namespace error keys as `admin.<tool>.<reason>`.

User listing, email edit, disable/enable, and delete are specified in [`backend-spec-admin-users.md`](./backend-spec-admin-users.md).

Likely next endpoints (not implemented in the frontend yet):

| Tool | Endpoint |
|---|---|
| Create user | `POST /admin/users` |
| Change a user's role | `PATCH /admin/users/:username` `{ role }` (extends the endpoint in [`backend-spec-admin-users.md`](./backend-spec-admin-users.md)) |
| Edit book | `PUT /books/:id` |
| Remove book | `DELETE /books/:id` |

---

## 6. Acceptance Checklist

- [ ] `POST /auth/login` returns `user.role` (`reader` or `admin`).
- [ ] Non-admin requests to admin endpoints return `403` with `admin.forbidden`.
- [ ] `PATCH /admin/users/:username/password` hashes the password, revokes the target's sessions, and returns `404` for unknown users.
- [ ] `POST /books` validates fields, enforces ISBN uniqueness (`409`), sets `uploadedBy`/`uploadedAt`, and returns `201` with the created book.
- [ ] A newly created book is returned by `GET /books` and `GET /books/:id`.
- [ ] Admin actions are written to the audit log without sensitive data.

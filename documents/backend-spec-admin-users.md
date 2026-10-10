# Backend Specification: Admin User Management

This document defines everything the backend must provide for the **Admin → Users** screen of the Library Portal (`/admin/users`). It builds on [`backend-spec-admin.md`](./backend-spec-admin.md) (authorization rules, error shape, audit log) and [`BACKEND_API.md`](../BACKEND_API.md).

---

## 0. Overview

### What the screen does
A paginated, searchable table of all users. Each row has an **Actions** menu with:

| Action | Backend call |
|---|---|
| Reset password | `PATCH /admin/users/:username/password` (already specified in `backend-spec-admin.md` §2) |
| Edit email | `PATCH /admin/users/:username` with `{ email }` |
| Disable / Enable | `PATCH /admin/users/:username` with `{ enabled }` |
| Delete | `DELETE /admin/users/:username` |

Delete requires the admin to type the username in a confirmation dialog. Disable asks for confirmation. Reset password and edit email use a dialog with validation.

### New endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/admin/users` | List users (paginated, searchable). |
| `PATCH` | `/admin/users/:username` | Update `email` and/or `enabled`. |
| `DELETE` | `/admin/users/:username` | Permanently delete a user. |

### Common rules
- All endpoints require a valid Bearer token and the `admin` role. Non-admins get `403` + `{ "success": false, "errorKey": "admin.forbidden" }` (never `401`).
- `:username` is URL-encoded by the frontend. Lookup must use the same case rules as login.
- Failures use `{ "success": false, "errorKey": "..." }` (see §6 for all keys).

---

## 1. Data model changes

Add these columns to `users` (names are suggestions):

| Column | Type | Notes |
|---|---|---|
| `email` | `VARCHAR(255)` NULL | Optional. Stored trimmed. **Unique, case-insensitive** (unique index on `LOWER(email)`, ignoring NULLs). |
| `enabled` | `BOOLEAN NOT NULL DEFAULT TRUE` | `false` blocks login and invalidates sessions. |
| `deleted_at` | `TIMESTAMP` NULL | Only if you choose soft delete (see §4). |
| `last_login_at` | `TIMESTAMP` NULL | Set to the current time on every successful sign-in (`POST /auth/login`). `NULL` means the user has never signed in. Token refreshes do not update it. |

Existing users get `enabled = true` and `email = NULL`.

### Public user shape
Every endpoint below returns users in this shape. **Never** include the password or hash, tokens, or reset secrets.

```json
{
  "id": 3,
  "username": "ajohnson",
  "fullName": "Alice Johnson",
  "email": "ajohnson@example.com",
  "role": "reader",
  "enabled": true,
  "lastLoginAt": "2026-10-08T13:02:47.000Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | number/string | Unique id. |
| `username` | string | Unique, immutable. |
| `fullName` | string | Display name. |
| `email` | string \| null | `null` when not set. |
| `role` | string | `"reader"` or `"admin"`. |
| `enabled` | boolean | Account status. |
| `lastLoginAt` | string \| null | ISO 8601 timestamp in UTC of the last successful sign-in. `null` when the user has never signed in. The frontend shows it in the user's locale and time zone. |

---

## 2. `GET /admin/users`

List users with server-side pagination and search.

### Query parameters

| Param | Type | Default | Rules |
|---|---|---|---|
| `page` | integer | `1` | 1-based. Values < 1 → treat as 1. |
| `pageSize` | integer | `12` | Allowed: 1–100. The UI offers 6, 12, 24, and 48. Clamp values above 100. |
| `query` | string | *(none)* | Optional search. Case-insensitive "contains" match on `username`, `fullName`, or `email`. Trim; ignore if empty. Escape `%`/`_` if using SQL `LIKE`. |
| `sort` | string | *(none)* | Optional. Only `lastLoginAt` is supported. Ignore any other value and use the default order (never sort by arbitrary column names from the request). |
| `order` | string | `desc` | `asc` or `desc`. Only used with `sort`. Any other value → `desc`. |

### Ordering
Stable and deterministic. The same order must be used for every page, otherwise users will appear twice or be skipped when paging. Sorting must happen in the query, before pagination, so it spans all pages.

| Request | `ORDER BY` |
|---|---|
| No `sort` (default) | `LOWER(fullName), id` |
| `sort=lastLoginAt&order=desc` | `last_login_at DESC NULLS LAST, LOWER(fullName), id` |
| `sort=lastLoginAt&order=asc` | `last_login_at ASC NULLS FIRST, LOWER(fullName), id` |

Users who never signed in (`NULL`) count as the oldest sign-in: last when sorting newest first, first when sorting oldest first, so inactive accounts are easy to find. Index `last_login_at` if the user table can grow large.

### Success response (200)

```json
{
  "items": [
    {
      "id": 3,
      "username": "ajohnson",
      "fullName": "Alice Johnson",
      "email": "ajohnson@example.com",
      "role": "reader",
      "enabled": true,
      "lastLoginAt": "2026-10-08T13:02:47.000Z"
    }
  ],
  "total": 14,
  "page": 1,
  "pageSize": 12
}
```

| Field | Notes |
|---|---|
| `items` | Users for the requested page. Empty array when `page` is beyond the last page. |
| `total` | Number of users matching `query` across **all** pages. The frontend computes the page count and the "Showing X to Y of N users" text from it. |
| `page`, `pageSize` | Echo the values actually applied (after clamping). |

### Notes
- A page beyond the end must return `200` with `items: []` and the correct `total` (not `404`). The frontend relies on this to step back one page after the last item of the last page is deleted.
- Index `LOWER(username)`, `LOWER(fullName)`, and `LOWER(email)` (or use trigram indexes) if the user table can grow large.

---

## 3. `PATCH /admin/users/:username`

Partial update of a user by an admin. Only the fields below may be changed. Unknown fields are ignored (or rejected with `400`), never applied.

> `username`, `role`, `fullName`, and `password` are **not** changeable here. Passwords use their own endpoint.

### Request bodies

Edit email:
```json
{ "email": "alice.new@example.com" }
```

Disable or enable:
```json
{ "enabled": false }
```

At least one field must be present, otherwise `400` + `admin.users.invalidFields`. The frontend sends one field per request, but the backend may accept both together.

### Validation

| Field | Rule | Error |
|---|---|---|
| `email` | Trimmed; ≤ 255 chars; matches a basic email format (`something@something.tld`, no spaces). | `400` `admin.users.invalidEmail` |
| `email` | Not used by another user (case-insensitive). | `409` `admin.users.duplicateEmail` |
| `email` | Cannot be set back to `null`/empty from this screen. Reject empty strings. | `400` `admin.users.invalidEmail` |
| `enabled` | Must be a boolean. | `400` `admin.users.invalidFields` |
| `:username` | User exists. | `404` `admin.users.notFound` |

### Business rules for `enabled`
1. **An admin cannot disable their own account.** Compare the target with the authenticated user. Return `409` + `admin.users.cannotModifySelf`. Re-enabling is allowed (a no-op for yourself).
2. **The last active admin cannot be disabled.** If the target is an admin and no other enabled admin exists, return `409` + `admin.users.lastAdmin`.
3. Setting `enabled` to its current value is a successful no-op (`200`).
4. **When a user is disabled:**
   - Revoke all of their sessions and refresh tokens right away, so they are signed out on the next request.
   - Reject new logins (see §5).
5. When a user is re-enabled, no further action is needed. They sign in with their existing password.

### Success response (200)
Returns the updated user:

```json
{
  "success": true,
  "user": {
    "id": 3,
    "username": "ajohnson",
    "fullName": "Alice Johnson",
    "email": "alice.new@example.com",
    "role": "reader",
    "enabled": true
  }
}
```

---

## 4. `DELETE /admin/users/:username`

Permanently removes a user. The frontend asks the admin to type the username before sending the request.

### Business rules
1. **An admin cannot delete their own account** → `409` + `admin.users.cannotModifySelf`.
2. **The last active admin cannot be deleted** → `409` + `admin.users.lastAdmin`.
3. Unknown user → `404` + `admin.users.notFound`.
4. Revoke all sessions and refresh tokens of the deleted user.
5. **Choose and document a deletion strategy:**
   - **Soft delete (recommended):** set `deleted_at`, free the `username`/`email` for reuse only if your policy allows it, and exclude deleted users from every query (list, login, uniqueness checks). Keeps history intact.
   - **Hard delete:** remove the row. Related data that references the user (e.g. `books.uploadedBy`, audit log) must not break: store `uploadedBy` as a username string copy, or use `ON DELETE SET NULL`. The frontend already tolerates a missing `uploadedBy`.
6. Do not delete books uploaded by the user.

### Success response (200)

```json
{ "success": true }
```

(`204 No Content` is also accepted; the frontend treats any 2xx as success.)

---

## 5. Login changes for disabled users

`POST /auth/login` must reject disabled users **after** verifying the password, so the response does not reveal whether a username exists to someone without the password.

- Wrong username/password → unchanged (`401`/`success: false`, `login.invalidCredentials`).
- Correct credentials but `enabled = false` → `403`:

```json
{
  "success": false,
  "errorKey": "login.accountDisabled"
}
```

The frontend shows: *"This account is disabled. Contact an administrator."* (translated).

Also:
- `POST /auth/refresh` must fail with `401` for disabled or deleted users.
- Every authenticated request should check that the user is still enabled and not deleted (or rely on token revocation). A disabled user with a still-valid access token should be blocked within the access-token lifetime at most.

---

## 6. Error keys

| `errorKey` | Status | Meaning | Shown to the admin as |
|---|---|---|---|
| `admin.forbidden` | 403 | Caller is not an admin. | "You do not have permission to perform this action." |
| `admin.users.notFound` | 404 | Target user does not exist (e.g. deleted by another admin). | "This user no longer exists." |
| `admin.users.invalidEmail` | 400 | Email missing or malformed. | "Enter a valid email address." |
| `admin.users.duplicateEmail` | 409 | Email belongs to another user. | "Another user already has this email." |
| `admin.users.invalidFields` | 400 | Empty body, wrong types, or unsupported fields. | Generic error. |
| `admin.users.cannotModifySelf` | 409 | Admin tried to disable or delete themselves. | "You cannot disable or delete your own account." |
| `admin.users.lastAdmin` | 409 | Would leave the system without an active admin. | "This is the last active admin and cannot be disabled or deleted." |
| `admin.resetPassword.userNotFound` | 404 | Reset-password target does not exist. | "This user no longer exists." |
| `admin.resetPassword.weakPassword` | 400 | New password shorter than 8 characters. | "Password must be at least 8 characters." |
| `login.accountDisabled` | 403 | Login by a disabled user. | "This account is disabled. Contact an administrator." |

Unknown keys fall back to a generic "Something went wrong. Please try again." message.

---

## 7. Reset password from the list

The list screen reuses `PATCH /admin/users/:username/password` exactly as defined in [`backend-spec-admin.md` §2](./backend-spec-admin.md#2-reset-another-users-password) (body `{ "newPassword": "..." }`, response `{ "success": true, "username": "..." }`, sessions of the target revoked, audited, rate-limited).

The frontend also checks that both password fields match and are at least 8 characters before sending.

---

## 8. Security requirements

1. **Server-side authorization on every endpoint.** The admin-only UI is a convenience, not a control.
2. **Never return secrets.** Responses contain only the public user shape.
3. **Session revocation** on disable, delete, and password reset.
4. **Rate limiting** per admin on mutating endpoints (suggested: 60 requests/minute; 20/minute for password reset).
5. **Race conditions:** run the "last admin" check and the update in one transaction (or with a row lock) so two admins cannot disable each other simultaneously.
6. **Audit log** (same table as `backend-spec-admin.md` §4) for every mutation. Never log passwords.

| `action` | `target_type` | `metadata` |
|---|---|---|
| `user.email.update` | `user` | `{ "from": "old@example.com", "to": "new@example.com" }` |
| `user.disable` | `user` | `{}` |
| `user.enable` | `user` | `{}` |
| `user.delete` | `user` | `{ "username": "ajohnson" }` (keep the username: the row may be gone) |
| `user.password.reset` | `user` | `{}` |

---

## 9. Frontend behavior to be aware of

- After every successful email edit, enable/disable, or delete, the frontend **reloads the current page** with the same `page`, `pageSize`, `query`, `sort`, and `order`.
- Searching waits 300 ms after typing stops, resets to page 1, then calls `GET /admin/users`. The current sort is kept.
- Clicking the **Last login** column header sorts by `lastLoginAt` newest first; clicking again switches to oldest first. Changing the sort resets to page 1. On phones the same choice is a select above the list.
- If the reloaded page is empty but `total > 0`, the frontend moves to the last page.
- Buttons are disabled while a request is in flight, so duplicate submissions are not expected, but the endpoints should still be idempotent where possible (e.g. disabling an already-disabled user succeeds).
- The signed-in admin's own row shows a **You** badge and the Disable/Delete actions are disabled in the UI. The backend must still enforce this (§3, §4).

---

## 10. Acceptance checklist

- [ ] `GET /admin/users` returns `{ items, total, page, pageSize }` with stable ordering, supports `query`, and returns `items: []` (not 404) past the last page.
- [ ] Every user includes `lastLoginAt` (ISO 8601 UTC or `null`), updated on each successful sign-in, and `sort=lastLoginAt&order=asc|desc` orders across all pages with never-signed-in users treated as oldest.
- [ ] Responses never include passwords, hashes, or tokens.
- [ ] `PATCH /admin/users/:username` updates `email` (validated, unique case-insensitively) and `enabled`, returning the updated user.
- [ ] Disabling a user revokes their sessions and blocks login with `403` + `login.accountDisabled`.
- [ ] An admin cannot disable or delete themselves (`409` `admin.users.cannotModifySelf`), and the last active admin is protected (`409` `admin.users.lastAdmin`).
- [ ] `DELETE /admin/users/:username` removes (or soft-deletes) the user, revokes sessions, and does not break books they uploaded.
- [ ] Non-admin callers get `403` + `admin.forbidden` on all of the above.
- [ ] Every mutation is written to the audit log without sensitive data.
- [ ] `POST /auth/refresh` fails with `401` for disabled or deleted users.

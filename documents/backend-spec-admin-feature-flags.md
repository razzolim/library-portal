# Backend Spec: Admin Feature Flags

Feature flags let admins turn portal features on or off without a release. The admin UI (`/admin/feature-flags`) manages the flags. The portal itself reads flag values from the list endpoint below (see "How the portal reads flags").

All endpoints require a valid Bearer token. **`GET /admin/feature-flags` is open to any signed-in user** (the portal reads flag values from it, see "How the portal reads flags"). **Create, toggle and delete require `role = "admin"`**: non-admins get `403` with `{ "success": false, "errorKey": "admin.forbidden" }` (never `401`). Failures use `{ "success": false, "errorKey": "admin.featureFlags.<reason>" }`.

## Flag

| Field | Type | Notes |
|---|---|---|
| `key` | string | Unique, immutable. `^[a-z][a-z0-9_-]{1,63}$`. |
| `description` | string | Optional, ≤ 255 chars. Default `""`. |
| `enabled` | boolean | Default `false`. |
| `updatedAt` | ISO 8601 | Set on create and on every change. |
| `updatedBy` | string \| null | Username of the admin who last changed it. |

## Endpoints

### `GET /admin/feature-flags`
Any signed-in user, any role. `200` → `{ "items": [Flag, ...] }`, sorted by `key`. Not paginated.

The portal only needs `key` and `enabled`. Admins use the other fields in the management screen. **Recommended:** for non-admins, return only `key` and `enabled` for each item (leave out `description`, `updatedAt` and `updatedBy`), so readers don't see internal notes or who changed a flag. The portal works either way.

### `POST /admin/feature-flags`
Body `{ key, description?, enabled? }`.
- `201` → `{ "success": true, "flag": Flag }`
- `422` `admin.featureFlags.invalidKey` — key does not match the pattern.
- `409` `admin.featureFlags.duplicateKey` — key already exists.

### `PATCH /admin/feature-flags/:key`
Body `{ enabled }`.
- `200` → `{ "success": true, "flag": Flag }`
- `404` `admin.featureFlags.notFound`

### `DELETE /admin/feature-flags/:key`
- `200` → `{ "success": true }`
- `404` `admin.featureFlags.notFound`

## Audit

Write create, toggle and delete to the audit log (`admin.feature_flag.created|toggled|deleted`, `target_id` = key, `metadata` = `{ enabled }`), as for the other admin actions.

## How the portal reads flags

The portal does not use a separate endpoint. It calls `GET /admin/feature-flags` as any signed-in user (readers included) and uses only `key` and `enabled` from each item. It caches the answer for about 30 seconds per page session, so a toggle takes effect within that time.

- If a flag the portal asks about is missing from the list, or the request fails (including a `403`), the portal treats the flag as **off** and keeps the existing behavior.
- Mutating endpoints stay admin-only.

### Flags the portal reads

| Key | Controls |
|---|---|
| `pdf_enhanced` | The enhanced book reader at `/library/:id/read`: reader bar and fixes, the in-app PDF viewer (pages, search, bookmarks, resume, dark page, zoom), and the phone layout. Off: the original reader (Google Drive preview in a full-screen overlay). The reader endpoints in `backend-spec-reader.md` are only called when this flag is on. |

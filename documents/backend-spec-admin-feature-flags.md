# Backend Spec: Admin Feature Flags

Feature flags let admins turn portal features on or off without a release. The admin UI (`/admin/feature-flags`) manages the flags; nothing in the portal reads them yet, so this spec covers only management.

All endpoints require a valid Bearer token **and** `role = "admin"`. Non-admins get `403` with `{ "success": false, "errorKey": "admin.forbidden" }` (never `401`). Failures use `{ "success": false, "errorKey": "admin.featureFlags.<reason>" }`.

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
`200` → `{ "items": [Flag, ...] }`, sorted by `key`. Not paginated.

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

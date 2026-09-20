# Backend Specification: Language Preference & "Keep Me Logged In"

This document defines the backend contract required to support two user-facing features in the Library Portal frontend.

---

## 1. Language Preference Persistence

### Goal
Allow a user to select a language on the login page and have that choice follow them across browsers/devices after they authenticate.

### Current Frontend Behavior
- The frontend uses `vue-i18n` with two locales: `en` and `pt-BR`.
- Locale is currently stored in `localStorage` under the key `library_portal_locale`.
- `setLocale(code)` updates `vue-i18n` and writes the value to `localStorage`.
- The **login page** uses the stored/browser-detected locale because the user is not yet authenticated.

### Backend Requirements
1. **Store the user's preferred locale per account.**
   - Recommended: add a `preferences JSONB` column to the `users` table with at minimum `{ "locale": "en" }`.
   - Alternative: add a dedicated `locale VARCHAR(10)` column.
2. **Return the saved locale during login.**
   - The response from `POST /auth/login` should include the user's saved locale, or a separate `GET /me` / `GET /settings` endpoint must be available immediately after login.
3. **Provide an endpoint to update the locale.**
   - `PATCH /me` or `PATCH /settings` accepting `{ "locale": "pt-BR" }`.
   - Validate against the supported locale list (`en`, `pt-BR`).

### Suggested API Contract

#### `POST /auth/login`

Request body:
```json
{
  "username": "reader",
  "password": "reader"
}
```

Response body (200 OK):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "reader",
    "fullName": "Demo Reader",
    "role": "reader",
    "locale": "pt-BR"
  },
  "token": "<access-token>"
}
```

#### `GET /me` (or `GET /settings`)

Response body (200 OK):
```json
{
  "id": 1,
  "username": "reader",
  "fullName": "Demo Reader",
  "role": "reader",
  "locale": "pt-BR",
  "preferences": {
    "locale": "pt-BR"
  }
}
```

#### `PATCH /me` (or `PATCH /settings`)

Request body:
```json
{
  "locale": "en"
}
```

Validation rules:
- `locale` is required.
- `locale` must be one of the supported values: `en`, `pt-BR`.

Response body (200 OK):
```json
{
  "id": 1,
  "username": "reader",
  "fullName": "Demo Reader",
  "locale": "en",
  "preferences": {
    "locale": "en"
  }
}
```

### Frontend Integration
1. On the login page, continue reading `localStorage` / `navigator.language` before authentication.
2. After a successful login:
   - Read `user.locale` from the login response (or call `GET /me`).
   - Call `setLocale(user.locale)` to apply the server-side preference.
3. On the Account page, when the user changes language via `LanguageSwitcher`:
   - Call `PATCH /me` with `{ locale: newLocale }`.
   - On success, call `setLocale(newLocale)` locally.

---

## 2. "Keep Me Logged In"

### Goal
Give users a checkbox on the login page that controls whether their session persists across browser restarts.

### Current Frontend Behavior
- The frontend stores the auth object (`user` + `token`) in `localStorage` under `library_portal_auth`.
- There is no refresh-token flow; the token is assumed to be valid until logout.

### Backend Requirements
1. **Accept a `rememberMe` flag on login.**
   - Add `rememberMe: boolean` to the `POST /auth/login` request body.
2. **Issue short-lived access tokens and refresh tokens with different lifetimes depending on the flag.**
   - Access token: short-lived (recommended 15–60 minutes).
   - Refresh token:
     - `rememberMe: true` → long-lived (e.g., 7–30 days), persistent storage.
     - `rememberMe: false` → session-only or short-lived (e.g., until browser closes, or 1–2 hours), non-persistent storage.
3. **Provide a token refresh endpoint.**
   - `POST /auth/refresh` accepts the refresh token and returns a new access token (and optionally a rotated refresh token).
4. **Invalidate the refresh token on logout.**
   - `POST /auth/logout` should revoke the current refresh token server-side.
5. **Recommended transport: HttpOnly cookies.**
   - Return tokens as `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
   - This removes the need for the frontend to store tokens in `localStorage`/`sessionStorage`.
   - If cookies cannot be used, return tokens in the response body and let the frontend choose `localStorage` (remember me) or `sessionStorage` (do not remember me).

### Suggested API Contract

#### `POST /auth/login`

Request body:
```json
{
  "username": "reader",
  "password": "reader",
  "rememberMe": true
}
```

Response when using cookies (200 OK):
- Set two cookies:
  - `access_token` (HttpOnly, Secure, SameSite=Strict, max-age ~1 hour)
  - `refresh_token` (HttpOnly, Secure, SameSite=Strict, max-age 30 days if `rememberMe: true`, otherwise Session)
- Response body:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "reader",
    "fullName": "Demo Reader",
    "role": "reader",
    "locale": "pt-BR"
  }
}
```

Response when using body tokens (200 OK):
```json
{
  "success": true,
  "user": { ... },
  "accessToken": "<short-lived-access-token>",
  "refreshToken": "<long-or-session-refresh-token>",
  "expiresIn": 3600
}
```

#### `POST /auth/refresh`

Request:
- Cookie-based: browser sends `refresh_token` automatically.
- Body-based: send `{ "refreshToken": "<token>" }`.

Response (200 OK):
- Cookie-based: set a new `access_token` cookie.
- Body-based:
```json
{
  "accessToken": "<new-short-lived-access-token>",
  "expiresIn": 3600
}
```

#### `POST /auth/logout`

Request:
- Cookie-based: browser sends `refresh_token` automatically.
- Body-based: send `{ "refreshToken": "<token>" }`.

Behavior:
- Revoke the refresh token server-side.
- Clear the `access_token` and `refresh_token` cookies if using cookies.

### Frontend Integration
1. Add a "Keep me logged in" checkbox to `LoginForm.vue`.
2. Pass `rememberMe` through `auth.login(credentials)` to `POST /auth/login`.
3. If cookies are used:
   - No token storage in the frontend; the browser handles it.
   - The Axios request interceptor in `src/api/client.js` should ensure credentials are sent with every request (`withCredentials: true`).
4. If body tokens are used:
   - Store tokens in `localStorage` when `rememberMe: true`.
   - Store tokens in `sessionStorage` when `rememberMe: false`.
   - Update `src/stores/auth.js` to read from/write to the correct storage based on the flag.
5. Add an Axios response interceptor in `src/api/client.js` that:
   - Detects a 401 from an expired access token.
   - Calls `POST /auth/refresh` to obtain a new access token.
   - Retries the original request.
   - If refresh fails, clears the session and redirects to `/login`.

---

## 3. Security Notes

- Access tokens should be short-lived to limit the impact of token theft.
- Refresh tokens should be rotated on each use and revoked on logout.
- Prefer `HttpOnly` cookies over `localStorage`/`sessionStorage` for tokens to mitigate XSS risk.
- The existing `POST /auth/logout` endpoint should revoke the refresh token, not just clear frontend storage.
- Locale preference has no security impact; storing it in a JSONB `preferences` column is low-risk and future-proof.

---

## 4. Open Decisions for the Backend Team

1. **Cookie vs. body tokens**: Will the backend use `HttpOnly` cookies or return tokens in the response body?
2. **Locale column shape**: Dedicated `locale` column or generic `preferences JSONB` column?
3. **User profile endpoint**: Will locale be returned in the login response, or does the frontend call `GET /me` after login?
4. **Refresh token lifetime**: How long should refresh tokens live when `rememberMe: true` vs. `false`?
5. **Token rotation**: Should each refresh request issue a new refresh token (recommended) or keep the same one?

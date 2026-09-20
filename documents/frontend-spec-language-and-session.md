# Frontend Specification: Language Preference & "Keep Me Logged In"

This document defines the frontend changes required to support persisted language preference and a "Keep me logged in" option.

---

## 1. Language Preference Persistence

### Goal
Use the backend-stored user locale after login while still allowing anonymous language selection on the login page.

### Current State
- Locale is managed by `vue-i18n` in `src/i18n/index.js`.
- `setLocale(code)` updates `i18n.global.locale.value` and writes to `localStorage` (`library_portal_locale`).
- `getCurrentLocale()` reads the active locale.
- Login page renders using the stored/browser locale because the user is anonymous.
- The `LanguageSwitcher` component calls `setLocale()` immediately on change.

### Required Frontend Changes

#### 1.1. Apply backend locale after login

File: `src/stores/auth.js`

After a successful login, read `result.user.locale` (or fetch it from `GET /me`) and call `setLocale(locale)` before redirecting to the library.

```js
import { setLocale } from '../i18n'

async function login(credentials) {
  // ... existing request code ...

  if (!result.success) {
    error.value = result.errorKey
      ? i18n.global.t(result.errorKey)
      : i18n.global.t('login.invalidCredentials')
    return false
  }

  user.value = result.user
  token.value = result.token
  persist()

  // Apply server-side locale preference
  const userLocale = result.user?.locale
  if (userLocale && ['en', 'pt-BR'].includes(userLocale)) {
    setLocale(userLocale)
  }

  return true
}
```

#### 1.2. Persist locale changes to the backend

File: `src/views/AccountView.vue` or `src/components/LanguageSwitcher.vue`

When the user changes language on the account page, call the backend update endpoint before/after updating the local state.

Option A — change `LanguageSwitcher` to emit an event and let the parent call the API:

```vue
<!-- LanguageSwitcher.vue -->
<select :value="currentLocale" @change="handleChange">
  ...
</select>

function handleChange(event) {
  const newLocale = event.target.value
  emit('change', newLocale)
}
```

```vue
<!-- AccountView.vue -->
<LanguageSwitcher @change="updateLocale" />

async function updateLocale(newLocale) {
  await api.updateLocale(newLocale)
  setLocale(newLocale)
}
```

Option B — keep `setLocale()` inside `LanguageSwitcher` but add a new prop/event for async persistence.

Recommended: **Option A**, because it keeps `LanguageSwitcher` a dumb presentational component and lets the page own the persistence logic.

#### 1.3. Add API helper for locale update

File: `src/api/books.js` or a new `src/api/user.js`

```js
export async function updateLocale(locale) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    return { success: true, locale }
  }

  const { data } = await client.patch('/me', { locale })
  return data
}
```

#### 1.4. Add i18n keys (if needed)

No new UI keys are required unless you want to show a success/error toast when the locale is saved.

---

## 2. "Keep Me Logged In"

### Goal
Let users decide whether their session persists across browser restarts.

### Current State
- `src/components/LoginForm.vue` has username/password fields only.
- `src/stores/auth.js` stores `{ user, token }` in `localStorage` (`library_portal_auth`) regardless of session type.
- `src/api/client.js` attaches the stored token to every request via the `Authorization` header.
- `src/api/books.js` `logout()` calls `POST /auth/logout` in real-backend mode.

### Required Frontend Changes

#### 2.1. Add "Keep me logged in" checkbox

File: `src/components/LoginForm.vue`

Add a checkbox below the password field and above the submit button:

```vue
<div class="login-form__field login-form__field--checkbox">
  <label class="login-form__checkbox-label">
    <input
      v-model="rememberMe"
      type="checkbox"
      class="login-form__checkbox"
      :disabled="props.isLoading"
    />
    {{ $t('login.rememberMe') }}
  </label>
</div>
```

```js
const rememberMe = ref(false)

function handleSubmit() {
  if (!isValid.value) return
  emit('submit', {
    username: username.value.trim(),
    password: password.value,
    rememberMe: rememberMe.value
  })
}
```

Add i18n keys:

```json
// en.json
"login.rememberMe": "Keep me logged in"

// pt-BR.json
"login.rememberMe": "Manter-me conectado"
```

#### 2.2. Forward `rememberMe` through auth store to API

File: `src/stores/auth.js`

```js
async function login(credentials) {
  isLoading.value = true
  error.value = null

  try {
    const result = await authenticate(credentials)
    // ... existing success/error handling ...

    persist(credentials.rememberMe)
    return true
  } catch (err) {
    // ... existing error handling ...
  } finally {
    isLoading.value = false
  }
}
```

File: `src/api/books.js`

```js
export async function authenticate({ username, password, rememberMe }) {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)

    const user = users.find(
      (u) => u.username === username && u.password === password
    )

    if (!user) {
      return { success: false, errorKey: 'login.invalidCredentials' }
    }

    return {
      success: true,
      user: { ... },
      token: `mock-token-${user.id}-${Date.now()}`,
      rememberMe
    }
  }

  const { data } = await client.post('/auth/login', { username, password, rememberMe })
  return data
}
```

#### 2.3. Choose token storage based on `rememberMe`

File: `src/stores/auth.js`

If the backend returns tokens in the response body:

```js
const STORAGE_KEY = 'library_portal_auth'
const SESSION_KEY = 'library_portal_auth_session'

function getStorageKey(rememberMe) {
  return rememberMe ? localStorage : sessionStorage
}

function persist(rememberMe = false) {
  const storage = rememberMe ? localStorage : sessionStorage
  const other = rememberMe ? sessionStorage : localStorage

  storage.setItem(STORAGE_KEY, JSON.stringify({ user: user.value, token: token.value }))
  other.removeItem(STORAGE_KEY) // avoid stale tokens in the other storage
}

function loadStoredSession() {
  const session = sessionStorage.getItem(STORAGE_KEY)
  const persistent = localStorage.getItem(STORAGE_KEY)
  return session || persistent
}
```

Update initialization and logout:

```js
const stored = loadStoredSession()
if (stored) {
  try {
    const parsed = JSON.parse(stored)
    user.value = parsed.user || null
    token.value = parsed.token || null
  } catch (e) {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

async function logout() {
  try {
    await logoutApi()
  } catch (err) {
    // ignore backend errors
  }
  user.value = null
  token.value = null
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
}
```

> If the backend uses `HttpOnly` cookies instead, **do not store tokens in the frontend at all**. Keep `user` in memory/Pinia and rely on the browser to send cookies automatically. Update `client.js` to set `withCredentials: true`.

#### 2.4. Implement token refresh flow

File: `src/api/client.js`

If using short-lived access tokens + refresh tokens:

1. Add a flag to prevent concurrent refresh requests.
2. On 401, attempt to refresh the access token.
3. If refresh succeeds, retry the original request.
4. If refresh fails, clear the session and redirect to `/login`.

```js
let isRefreshing = false
let refreshSubscribers = []

function onRefreshed(token) {
  refreshSubscribers.forEach((callback) => callback(token))
  refreshSubscribers = []
}

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback)
}

async function refreshAccessToken() {
  const { data } = await client.post('/auth/refresh')
  return data.accessToken
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(client(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newToken = await refreshAccessToken()
        onRefreshed(newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return client(originalRequest)
      } catch (refreshError) {
        await authErrorHandler?.()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
```

> The existing `setupAuthErrorHandler` can be reused for the final redirect when refresh fails.

#### 2.5. Update request interceptor (if using body tokens)

If tokens are stored in `localStorage`/`sessionStorage`, the existing request interceptor should check both stores:

```js
function getStoredToken() {
  const auth = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
  if (!auth) return null
  try {
    return JSON.parse(auth).token
  } catch (e) {
    return null
  }
}

client.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

#### 2.6. Add tests

- `LoginForm.spec.js`: assert checkbox is rendered and its value is included in the emitted `submit` event.
- `auth.spec.js`: assert token is written to `localStorage` when `rememberMe: true` and to `sessionStorage` when `false`.
- `auth.spec.js`: assert both stores are cleared on logout.
- `client.spec.js`: assert refresh flow retries the original request and redirects on failure.

---

## 3. Recommended Cookie-Based Alternative

If the backend can use `HttpOnly` cookies, the frontend becomes simpler:

- Remove all token storage from `localStorage`/`sessionStorage`.
- Keep only `user` in `Pinia`.
- Set `withCredentials: true` on the Axios client.
- The request interceptor no longer needs to read tokens manually.
- The response interceptor still handles 401 → refresh → retry → redirect on failure.
- `rememberMe` is still passed at login; the backend controls cookie `Max-Age`.

This is the preferred strategy for production because it prevents XSS token theft.

---

## 4. Summary of File Changes

| Feature | Files to change | Notes |
|---|---|---|
| Language preference | `src/stores/auth.js` | Apply `user.locale` after login. |
| Language preference | `src/views/AccountView.vue` | Persist locale change via backend API. |
| Language preference | `src/components/LanguageSwitcher.vue` | Optionally emit `@change` instead of calling `setLocale()` directly. |
| Language preference | `src/api/books.js` or new `src/api/user.js` | Add `updateLocale()` helper. |
| Keep me logged in | `src/components/LoginForm.vue` | Add checkbox + i18n keys. |
| Keep me logged in | `src/stores/auth.js` | Support `rememberMe`, dual storage, cleanup. |
| Keep me logged in | `src/api/books.js` | Forward `rememberMe` to backend. |
| Keep me logged in | `src/api/client.js` | Refresh-token retry flow; cookie support. |
| Keep me logged in | Tests | Add coverage for checkbox, storage, refresh. |

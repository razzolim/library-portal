# Root Cause & Fix: Auth Deadlock on `/library` with Expired Token

## Root Cause

The bug was a **deadlock inside the Axios response interceptor** (`src/api/client.js`) when the token refresh failed.

### Sequence when the user sat on `/library` with an expired token

1. `fetchBooks()` gets a `401`.
2. The interceptor sees `isRefreshing === false`, starts a refresh, and sets `isRefreshing = true`.
3. `/auth/refresh` also returns `401`.
4. The interceptor calls `handleAuthError()`.
5. `handleAuthError()` triggers the registered handler in `main.js`, which calls `auth.logout()`.
6. `auth.logout()` calls `logoutApi()` → `client.post('/auth/logout')`.
7. That request **also enters the response interceptor** while `isRefreshing` is still `true`.
8. Because `isRefreshing` is `true`, the logout request **subscribes to `refreshSubscribers`** and waits forever for `onRefreshed()` to be called.
9. But `onRefreshed()` is **never called** because the refresh already failed.
10. **Result:** `logout()` never resolves → `handleAuthError()` never resolves → the redirect to `/login` never happens → the user is **stuck**.

There was a second, related bug: if **two concurrent API calls** both hit `401` while `isRefreshing` was `true`, the second call would also subscribe to `refreshSubscribers` and be stranded forever when refresh failed.

## The Fix

**File changed:** `src/api/client.js`

Three small, precise changes:

### 1. Added `onRefreshFailed(error)`

When the refresh attempt fails, every pending subscriber is **rejected** with the refresh error instead of being left hanging.

### 2. Updated the subscriber callback

Accept `(token, error)`. If an error is passed, the queued request rejects immediately.

### 3. Set `isRefreshing = false` *before* calling `handleAuthError`

This ensures that any new request spawned during error handling (like the `/auth/logout` call) sees `isRefreshing === false` and does not subscribe to the dead queue.

```js
// BEFORE
} catch (refreshError) {
  await handleAuthError({ response: { status: 401 } })
  return Promise.reject(refreshError)
} finally {
  isRefreshing = false
}

// AFTER
} catch (refreshError) {
  onRefreshFailed(refreshError)   // free stranded subscribers
  isRefreshing = false            // let new requests proceed
  await handleAuthError({ response: { status: 401 } })
  return Promise.reject(refreshError)
} finally {
  isRefreshing = false
}
```

## Verification

- All **152 existing tests pass**.
- Added **2 new regression tests** in `tests/unit/api/client.spec.js`:
  1. **Concurrent 401s** — proves both requests reject when refresh fails.
  2. **Auth error handler with nested API call** — proves `logout()` inside the handler no longer deadlocks.

The deadlock is eliminated, and the user is correctly logged out and redirected to `/login` when their token expires on any protected page.

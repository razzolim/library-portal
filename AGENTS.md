# Agent Context: Library Portal

This document provides the context and conventions agents need when working with this project.

## Project Overview

This is a **minimal Vue 3 single-page frontend** for a library. It allows users to log in, browse a book collection, view their account profile, change the language, and read a change log of portal updates. Users with the `admin` role also get an **Admin** area to reset other users' passwords and add books. The project is currently an MVP that works against in-memory mock data, but it is architected so that a real backend can be swapped in without changing the rest of the application.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Vue 3 with Composition API |
| Build Tool | Vite 5 |
| Router | Vue Router 4 |
| State | Pinia (composition-store style) |
| i18n | vue-i18n 11 |
| HTTP Client | Axios |
| Tests | Vitest + `@vue/test-utils` + jsdom |

## Project Structure

```
library-portal/
├── index.html                  # HTML entry point
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite + Vitest configuration
├── Dockerfile                  # Multi-stage production image (Node build -> nginx serve)
├── nginx.conf                  # nginx SPA template used by the Docker image
├── .github/workflows/ci.yml    # GitHub Actions CI workflow
├── .env / .env.example         # Environment templates (see below)
├── .env.dev                    # Dev mode config
├── .env.mock                   # Mock mode config
├── .env.test                   # Test defaults
├── .env.production             # Production build config (optional / added when shared)
├── README.md                   # Human-readable documentation
├── BACKEND_API.md              # Backend API contract
├── documents/backend-spec-admin.md # Backend spec: admin authorization, reset password, add book
├── documents/backend-spec-admin-users.md # Backend spec: admin user list, edit email, disable, delete
├── AGENTS.md                   # This file
└── src/
    ├── main.js                 # App bootstrap
    ├── App.vue                 # Root layout
    ├── router/index.js         # Routes and auth guard
    ├── stores/auth.js          # Pinia auth store
    ├── api/
    │   ├── client.js           # Axios client with env-based baseURL + 401 handler
    │   ├── books.js            # API functions for auth and books (mock or real)
    │   ├── admin.js            # Admin-only API functions (reset user password, create book)
    │   └── changelog.js        # API function for the change log (mock or real)
    ├── i18n/
    │   ├── index.js            # i18n setup, locale helpers, and availableLocales
    │   └── locales/            # Translation JSON files (en, pt-BR)
    ├── mocks/                  # Static JSON mock data
    ├── views/                  # Page-level components
    │   ├── LoginView.vue
    │   ├── LibraryView.vue
    │   ├── BookPdfView.vue
    │   ├── AccountView.vue
    │   ├── ChangeLogView.vue
    │   └── admin/              # Admin area (admin role only)
    │       ├── adminTools.js   # Registry of admin tools (drives sidebar + overview cards)
    │       ├── AdminView.vue   # Layout: header, sidebar nav, panel + shared admin form styles
    │       ├── AdminHomeView.vue
    │       ├── AdminUsersView.vue        # Paginated user list + per-user actions
    │       ├── AdminResetPasswordView.vue
    │       └── AdminAddBookView.vue
    ├── components/             # Reusable components
    │   ├── AppHeader.vue
    │   ├── BookCard.vue
    │   ├── BookDetailModal.vue
    │   ├── BookPdfViewer.vue
    │   ├── ChangeLog.vue
    │   ├── LanguageSwitcher.vue
    │   ├── LoadingSpinner.vue
    │   ├── LoginForm.vue
    │   ├── PaginationControls.vue
    │   └── icons/
    │       └── LibraryIcon.vue
    ├── utils/                  # Shared utilities (drive URL, markdown rendering, changelog version)
    └── assets/
        ├── styles.css          # Global CSS + CSS variables
        └── ...                 # Static assets
```

## Environment Configuration

- Vite exposes only variables prefixed with `VITE_` to the browser.
- All hosts and API endpoints are configured through `.env` files. Do not hardcode URLs in source code.

### Required variables

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Full API base URL. Takes precedence over `VITE_API_HOST` + `VITE_API_PORT`. |
| `VITE_API_HOST` | Backend host (fallback). |
| `VITE_API_PORT` | Backend port (fallback). |
| `VITE_USE_MOCK_API` | `true` to use in-memory mocks; `false` to call the real backend. |
| `VITE_ENVIRONMENT` | Environment label for debugging. |

### Environment files

| File | Loaded when | Commit? |
|---|---|---|
| `.env` | All modes | No (gitignored) |
| `.env.example` | All modes (template) | Yes |
| `.env.dev` | `npm run dev` | Yes |
| `.env.mock` | `npm run dev:mock` | Yes |
| `.env.test` | `npm test` (Vitest `--mode test`) | Yes |
| `.env.production` | `npm run build:prod` | Optional; add if the project shares production defaults |
| `.env.*.local` | Same as matching mode | No (gitignored) |

### Default backend target

The default `.env` and `.env.example` point to:

```
host: localhost
port: 3000
baseURL: http://localhost:3000/api
```

### Scripts

- `npm start` — start dev server with the default `.env` configuration.
- `npm run dev` — dev server with `--mode dev` (loads `.env` + `.env.dev`, points to the shared dev backend).
- `npm run dev:mock` — dev server with `--mode mock` (loads `.env` + `.env.mock`, uses in-memory data).
- `npm run dev:localhost` — dev server with `--mode localhost` (loads `.env`, uses the local backend).
- `npm run build` / `npm run build:prod` — production build (Vite loads `.env.production` if present).
- `npm run preview` — preview the production build locally.
- `npm test` / `npm run test:watch` / `npm run test:ui` — run the Vitest suite.

## Coding Conventions

### Vue / JavaScript

- Use the **Composition API** with `<script setup>`.
- Use `ref`, `computed`, and `watch` from `vue` for reactive state.
- Use `useI18n()` from `vue-i18n` for translations in components.
- Use `useAuthStore()` from `src/stores/auth.js` for authentication state.
- Router guards live in `src/router/index.js`.

### API Layer

- All HTTP requests go through `src/api/client.js`.
- API functions live in `src/api/books.js` (auth + books), `src/api/admin.js` (admin-only actions), and `src/api/changelog.js` (change log).
- The backend contract is documented in `BACKEND_API.md`.
- `src/api/client.js` reads the auth token from `localStorage` under the `library_portal_auth` key and attaches it as a `Bearer` header.
- `src/api/client.js` exports `setupAuthErrorHandler()` and `handleAuthError()`. A registered handler is invoked on every 401 response, clears the session, and redirects to login. Do not remove this wiring in `src/main.js`.
- When `VITE_USE_MOCK_API` is `true`, functions return in-memory mock data with a 500ms delay.
- When `VITE_USE_MOCK_API` is `false`, functions call the real backend.
- The default behavior is **mock** when the variable is missing, so tests and initial setup keep working.

### Routes

- `/` redirects to `/login`.
- `/login` is public and renders `LoginView`.
- `/library` requires auth and renders the book grid in `LibraryView`.
- `/library/:id` requires auth and opens the book detail modal inside `LibraryView`.
- `/library/:id/read` requires auth and opens `BookPdfView` in a dedicated tab/window.
- `/account` requires auth and renders `AccountView`.
- `/changelog` requires auth and renders `ChangeLogView`.
- `/admin` requires auth **and** the `admin` role (`meta.requiresAdmin`). It renders the `AdminView` layout with child routes:
  - `/admin` (`admin`) — overview cards for every tool.
  - `/admin/users` (`admin-users`) — paginated, searchable user list with actions: reset password, edit email, disable/enable, delete.
  - `/admin/users/reset-password` (`admin-reset-password`) — reset another user's password.
  - `/admin/books/new` (`admin-add-book`) — add a book.
  - Non-admins are redirected to `/library`. Child routes inherit `requiresAdmin` through the merged `to.meta`.
- Any unknown route redirects to `/login`.

### Admin area

- `useAuthStore().isAdmin` is `true` when `user.role === 'admin'`. Use it for any admin-only UI.
- The frontend role check is a UX gate only; the backend enforces the role (see `documents/backend-spec-admin.md`).
- **Adding a new admin tool:**
  1. Create the view in `src/views/admin/` and reuse the shared classes from `AdminView.vue` (`admin-tool__*`, `admin-form__*`).
  2. Register it as a child of `/admin` in `src/router/index.js`.
  3. Add an entry to `src/views/admin/adminTools.js` (`key`, `route`, `group`, `icon`). The sidebar and overview cards update automatically.
  4. Add `admin.tools.<key>.title` / `.description` (and any group label under `admin.groups`) to both locale files.
  5. Add the API function to `src/api/admin.js` with a mock branch, and document the endpoint in `BACKEND_API.md` and `documents/backend-spec-admin.md`.
- Admin API failures return `{ success: false, errorKey }`. A `403` is mapped to `admin.forbidden`. Views map known keys to i18n messages and fall back to a generic error.
- User management lives in `AdminUsersView.vue` and uses the reusable `src/components/admin/AdminModal.vue` for its dialogs (Escape to close, focus trap, can't be dismissed while saving). `PaginationControls` takes a `showingKey` prop to change its "Showing X to Y of N ..." label.
- A disabled account is rejected at login with `errorKey: 'login.accountDisabled'`. Users cannot disable or delete themselves (UI and backend).
- Destructive actions (e.g. password reset) use an inline two-step confirmation before calling the API.
- In mock mode, `createBook()` appends to the in-memory book list (visible until reload), and `resetUserPassword()` only validates the username without changing the mock data. User edits (email, enabled) and deletes mutate the in-memory `users.json` array until reload; because `authenticate()` reads the same array, disabling or deleting a mock user affects login too.

### Change log

- Change log entries are fetched via `fetchChangelog()` in `src/api/changelog.js`.
- The backend endpoint is `GET /changelog`.
- Each entry must contain: `id`, `version`, `date`, `title`, and `description`.
- The `description` field is Markdown. The frontend renders it using `marked` and sanitizes the result with `DOMPurify` via `src/utils/markdown.js`.
- `src/utils/changelog.js` provides `getLatestChangelogVersion()` to display the current app version in the footer.

### PDF Viewer

- The `pdfUrl` returned in book data should be an embeddable URL. In the current mock data it is a Google Drive share link, which `src/utils/drive.js` converts to the Google Drive `/preview` URL.
- A future backend proxy will replace the raw Google Drive link with a proxy URL, keeping the original Drive URL hidden from the browser. The `pdfUrl` contract stays the same: the frontend receives an embeddable URL and loads it in the `BookPdfViewer` iframe.
- The reader is displayed on a dedicated route (`/library/:id/read`) that opens in a new browser tab when the user clicks **Read online** on the book detail modal.

### Styling

- Use plain CSS with BEM-like naming (e.g. `.login-view__card`).
- CSS variables are defined in `src/assets/styles.css`.
- Prefer `rem` units and the existing variables for colors, spacing, and radii.

### Header / Profile menu

- The header component is `src/components/AppHeader.vue`.
- The user profile is accessed via a profile icon that opens a dropdown with **My account** and **Logout**.
- **My account** navigates to the `/account` route (`src/views/AccountView.vue`).
- For users with the `admin` role, the dropdown also shows **Admin**, which navigates to `/admin`.
- The language switcher is no longer in the header. It appears on the login page (`src/views/LoginView.vue`) and on the account page (`src/views/AccountView.vue`).

### i18n

- Translation keys are in `src/i18n/locales/en.json` and `src/i18n/locales/pt-BR.json`.
- Add new keys to both files when introducing UI text.
- Do not hardcode user-facing strings in components.
- `src/i18n/index.js` exports helpers: `setLocale()`, `getCurrentLocale()`, and `availableLocales`.

### Tests

- Tests are in `tests/unit/`, mirroring the `src/` structure.
- Use `mount` from `@vue/test-utils` with the i18n helper in `tests/unit/test-utils.js` for components.
- `tests/setup.js` is loaded before each test run and resets the locale to English.
- The test environment is `jsdom` and `globals` are enabled.
- Tests should keep using the mock data by default; they do not need a running backend.
- Utility tests should also live in `tests/unit/`, mirroring the `src/utils/` structure.

## Common Tasks

### Adding a new environment

1. Copy `.env.example` to a new file (e.g. `.env.staging`).
2. Set `VITE_API_BASE_URL`, `VITE_USE_MOCK_API`, and `VITE_ENVIRONMENT`.
3. Add an npm script if you want a dedicated command: `"dev:staging": "vite --mode staging"`.
4. Update this file and `README.md` if the environment is shared.

### Changing the backend URL

1. Update the relevant `.env*` file.
2. Do not change `src/api/client.js` unless the URL construction logic itself needs to change.

### Adding a real backend endpoint

1. Add or update the function in `src/api/books.js`.
2. Branch on `USE_MOCK_API` for the mock implementation.
3. Use the `client` from `src/api/client.js` for the real implementation.
4. Add or update tests for the mock branch.

## Deployment

- `Dockerfile` builds the app with the `VITE_*` build args and serves it with nginx. Make sure all required `VITE_` variables are passed as build args; Vite bakes them into the bundle at compile time.
- `nginx.conf` is processed as an nginx template so `${PORT}` can be supplied at container runtime. It also handles SPA fallback to `index.html` and aggressive caching for hashed static assets.
- `.github/workflows/ci.yml` runs `npm ci` and `npm test` on pushes and pull requests to `main` and `develop` when `src/**` files change.

## Important Notes

- `.env` is gitignored; committed environment templates should be named `.env.<mode>` or `.env.example`.
- The backend is expected to be available at `http://localhost:3000/api` by default.
- The demo credentials are `reader / reader` and `admin / admin` (admin role), defined in `src/mocks/users.json`.
- The project currently has no real backend, so keep `VITE_USE_MOCK_API=true` until one is available.

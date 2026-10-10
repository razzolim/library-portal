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
├── documents/backend-spec-admin-books-export.md # Backend spec: export all books as CSV
├── documents/backend-spec-admin-users.md # Backend spec: admin user list, edit email, disable, delete
├── documents/backend-spec-reader.md # Backend spec: PDF streaming, reading progress, bookmarks, reader preferences
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
    │   ├── reader.js           # Reading progress, bookmarks, reader preferences (mock or real)
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
│       ├── AdminImportBooksView.vue  # CSV book import (POST /books/import)
    │       └── AdminAddBookView.vue
    ├── components/             # Reusable components
    │   ├── AppHeader.vue
    │   ├── BookCard.vue
    │   ├── BookCover.vue       # Real cover image, or a printed cover in the book's color
    │   ├── BookDetailModal.vue
    │   ├── BookPdfViewer.vue   # Drive iframe reader
    │   ├── PdfReader.vue       # pdf.js reader (backend PDF proxy)
    │   ├── reader/             # ReaderBar, ReaderSidebar, ReaderControls
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
| `VITE_COVERS_BASE_URL` | Optional. Cover images by ISBN (`https://covers.openlibrary.org/b/isbn`). Empty means printed covers only; `.env.test` keeps it empty so tests never hit the network. |

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
  - `/admin/users` (`admin-users`) — paginated, searchable user list with actions: reset password, edit email, disable/enable, delete. Shows each user's last login (`lastLoginAt`, relative plus date/time, or "Never signed in") and sorts by it on the server (`sort=lastLoginAt&order=desc|asc`); the default order is by name.
  - `/admin/users/reset-password` (`admin-reset-password`) — reset another user's password.
  - `/admin/books/new` (`admin-add-book`) — add a book.
  - `/admin/books/import` (`admin-import-books`) — import books from a CSV file (drag & drop or browse, client-side pre-checks, downloadable template, row-level error report).
  - `/admin/feature-flags` (`admin-feature-flags`) — list, create, toggle on/off, and delete feature flags (group `system`). Management only; nothing in the portal reads the flags yet. API in `src/api/admin.js` (`fetchFeatureFlags`, `createFeatureFlag`, `setFeatureFlagEnabled`, `deleteFeatureFlag`); mock seed in `src/mocks/featureFlags.json`; spec in `documents/backend-spec-admin-feature-flags.md`.
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
- CSV import: `importBooks(csvText)` in `src/api/admin.js` posts the raw text as `text/csv` (all-or-nothing). CSV parsing, limits and the template live in `src/utils/csv.js`. Failures resolve to `{ success: false, errorKey, ...details }` (`errors`, `missing`, `unknown`, `duplicated`, `maxRows`); the view maps them to `admin.books.import.*` messages and a line/column table. The mock validates the same rules and appends to the in-memory books.
- CSV export: the import page has an **Export all books** button. `exportBooks()` in `src/api/admin.js` calls `GET /books/export` (`responseType: 'blob'`, admin only) and the view saves the returned file. Mock mode builds the CSV from the in-memory books with `booksToCsv()` in `src/utils/csv.js`. The backend contract is in `documents/backend-spec-admin-books-export.md`.
- In mock mode, `createBook()` appends to the in-memory book list (visible until reload), and `resetUserPassword()` only validates the username without changing the mock data. User edits (email, enabled) and deletes mutate the in-memory `users.json` array until reload; because `authenticate()` reads the same array, disabling or deleting a mock user affects login too.

### Change log

- Change log entries are fetched via `fetchChangelog()` in `src/api/changelog.js`.
- The backend endpoint is `GET /changelog`.
- Each entry must contain: `id`, `version`, `date`, `title`, and `description`.
- The `description` field is Markdown. The frontend renders it using `marked` and sanitizes the result with `DOMPurify` via `src/utils/markdown.js`.
- `src/utils/changelog.js` provides `getLatestChangelogVersion()` to display the current app version in the footer.

### Book covers

- Render covers with `BookCover` (sizes `sm`, `md`, `lg`; used by the grid cards, list rows and the detail modal); don't re-implement covers or colors.
- The cover image comes from the book's `coverUrl`, or from `VITE_COVERS_BASE_URL` + ISBN via `getCoverImageUrl()` in `src/utils/cover.js`.
- Every book is a portrait 2:3 cover with no tile behind it. A printed cover (title and author on `coverColor`) is always drawn underneath; the image fades in once loaded and is dropped on error, so missing covers fall back automatically.

### PDF Viewer

- The `pdfUrl` returned in book data should be an embeddable URL. In the current mock data it is a Google Drive share link, which `src/utils/drive.js` converts to the Google Drive `/preview` URL.
- A future backend proxy will replace the raw Google Drive link with a proxy URL, keeping the original Drive URL hidden from the browser. The `pdfUrl` contract stays the same: the frontend receives an embeddable URL and loads it in the `BookPdfViewer` iframe.
- The reader is displayed on a dedicated route (`/library/:id/read`) that opens in a new browser tab when the user clicks **Read online** on the book detail modal.
- `BookPdfView` picks the viewer from the book's `pdfUrl`:
  - **Google Drive link** → `BookPdfViewer.vue`: the Drive `/preview` iframe under a slim bar. It sets `document.title` to the book and shows a retry panel if the iframe's `load` never arrives within 20 s. No progress, search or bookmarks are possible here (the iframe can't report the page).
  - **Anything else** (the backend PDF proxy, absolute or relative to the API base URL, e.g. `/api/books/12/pdf`) → `PdfReader.vue`: our own pdf.js viewer. Mock mode has only Drive links, so it always shows the iframe viewer; point `VITE_USE_MOCK_API=false` at a backend (or a fake one) to see the pdf.js reader.
- Both viewers share `reader/ReaderBar.vue` (back, cover, title/author, reload, full screen, close) and `useFullscreen`. `PdfReader` adds `reader/ReaderSidebar.vue` (contents, bookmarks, search) and `reader/ReaderControls.vue` (pages, slider, % and time left, zoom, dark page).
- pdf.js is loaded on demand from `src/utils/pdf.js` (`openPdf`, `loadOutline`, `searchPdf`, zoom/page helpers); its worker is a separate chunk. Tests mock `openPdf`; don't import `pdfjs-dist` at the top of a module that tests load.
- Reader data goes through `src/api/reader.js` (progress, bookmarks, reader preferences; in-memory mock branch). Progress saves are debounced (2.5 s) and flushed on tab hide/close with `fetch(..., { keepalive: true })`. Reader preferences (`pageTheme`, `zoom`) live on `useAuthStore().readerPreferences` and are saved with `PATCH /me`.
- Phones (`max-width: 720px`): the page fills the screen, the bars float and hide after ~3.5 s, tapping the middle toggles them, tapping the left/right quarter or swiping turns pages, pinch zooms, and the panel is a bottom sheet.
- **Close** calls `window.close()` and falls back to `/library` if the tab stays open (e.g. a pasted link). **Back** goes to `/library/:id` in the same tab. Esc only closes the side panel, never the reader. Do not reintroduce an Escape-closes-the-tab handler or a global `contextmenu` block.
- Backend contract for all of this: `documents/backend-spec-reader.md`.

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

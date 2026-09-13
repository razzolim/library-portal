# Agent Context: Library Portal

This document provides the context and conventions agents need when working with this project.

## Project Overview

This is a **minimal Vue 3 single-page frontend** for a library. It allows users to log in, browse a book collection, view their account profile, change the language, and read a change log of portal updates. The project is currently an MVP that works against in-memory mock data, but it is architected so that a real backend can be swapped in without changing the rest of the application.

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
├── .env / .env.example         # Environment templates (see below)
├── .env.development            # Dev mode config
├── .env.backend                # Real backend mode config
├── .env.mock                   # Mock mode config
├── .env.production             # Production config
├── README.md                   # Human-readable documentation
├── AGENTS.md                   # This file
└── src/
    ├── main.js                 # App bootstrap
    ├── App.vue                 # Root layout
    ├── router/index.js         # Routes and auth guard
    ├── stores/auth.js          # Pinia auth store
    ├── api/
    │   ├── client.js           # Axios client with env-based baseURL
    │   ├── books.js            # API functions for auth and books (mock or real)
    │   └── changelog.js        # API function for the change log (mock or real)
    ├── i18n/                   # Translations and locale config
    ├── mocks/                  # Static JSON mock data
    ├── views/                  # Page-level components
    ├── components/             # Reusable components
    ├── utils/                  # Shared utilities (drive URL, markdown rendering)
    └── assets/styles.css       # Global CSS + CSS variables
```

## Environment Configuration

- Vite exposes only variables prefixed with `VITE_` to the browser.
- All hosts and API endpoints are configured through `.env` files. **Do not hardcode URLs in source code.**

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
| `.env.development` | `npm run dev` / `npm run dev:env` | Yes |
| `.env.backend` | `npm run dev:backend` | Yes |
| `.env.mock` | `npm run dev:mock` | Yes |
| `.env.production` | `npm run build` / `npm run build:prod` | Yes |
| `.env.*.local` | Same as matching mode | No (gitignored) |

### Default backend target

The default `.env` and `.env.example` point to:

```
host: localhost
port: 3000
baseURL: http://localhost:3000/api
```

### Scripts

- `npm run dev` — dev server with `.env` + `.env.development`.
- `npm run dev:env` — alias for `npm run dev`.
- `npm run dev:backend` — dev server with `.env` + `.env.backend` (real backend).
- `npm run dev:mock` — dev server with `.env` + `.env.mock` (mock data).
- `npm run build` / `npm run build:prod` — production build.
- `npm test` / `npm run test:watch` / `npm run test:ui` — tests.

## Coding Conventions

### Vue / JavaScript

- Use the **Composition API** with `<script setup>`.
- Use `ref`, `computed`, and `watch` from `vue` for reactive state.
- Use `useI18n()` from `vue-i18n` for translations in components.
- Use `useAuthStore()` from `src/stores/auth.js` for authentication state.
- Router guards live in `src/router/index.js`.

### API Layer

- All HTTP requests go through `src/api/client.js`.
- API functions live in `src/api/books.js` (auth + books) and `src/api/changelog.js` (change log).
- The backend contract is documented in `BACKEND_API.md`.
- When `VITE_USE_MOCK_API` is `true`, functions return in-memory mock data with a 500ms delay.
- When `VITE_USE_MOCK_API` is `false`, functions call the real backend.
- The default behavior is **mock** when the variable is missing, so tests and initial setup keep working.

### Change log

- Change log entries are fetched via `fetchChangelog()` in `src/api/changelog.js`.
- The backend endpoint is `GET /changelog`.
- Each entry must contain: `id`, `version`, `date`, `title`, and `description`.
- The `description` field is Markdown. The frontend renders it using `marked` and sanitizes the result with `DOMPurify` via `src/utils/markdown.js`.

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
- The language switcher is no longer in the header; it lives on the account page.

### i18n

- Translation keys are in `src/i18n/locales/en.json` and `src/i18n/locales/pt-BR.json`.
- Add new keys to both files when introducing UI text.
- Do not hardcode user-facing strings in components.

### Tests

- Tests are in `tests/unit/`, mirroring the `src/` structure.
- Use `mount` from `@vue/test-utils` with the i18n helper in `tests/unit/test-utils.js` for components.
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

## Important Notes

- `.env` is gitignored; committed environment templates should be named `.env.<mode>` or `.env.example`.
- The backend is expected to be available at `http://localhost:3000/api` by default.
- The demo credentials are `reader / reader` (defined in `src/mocks/users.json`).
- The project currently has **no real backend**, so keep `VITE_USE_MOCK_API=true` until one is available.

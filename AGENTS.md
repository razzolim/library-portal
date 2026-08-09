# Agent Context: Library Portal

This document provides the context and conventions agents need when working with this project.

## Project Overview

This is a **minimal Vue 3 single-page frontend** for a library. It allows users to log in and browse a book collection. The project is currently an MVP that works against in-memory mock data, but it is architected so that a real backend can be swapped in without changing the rest of the application.

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
    │   └── books.js            # API functions (mock or real)
    ├── i18n/                   # Translations and locale config
    ├── mocks/                  # Static JSON mock data
    ├── views/                  # Page-level components
    ├── components/             # Reusable components
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
- API functions live in `src/api/books.js`.
- When `VITE_USE_MOCK_API` is `true`, functions return in-memory mock data with a 500ms delay.
- When `VITE_USE_MOCK_API` is `false`, functions call the real backend.
- The default behavior is **mock** when the variable is missing, so tests and initial setup keep working.

### Styling

- Use plain CSS with BEM-like naming (e.g. `.login-view__card`).
- CSS variables are defined in `src/assets/styles.css`.
- Prefer `rem` units and the existing variables for colors, spacing, and radii.

### i18n

- Translation keys are in `src/i18n/locales/en.json` and `src/i18n/locales/pt-BR.json`.
- Add new keys to both files when introducing UI text.
- Do not hardcode user-facing strings in components.

### Tests

- Tests are in `tests/unit/`, mirroring the `src/` structure.
- Use `mount` from `@vue/test-utils` with the i18n helper in `tests/test-utils.js` for components.
- The test environment is `jsdom` and `globals` are enabled.
- Tests should keep using the mock data by default; they do not need a running backend.

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

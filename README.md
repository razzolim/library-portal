# Library Portal

A minimal, single-page web application for a library. It allows a user to log in and browse the library's book collection.

This is the **MVP (Minimum Viable Product)** frontend. The backend API is not yet implemented, so the portal currently uses in-memory mock data that behaves like a real API (asynchronous responses with a small delay).

---

## What was built

- **Login page** (`/login`) with form validation.
- **Library page** (`/library`) that lists all books and lets the user filter them by title or author.
- **Pagination** with a user-selectable number of items per page (6, 12, 24, 48).
- **Authentication guard** that redirects unauthenticated users to the login page.
- **Internationalization (i18n)** with support for English (`en`) and Brazilian Portuguese (`pt-BR`), including a language switcher in the header.
- **Mock API layer** for authentication and book data, so the real backend can be swapped in later.
- **Automated tests** for the auth store, the login form, the language switcher, pagination, and the mock API.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | [Vue 3](https://vuejs.org/) + Composition API | Template-based, easy for backend engineers to read and maintain. |
| Build Tool | [Vite](https://vitejs.dev/) | Fast dev server and simple configuration. |
| Routing | [Vue Router](https://router.vuejs.org/) | Declarative routing and route guards. |
| State | [Pinia](https://pinia.vuejs.org/) | Minimal boilerplate store for auth state. |
| i18n | [vue-i18n](https://vue-i18n.intlify.dev/) | Translations for English and Brazilian Portuguese. |
| HTTP Client | [Axios](https://axios-http.com/) | Already configured and ready for the real backend. |
| Styling | Plain CSS + CSS variables | No CSS framework to learn; easy to theme. |
| Tests | [Vitest](https://vitest.dev/) + `@vue/test-utils` | Works out of the box with Vite. |

---

## Project Structure

```
library-portal/
├── index.html                 # HTML entry point
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite configuration (including Vitest settings)
├── README.md                  # This file
└── src/
    ├── main.js                # App bootstrap
    ├── App.vue                # Root layout
    ├── router/
    │   └── index.js           # Routes and authentication guard
    ├── stores/
    │   └── auth.js            # Pinia auth store (login, logout, persistence)
    ├── api/
    │   ├── client.js          # Axios HTTP client (ready for real API)
    │   └── books.js           # Mock API functions for auth and books
    ├── i18n/
    │   ├── index.js           # i18n configuration and locale detection
    │   └── locales/
    │       ├── en.json        # English translations
    │       └── pt-BR.json     # Brazilian Portuguese translations
    ├── mocks/
    │   ├── books.json         # Mock book data
    │   └── users.json         # Mock user data
    ├── views/
    │   ├── LoginView.vue      # Login page
    │   └── LibraryView.vue    # Book listing page
    ├── components/
    │   ├── AppHeader.vue      # Header with logout
    │   ├── LoginForm.vue      # Reusable login form
    │   ├── BookCard.vue       # Book card component
    │   ├── LoadingSpinner.vue # Loading indicator
    │   ├── LanguageSwitcher.vue # Language selector
    │   └── PaginationControls.vue # Pagination bar
    └── assets/
        └── styles.css         # Global styles and CSS variables
└── tests/
    ├── setup.js               # Test setup (locale reset)
    ├── test-utils.js          # Shared test helpers (mount with i18n)
    └── unit/
        ├── api/books.spec.js                 # Mock API tests
        ├── components/LoginForm.spec.js    # Login form tests
        ├── components/LanguageSwitcher.spec.js  # Language switcher tests
        ├── components/PaginationControls.spec.js  # Pagination tests
        └── stores/auth.spec.js               # Auth store tests
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) version **18 or higher** (Node 20 is recommended).
- npm (comes with Node.js).

> If Node is not installed, you can install it with [nvm](https://github.com/nvm-sh/nvm):
>
> ```bash
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
> nvm install 20
> nvm use 20
> ```

---

## Environment Configuration

The portal uses Vite's built-in `.env` support. Environment variables that need to be available in the browser must be prefixed with `VITE_`.

### Available variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_HOST` | `localhost` | Backend host. |
| `VITE_API_PORT` | `3000` | Backend port. |
| `VITE_API_BASE_URL` | `http://localhost:3000/api` | Full API base URL. When set, it overrides `VITE_API_HOST` and `VITE_API_PORT`. |
| `VITE_USE_MOCK_API` | `true` | If `true`, the app uses in-memory mock data. If `false`, it calls the real backend at `VITE_API_BASE_URL`. |
| `VITE_ENVIRONMENT` | `development` | Environment name used for logging/debugging. |

### Environment files

| File | Mode | Purpose |
|---|---|---|
| `.env` | All modes | Default local configuration. Git-ignored. |
| `.env.example` | All modes | Template to copy to `.env`. |
| `.env.development` | `development` | Default dev mode values (localhost:3000 + mock data). |
| `.env.backend` | `backend` | Uses the real backend on localhost:3000. |
| `.env.mock` | `mock` | Forces in-memory mock data. |
| `.env.production` | `production` | Production build values. |

> The `.env` file is ignored by Git. New environments should start from `.env.example`.

---

## Getting Started

1. **Install dependencies**

   ```bash
   cd library-portal
   npm install
   ```

2. **Start the development server**

   The default dev mode uses the mock data and points to `http://localhost:3000/api` for the backend.

   ```bash
   npm run dev
   # or explicitly
   npm run dev:env
   ```

   The portal will be available at **http://localhost:5173**.

3. **Run against the real backend**

   When the backend is running on localhost:3000, use the backend mode:

   ```bash
   npm run dev:backend
   ```

4. **Force mock data**

   ```bash
   npm run dev:mock
   ```

5. **Build for production**

   ```bash
   npm run build
   # or explicitly
   npm run build:prod
   ```

   The output will be placed in the `dist/` folder.

### Available scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `vite` | Dev server with `.env` + `.env.development`. |
| `npm run dev:env` | `vite` | Same as `npm run dev`. |
| `npm run dev:backend` | `vite --mode backend` | Uses `.env` + `.env.backend`. |
| `npm run dev:mock` | `vite --mode mock` | Uses `.env` + `.env.mock`. |
| `npm run build` | `vite build` | Production build using `.env` + `.env.production`. |
| `npm run build:prod` | `vite build --mode production` | Explicit production build. |

---

## How to Use the Portal

1. Open the portal at the URL shown by Vite (usually `http://localhost:5173`).
2. You will be redirected to the **Login** page.
3. Use the demo credentials:

   ```
   Username: reader
   Password: reader
   ```

4. After a successful login, you are redirected to the **Library** page.
5. On the Library page:
   - Browse the full list of books.
   - Use the **Search** box to filter by title or author.
   - Use the **Items per page** selector to display 6, 12, 24, or 48 books at a time.
   - Use the **Previous** / **Next** buttons to navigate pages.
   - Books show their status: **Available** or **Borrowed**.
6. Use the **Language** dropdown in the header to switch between **English** and **Português (Brasil)**.
7. Click **Logout** in the header to return to the login page.

---

## Mock Data

Because the backend is not yet implemented, the portal uses JSON mock files:

- `src/mocks/users.json` — contains the demo user (`reader / reader`).
- `src/mocks/books.json` — contains 12 sample books.

The mock API functions in `src/api/books.js` return Promises with a small delay (`500ms`) to simulate network latency.

---

## Internationalization (i18n)

The portal supports two locales out of the box:

- `en` — English
- `pt-BR` — Brazilian Portuguese

### How it works

- Translations are stored in `src/i18n/locales/`.
- `src/i18n/index.js` creates the `vue-i18n` instance, detects the browser locale, and persists the user's choice in `localStorage`.
- The `LanguageSwitcher` component in the header lets the user switch languages at runtime.

### Adding a new language

1. Create a new translation file in `src/i18n/locales/`, e.g., `es.json` for Spanish.
2. Import it in `src/i18n/index.js`:

   ```js
   import es from './locales/es.json'
   ```

3. Add it to the `messages` object:

   ```js
   const messages = {
     en,
     'pt-BR': ptBR,
     es
   }
   ```

4. Add the new locale to the `availableLocales` array:

   ```js
   export const availableLocales = [
     { code: 'en', label: 'English', flag: '🇺🇸' },
     { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
     { code: 'es', label: 'Español', flag: '🇪🇸' }
   ]
   ```

The language switcher will show the new option automatically.

---

## Replacing the Mocks with a Real API

The API layer already supports real backend calls. To switch from mock data to the real backend, set `VITE_USE_MOCK_API=false` in the active environment file or use the dedicated backend mode:

```bash
npm run dev:backend
```

The expected backend endpoints are:

| Function | Method | Endpoint | Payload / Response |
|---|---|---|---|
| `authenticate` | `POST` | `/auth/login` | `{ username, password }` → `{ success, user, token }` |
| `fetchBooks` | `GET` | `/books` | Array of books. |
| `fetchBookById` | `GET` | `/books/:id` | Single book or `null` / `404`. |

If the backend host or port changes, update the environment variables instead of the source code:

1. Edit the relevant `.env` file (e.g. `.env` or `.env.backend`).
2. Change `VITE_API_HOST`, `VITE_API_PORT`, or `VITE_API_BASE_URL`.
3. Restart the Vite dev server.

The rest of the application (components, views, store, and router) will continue to work without modification.

---

## Testing

Tests are written with **Vitest** and **@vue/test-utils**. They run in a `jsdom` environment.

```bash
npm test            # Run tests once
npm run test:watch  # Run tests in watch mode
npm run test:ui     # Run tests with the Vitest UI
```

### Test Coverage

- **Auth store** (`tests/unit/stores/auth.spec.js`)
  - Default unauthenticated state.
  - Successful login with `reader / reader`.
  - Failed login with invalid credentials.
  - Persistence to and restoration from `localStorage`.
  - Logout clears the state.

- **Login form** (`tests/unit/components/LoginForm.spec.js`)
  - Renders username and password inputs.
  - Emits credentials on submit.
  - Does not submit when fields are empty.
  - Disables inputs and button during loading.

- **Language switcher** (`tests/unit/components/LanguageSwitcher.spec.js`)
  - Renders language options.
  - Reflects the current locale.

- **Pagination controls** (`tests/unit/components/PaginationControls.spec.js`)
  - Renders page size options.
  - Calculates total pages correctly.
  - Disables previous/next buttons at boundaries.
  - Emits page and page-size changes.

- **Books API** (`tests/unit/api/books.spec.js`)
  - Validates credentials.
  - Rejects invalid credentials.
  - Returns the list of books with expected fields.
  - Returns a book by ID.
  - Returns `null` for unknown IDs.

---

## Demo Credentials

```
Username: reader
Password: reader
```

Any other username/password combination will be rejected by the mock API.

---

## Next Steps / Suggestions

- Connect the real authentication and book endpoints.
- Add book detail page (`/books/:id`).
- Add user role-based permissions (e.g., admin can add/edit books).
- Add a CSS framework such as Tailwind CSS if preferred.
- Add E2E tests with Cypress or Playwright.

---

## License

This is an internal MVP project.

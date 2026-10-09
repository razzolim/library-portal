/**
 * Registry of the tools available in the admin area.
 *
 * Both the admin sidebar and the admin overview cards are rendered from this
 * list. To add a new tool:
 *   1. Create the view in `src/views/admin/`.
 *   2. Register it as a child of `/admin` in `src/router/index.js`.
 *   3. Add an entry here and the matching `admin.tools.<key>` i18n keys.
 *
 * `icon` is an SVG path (24x24 viewBox, stroke-based).
 */
export const adminTools = [
  {
    key: 'resetPassword',
    route: 'admin-reset-password',
    group: 'users',
    icon: 'M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z'
  },
  {
    key: 'addBook',
    route: 'admin-add-book',
    group: 'books',
    icon: 'M12 6.253v13M12 6.253C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
  }
]

export const adminToolGroups = ['users', 'books']

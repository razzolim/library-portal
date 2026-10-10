import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import LoginView from '../views/LoginView.vue'
import LibraryView from '../views/LibraryView.vue'
import BookPdfView from '../views/BookPdfView.vue'
import AccountView from '../views/AccountView.vue'
import ChangeLogView from '../views/ChangeLogView.vue'
import AdminView from '../views/admin/AdminView.vue'
import AdminHomeView from '../views/admin/AdminHomeView.vue'
import AdminUsersView from '../views/admin/AdminUsersView.vue'
import AdminResetPasswordView from '../views/admin/AdminResetPasswordView.vue'
import AdminAddBookView from '../views/admin/AdminAddBookView.vue'
import AdminImportBooksView from '../views/admin/AdminImportBooksView.vue'
import AdminFeatureFlagsView from '../views/admin/AdminFeatureFlagsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true }
    },
    {
      path: '/library',
      name: 'library',
      component: LibraryView,
      meta: { requiresAuth: true }
    },
    {
      path: '/library/:id',
      name: 'book-detail',
      component: LibraryView,
      meta: { requiresAuth: true }
    },
    {
      path: '/library/:id/read',
      name: 'book-read',
      component: BookPdfView,
      meta: { requiresAuth: true }
    },
    {
      path: '/account',
      name: 'account',
      component: AccountView,
      meta: { requiresAuth: true }
    },
    {
      path: '/changelog',
      name: 'changelog',
      component: ChangeLogView,
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      component: AdminView,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin',
          component: AdminHomeView
        },
        {
          path: 'users',
          name: 'admin-users',
          component: AdminUsersView
        },
        {
          path: 'users/reset-password',
          name: 'admin-reset-password',
          component: AdminResetPasswordView
        },
        {
          path: 'books/new',
          name: 'admin-add-book',
          component: AdminAddBookView
        },
        {
          path: 'books/import',
          name: 'admin-import-books',
          component: AdminImportBooksView
        },
        {
          path: 'feature-flags',
          name: 'admin-feature-flags',
          component: AdminFeatureFlagsView
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login'
    }
  ]
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const isAuthenticated = auth.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' }
  }

  // `to.meta` merges the meta of every matched record, so child admin routes
  // inherit `requiresAdmin` from `/admin`.
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'library' }
  }

  if (to.name === 'login' && isAuthenticated) {
    return { name: 'library' }
  }
})

export default router

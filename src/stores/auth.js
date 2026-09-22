import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authenticate, logout as logoutApi } from '../api/books.js'
import { i18n, setLocale } from '../i18n'

const STORAGE_KEY = 'library_portal_auth'
const TRANSFER_KEY = 'library_portal_auth_transfer'

function loadStoredSession() {
  const transfer = localStorage.getItem(TRANSFER_KEY)
  if (transfer) {
    localStorage.removeItem(TRANSFER_KEY)
    sessionStorage.setItem(STORAGE_KEY, transfer)
    return transfer
  }

  const session = sessionStorage.getItem(STORAGE_KEY)
  const persistent = localStorage.getItem(STORAGE_KEY)
  return session || persistent
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const token = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // Initialize from storage on load (session first, then persistent)
  const stored = loadStoredSession()
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      user.value = parsed.user || null
      token.value = parsed.token || null
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(TRANSFER_KEY)
    }
  }

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const username = computed(() => user.value?.fullName || user.value?.username || '')

  // Actions
  async function login(credentials) {
    isLoading.value = true
    error.value = null

    try {
      const result = await authenticate(credentials)

      if (!result.success) {
        error.value = result.errorKey
          ? i18n.global.t(result.errorKey)
          : i18n.global.t('login.invalidCredentials')
        return false
      }

      // A backend may answer `success: true` yet omit the token. Without it the
      // route guard would bounce the user straight back to /login with no
      // explanation, so treat it as a failed login instead.
      const issuedToken = result.token || result.accessToken

      if (!issuedToken) {
        error.value = i18n.global.t('login.missingToken')
        return false
      }

      user.value = result.user
      token.value = issuedToken
      persist(credentials.rememberMe)

      // Apply server-side locale preference
      const userLocale = result.user?.locale
      if (userLocale && ['en', 'pt-BR'].includes(userLocale)) {
        setLocale(userLocale)
      }

      return true
    } catch (err) {
      error.value = i18n.global.t('login.unexpectedError')
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    try {
      await logoutApi()
    } catch (err) {
      // If the backend is unreachable or the session is already invalid,
      // we still must clear the local session.
    }
    user.value = null
    token.value = null
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  }

  function persist(rememberMe = false) {
    const storage = rememberMe ? localStorage : sessionStorage
    const other = rememberMe ? sessionStorage : localStorage

    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: user.value, token: token.value })
    )
    other.removeItem(STORAGE_KEY) // avoid stale tokens in the other storage
  }

  function prepareNewTabAuth() {
    const session = sessionStorage.getItem(STORAGE_KEY)
    if (session && !localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(TRANSFER_KEY, session)
    }
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    username,
    login,
    logout,
    prepareNewTabAuth
  }
})

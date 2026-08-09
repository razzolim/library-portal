import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authenticate, logout as logoutApi } from '../api/books.js'
import { i18n } from '../i18n'

const STORAGE_KEY = 'library_portal_auth'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const token = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // Initialize from localStorage on load
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      user.value = parsed.user || null
      token.value = parsed.token || null
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const username = computed(() => user.value?.username || '')

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

      user.value = result.user
      token.value = result.token
      persist()
      return true
    } catch (err) {
      error.value = i18n.global.t('login.unexpectedError')
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    await logoutApi()
    user.value = null
    token.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: user.value, token: token.value })
    )
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    username,
    login,
    logout
  }
})

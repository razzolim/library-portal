import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../../src/stores/auth.js'
import { setLocale, getCurrentLocale } from '../../../src/i18n'
import * as booksApi from '../../../src/api/books.js'

const STORAGE_KEY = 'library_portal_auth'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setLocale('en')
    localStorage.clear()
    sessionStorage.clear()
  })

  it('is not authenticated by default', () => {
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.username).toBe('')
  })

  it('logs in with valid credentials', async () => {
    const auth = useAuthStore()
    const result = await auth.login({ username: 'reader', password: 'reader' })

    expect(result).toBe(true)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.username).toBe('Demo Reader')
    expect(auth.user.fullName).toBe('Demo Reader')
    expect(auth.error).toBeNull()
  })

  it('applies the user locale after login', async () => {
    const auth = useAuthStore()
    await auth.login({ username: 'reader', password: 'reader' })

    expect(auth.user.locale).toBe('pt-BR')
    expect(getCurrentLocale()).toBe('pt-BR')

    // Reset to English to avoid side effects in later tests
    setLocale('en')
  })

  it('fails to login with invalid credentials', async () => {
    const auth = useAuthStore()
    const result = await auth.login({ username: 'wrong', password: 'wrong' })

    expect(result).toBe(false)
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.error).toBe('Invalid username or password.')
  })

  it('persists login state to localStorage when rememberMe is true', async () => {
    const auth = useAuthStore()
    await auth.login({ username: 'reader', password: 'reader', rememberMe: true })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored.user.username).toBe('reader')
    expect(stored.token).toBeTruthy()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('persists login state to sessionStorage when rememberMe is false', async () => {
    const auth = useAuthStore()
    await auth.login({ username: 'reader', password: 'reader', rememberMe: false })

    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    expect(stored.user.username).toBe('reader')
    expect(stored.token).toBeTruthy()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('loads persisted state from localStorage', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: { id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' },
        token: 'mock-token'
      })
    )

    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.username).toBe('Demo Reader')
  })

  it('loads persisted state from sessionStorage', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: { id: 1, username: 'reader', fullName: 'Demo Reader', role: 'reader' },
        token: 'mock-token'
      })
    )

    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.username).toBe('Demo Reader')
  })

  it('clears state on logout', async () => {
    const auth = useAuthStore()
    await auth.login({ username: 'reader', password: 'reader', rememberMe: true })
    await auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears local state even when the backend logout call fails', async () => {
    vi.spyOn(booksApi, 'logout').mockRejectedValue(new Error('Backend unavailable'))

    const auth = useAuthStore()
    await auth.login({ username: 'reader', password: 'reader' })
    await auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()

    vi.restoreAllMocks()
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../../src/stores/auth.js'
import { setLocale } from '../../../src/i18n'

const STORAGE_KEY = 'library_portal_auth'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setLocale('en')
    localStorage.clear()
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
    expect(auth.username).toBe('reader')
    expect(auth.user.fullName).toBe('Demo Reader')
    expect(auth.error).toBeNull()
  })

  it('fails to login with invalid credentials', async () => {
    const auth = useAuthStore()
    const result = await auth.login({ username: 'wrong', password: 'wrong' })

    expect(result).toBe(false)
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.error).toBe('Invalid username or password.')
  })

  it('persists login state to localStorage', async () => {
    const auth = useAuthStore()
    await auth.login({ username: 'reader', password: 'reader' })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored.user.username).toBe('reader')
    expect(stored.token).toBeTruthy()
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
    expect(auth.username).toBe('reader')
  })

  it('clears state on logout', async () => {
    const auth = useAuthStore()
    await auth.login({ username: 'reader', password: 'reader' })
    await auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

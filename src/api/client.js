import axios from 'axios'

const STORAGE_KEY = 'library_portal_auth'

/**
 * Centralized HTTP client.
 *
 * Base URL, request/response interceptors, and global headers are configured
 * here. The values are read from environment variables so the same build can
 * point to different backends without code changes.
 *
 * Supported variables (all must be prefixed with VITE_ so Vite exposes them):
 *   VITE_API_BASE_URL  - full base URL (e.g. http://localhost:3000/api)
 *   VITE_API_HOST      - backend host (fallback when VITE_API_BASE_URL is not set)
 *   VITE_API_PORT      - backend port (fallback when VITE_API_BASE_URL is not set)
 */
const host = import.meta.env.VITE_API_HOST || 'localhost'
const port = import.meta.env.VITE_API_PORT || '3000'
const baseURL = import.meta.env.VITE_API_BASE_URL || `http://${host}:${port}/api`

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
})

let isRefreshing = false
let refreshSubscribers = []
let authErrorHandler = null
let isHandlingUnauthorized = false

/**
 * Registers a callback that will be invoked whenever a 401 Unauthorized
 * response is received. The callback is responsible for clearing the session
 * and redirecting the user to the login page.
 */
export function setupAuthErrorHandler(handler) {
  authErrorHandler = handler
}

/**
 * Internal helper used by the response interceptor and tests.
 * Triggers the registered handler only for 401 responses and guards
 * against recursive calls while a redirect is in progress.
 */
export async function handleAuthError(error) {
  if (error.response?.status !== 401) return
  if (!authErrorHandler || isHandlingUnauthorized) return

  isHandlingUnauthorized = true
  try {
    await authErrorHandler(error)
  } finally {
    isHandlingUnauthorized = false
  }
}

function getStoredAuth() {
  const session = sessionStorage.getItem(STORAGE_KEY)
  const persistent = localStorage.getItem(STORAGE_KEY)
  const raw = session || persistent
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

function getStoredToken() {
  return getStoredAuth()?.token || null
}

function setStoredToken(token) {
  const session = sessionStorage.getItem(STORAGE_KEY)
  const persistent = localStorage.getItem(STORAGE_KEY)

  if (session) {
    try {
      const parsed = JSON.parse(session)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, token }))
    } catch (e) {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }

  if (persistent) {
    try {
      const parsed = JSON.parse(persistent)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, token }))
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }
}

function onRefreshed(token) {
  refreshSubscribers.forEach((callback) => callback(token, null))
  refreshSubscribers = []
}

function onRefreshFailed(error) {
  refreshSubscribers.forEach((callback) => callback(null, error))
  refreshSubscribers = []
}

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback)
}

async function refreshAccessToken() {
  const { data } = await client.post('/auth/refresh')
  return data.accessToken
}

client.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh'
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token, error) => {
            if (error) {
              reject(error)
              return
            }
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(client(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newToken = await refreshAccessToken()
        setStoredToken(newToken)
        onRefreshed(newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return client(originalRequest)
      } catch (refreshError) {
        onRefreshFailed(refreshError)
        isRefreshing = false
        await handleAuthError({ response: { status: 401 } })
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default client

import axios from 'axios'

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

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('library_portal_auth')
  if (token) {
    try {
      const parsed = JSON.parse(token)
      if (parsed.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`
      }
    } catch (e) {
      // ignore invalid storage
    }
  }
  return config
})

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

client.interceptors.response.use(
  (response) => response,
  (error) => handleAuthError(error).then(() => Promise.reject(error))
)

export default client

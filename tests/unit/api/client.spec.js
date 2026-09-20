import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import client, { setupAuthErrorHandler, handleAuthError } from '../../../src/api/client.js'

const STORAGE_KEY = 'library_portal_auth'

function create401Error(config) {
  return {
    response: { status: 401, data: {} },
    config,
    message: 'Unauthorized'
  }
}

describe('API Client 401 handling', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('does not invoke the handler for non-401 errors', async () => {
    const handler = vi.fn()
    setupAuthErrorHandler(handler)

    await handleAuthError({ response: { status: 500 } })

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not invoke the handler when no handler is registered', async () => {
    setupAuthErrorHandler(null)

    await expect(handleAuthError({ response: { status: 401 } })).resolves.toBeUndefined()
  })

  it('invokes the registered handler on 401 responses', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    setupAuthErrorHandler(handler)

    await handleAuthError({ response: { status: 401 } })

    expect(handler).toHaveBeenCalledOnce()
  })

  it('does not invoke the handler recursively while handling a 401', async () => {
    let callCount = 0
    const handler = vi.fn().mockImplementation(async () => {
      callCount += 1
      if (callCount === 1) {
        await handleAuthError({ response: { status: 401 } })
      }
    })
    setupAuthErrorHandler(handler)

    await handleAuthError({ response: { status: 401 } })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('registers a response interceptor on the axios client', () => {
    expect(client.interceptors.response.handlers.length).toBeGreaterThan(0)
  })
})

describe('Client token storage and refresh', () => {
  let adapterSpy
  const originalAdapter = client.defaults.adapter

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    adapterSpy = vi.fn()
    client.defaults.adapter = adapterSpy
    setupAuthErrorHandler(null)
  })

  afterEach(() => {
    adapterSpy = null
  })

  afterAll(() => {
    client.defaults.adapter = originalAdapter
  })

  it('attaches token from localStorage to requests', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: null, token: 'local-token' }))
    adapterSpy.mockResolvedValue({ data: {} })

    await client.get('/books')

    const lastConfig = adapterSpy.mock.calls[adapterSpy.mock.calls.length - 1][0]
    expect(lastConfig.headers.Authorization).toBe('Bearer local-token')
  })

  it('attaches token from sessionStorage to requests', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ user: null, token: 'session-token' }))
    adapterSpy.mockResolvedValue({ data: {} })

    await client.get('/books')

    const lastConfig = adapterSpy.mock.calls[adapterSpy.mock.calls.length - 1][0]
    expect(lastConfig.headers.Authorization).toBe('Bearer session-token')
  })

  it('refreshes token on 401 and retries the original request', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ user: null, token: 'old-token' }))
    adapterSpy
      .mockRejectedValueOnce(create401Error({ url: '/books', method: 'get', headers: {} }))
      .mockResolvedValueOnce({ data: { accessToken: 'new-token' }, status: 200, headers: {}, config: {} })
      .mockResolvedValueOnce({ data: { id: 1 }, status: 200, headers: {}, config: {} })

    const result = await client.get('/books')

    expect(adapterSpy).toHaveBeenCalledTimes(3)
    expect(adapterSpy.mock.calls[1][0].url).toBe('/auth/refresh')
    expect(adapterSpy.mock.calls[1][0].method).toBe('post')
    expect(adapterSpy.mock.calls[2][0].url).toBe('/books')
    expect(adapterSpy.mock.calls[2][0].headers.Authorization).toBe('Bearer new-token')
    expect(result.data).toEqual({ id: 1 })

    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    expect(stored.token).toBe('new-token')
  })

  it('calls the auth error handler when refresh fails', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ user: null, token: 'old-token' }))
    const handler = vi.fn().mockResolvedValue()
    setupAuthErrorHandler(handler)

    adapterSpy
      .mockRejectedValueOnce(create401Error({ url: '/books', method: 'get', headers: {} }))
      .mockRejectedValueOnce(new Error('Refresh failed'))

    await expect(client.get('/books')).rejects.toThrow('Refresh failed')
    expect(handler).toHaveBeenCalled()
  })
})

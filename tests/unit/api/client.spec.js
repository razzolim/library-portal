import { describe, it, expect, vi, beforeEach } from 'vitest'
import client, { setupAuthErrorHandler, handleAuthError } from '../../../src/api/client.js'

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

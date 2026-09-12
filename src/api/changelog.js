import client from './client.js'
import changelog from '../mocks/changelog.json'

const MOCK_DELAY_MS = 500

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Change log API.
 * Returns a list of change log entries from the mock JSON or from GET /changelog.
 *
 * Each entry is expected to have:
 *   - id: unique identifier
 *   - version: semantic version string
 *   - date: ISO date string (YYYY-MM-DD)
 *   - title: short title
 *   - description: Markdown-formatted description
 */
export async function fetchChangelog() {
  if (USE_MOCK_API) {
    await sleep(MOCK_DELAY_MS)
    return [...changelog]
  }

  const { data } = await client.get('/changelog')
  return data
}

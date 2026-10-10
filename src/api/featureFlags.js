import { fetchFeatureFlags, getMockFeatureFlagValues } from './admin.js'

/**
 * Same switch as src/api/books.js: mocks unless VITE_USE_MOCK_API is exactly 'false'.
 */
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'

/**
 * Feature flag values for the portal: `[{ key, enabled }]`.
 *
 * Reads the existing list endpoint (GET /admin/feature-flags, see
 * `fetchFeatureFlags` in src/api/admin.js), which any signed-in user may call.
 * If it fails (including a 403), the store treats every flag as off.
 *
 * Mock mode answers instantly and reads the admin mock list, so toggles made in
 * the admin area show up right away.
 */
export async function fetchFeatureFlagValues() {
  if (USE_MOCK_API) {
    return getMockFeatureFlagValues()
  }

  const items = await fetchFeatureFlags()
  return items.map(({ key, enabled }) => ({ key, enabled }))
}

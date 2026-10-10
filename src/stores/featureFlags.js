import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchFeatureFlagValues } from '../api/featureFlags.js'

/** Keys of the flags the portal reads. Register new ones here, not as string literals. */
export const FEATURE_FLAGS = Object.freeze({
  PDF_ENHANCED: 'pdf_enhanced'
})

// Mock reads are free and local, so they are never cached: admin toggles show up at once.
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'
const CACHE_MS = USE_MOCK_API ? 0 : 30_000

/**
 * Feature flag values for the current user.
 *
 * Values come from the existing list endpoint (GET /admin/feature-flags), open
 * to any signed-in user.
 * Unknown flags and any failure to load read as OFF, so a broken or missing
 * endpoint falls back to the existing behavior instead of exposing a feature.
 */
export const useFeatureFlagsStore = defineStore('featureFlags', () => {
  const flags = ref({})
  const loadedAt = ref(0)
  let inflight = null

  /**
   * Load the flags unless they were loaded less than 30 s ago. Never rejects:
   * on failure the previous values stay and the next call tries again.
   */
  function ensureLoaded({ force = false } = {}) {
    if (!force && loadedAt.value && Date.now() - loadedAt.value < CACHE_MS) {
      return Promise.resolve()
    }
    if (inflight) {
      return inflight
    }

    inflight = fetchFeatureFlagValues()
      .then((items) => {
        flags.value = Object.fromEntries(items.map((item) => [item.key, item.enabled === true]))
        loadedAt.value = Date.now()
      })
      .catch(() => {})
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  function isEnabled(key) {
    return flags.value[key] === true
  }

  return { flags, ensureLoaded, isEnabled }
})

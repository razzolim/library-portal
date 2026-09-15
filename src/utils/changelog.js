import changelog from '../mocks/changelog.json'

/**
 * Compare two semantic version strings (e.g. "1.2.3").
 * Returns a negative number if a < b, positive if a > b, and 0 if equal.
 */
function compareSemver(a, b) {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)
  const maxLength = Math.max(partsA.length, partsB.length)

  for (let i = 0; i < maxLength; i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0
    if (numA < numB) return -1
    if (numA > numB) return 1
  }

  return 0
}

/**
 * Return the latest semantic version from a list of changelog entries.
 * Falls back to the first entry if parsing fails. Defaults to the mock data.
 */
export function getLatestChangelogVersion(entries = changelog) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null
  }

  const sorted = [...entries].sort((a, b) => compareSemver(b.version, a.version))
  return sorted[0].version
}

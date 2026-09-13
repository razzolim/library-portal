/**
 * Google Drive link utilities.
 *
 * Converts public Drive share/view links into the embeddable `/preview` URL
 * so the file can be displayed without the standard Drive UI or download
 * button.
 *
 * Example:
 *   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   -> https://drive.google.com/file/d/FILE_ID/preview
 */

const DRIVE_FILE_ID_PATTERN = /\/file\/d\/([a-zA-Z0-9_-]+)/

/**
 * Extract a Google Drive file ID from a share/view URL.
 * @param {string} url
 * @returns {string|null}
 */
export function extractDriveFileId(url) {
  if (!url || typeof url !== 'string') {
    return null
  }

  const match = url.match(DRIVE_FILE_ID_PATTERN)
  return match ? match[1] : null
}

/**
 * Convert a Google Drive share/view URL to the embeddable preview URL.
 * Returns null if the URL is invalid or not a Drive file link.
 * @param {string} url
 * @returns {string|null}
 */
export function getDrivePreviewUrl(url) {
  const fileId = extractDriveFileId(url)
  if (!fileId) {
    return null
  }

  return `https://drive.google.com/file/d/${fileId}/preview`
}

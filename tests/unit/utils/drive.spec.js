import { describe, it, expect } from 'vitest'
import { extractDriveFileId, getDrivePreviewUrl } from '../../../src/utils/drive.js'

describe('drive utilities', () => {
  describe('extractDriveFileId', () => {
    it('extracts the file ID from a standard Drive share link', () => {
      const url = 'https://drive.google.com/file/d/1cElC7xqVArPo9jZMWDksRHtIwCxSq-qi/view?usp=drive_link'

      expect(extractDriveFileId(url)).toBe('1cElC7xqVArPo9jZMWDksRHtIwCxSq-qi')
    })

    it('extracts the file ID from a Drive view link', () => {
      const url = 'https://drive.google.com/file/d/ABC123/view'

      expect(extractDriveFileId(url)).toBe('ABC123')
    })

    it('returns null for an invalid URL', () => {
      expect(extractDriveFileId('not-a-url')).toBeNull()
    })

    it('returns null for an empty string', () => {
      expect(extractDriveFileId('')).toBeNull()
    })

    it('returns null for null input', () => {
      expect(extractDriveFileId(null)).toBeNull()
    })
  })

  describe('getDrivePreviewUrl', () => {
    it('converts a share link to a preview URL', () => {
      const url = 'https://drive.google.com/file/d/1cElC7xqVArPo9jZMWDksRHtIwCxSq-qi/view?usp=drive_link'

      expect(getDrivePreviewUrl(url)).toBe(
        'https://drive.google.com/file/d/1cElC7xqVArPo9jZMWDksRHtIwCxSq-qi/preview'
      )
    })

    it('returns null for an invalid URL', () => {
      expect(getDrivePreviewUrl('not-a-url')).toBeNull()
    })

    it('returns null for an empty string', () => {
      expect(getDrivePreviewUrl('')).toBeNull()
    })

    it('returns null for null input', () => {
      expect(getDrivePreviewUrl(null)).toBeNull()
    })
  })
})

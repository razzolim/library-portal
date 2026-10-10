import { describe, it, expect } from 'vitest'
import {
  fetchProgress,
  saveProgress,
  fetchBookmarks,
  addBookmark,
  removeBookmark,
  updateReaderPreferences,
  DEFAULT_READER_PREFERENCES
} from '../../../src/api/reader.js'

describe('reader API (mock mode)', () => {
  it('returns page 1 for a book that was never opened', async () => {
    const progress = await fetchProgress(9001)

    expect(progress).toMatchObject({ bookId: 9001, page: 1, percent: 0, updatedAt: null })
  })

  it('saves progress and reads it back', async () => {
    const saved = await saveProgress(9002, { page: 24, totalPages: 256 })
    expect(saved.success).toBe(true)
    expect(saved.progress.percent).toBe(9.38)

    const progress = await fetchProgress(9002)
    expect(progress.page).toBe(24)
    expect(progress.totalPages).toBe(256)
  })

  it('keeps one bookmark per page, ordered by page', async () => {
    await addBookmark(9003, { page: 30 })
    await addBookmark(9003, { page: 5 })
    const again = await addBookmark(9003, { page: 5, note: 'Intro' })

    expect(again.bookmark.note).toBe('Intro')
    const list = await fetchBookmarks(9003)
    expect(list.map((b) => b.page)).toEqual([5, 30])
  })

  it('removes a bookmark', async () => {
    const { bookmark } = await addBookmark(9004, { page: 2 })

    await removeBookmark(9004, bookmark.id)

    expect(await fetchBookmarks(9004)).toEqual([])
  })

  it('does not share state between books', async () => {
    await addBookmark(9005, { page: 1 })

    expect(await fetchBookmarks(9006)).toEqual([])
  })

  it('echoes preferences merged with the defaults', async () => {
    const result = await updateReaderPreferences({ pageTheme: 'dark' })

    expect(result.readerPreferences).toEqual({ ...DEFAULT_READER_PREFERENCES, pageTheme: 'dark' })
  })
})

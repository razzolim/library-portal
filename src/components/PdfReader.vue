<template>
  <div
    ref="rootRef"
    class="pdf-reader pdf-reader--pdfjs"
    :class="{
      'pdf-reader--compact': isCompact,
      'pdf-reader--chrome-hidden': isCompact && !chromeVisible,
      'pdf-reader--dark': isDarkPage
    }"
    @focusin="showChrome"
  >
    <div class="pdf-reader__top">
      <ReaderBar
        :book="book"
        :can-fullscreen="canFullscreen"
        :is-fullscreen="isFullscreen"
        :show-tools="status === 'ready'"
        :tools-open="sidebarOpen"
        @back="emit('back')"
        @reload="load"
        @fullscreen="toggleFullscreen"
        @close="emit('close')"
        @toggle-tools="toggleSidebar"
        @search="openSearch"
      />
    </div>

    <div class="pdf-reader__main">
      <div v-if="sidebarOpen && isCompact" class="pdf-reader__backdrop" @click="sidebarOpen = false"></div>
      <ReaderSidebar
        v-if="sidebarOpen"
        ref="sidebarRef"
        v-model="sidebarTab"
        class="pdf-reader__sidebar"
        :outline="outline"
        :bookmarks="bookmarks"
        :current-page="page"
        :search-results="searchResults"
        :searched-query="searchedQuery"
        :is-searching="isSearching"
        :bookmark-busy="bookmarkBusy"
        :bookmark-error="bookmarkError"
        @goto="gotoFromSidebar"
        @add-bookmark="addCurrentBookmark"
        @remove-bookmark="removeCurrentBookmark"
        @search="runSearch"
        @close="sidebarOpen = false"
      />

      <main class="pdf-reader__stage">
        <div
          ref="scrollerRef"
          class="pdf-reader__scroller"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend="onTouchEnd"
          @touchcancel="resetTouch"
        >
          <canvas
            ref="canvasRef"
            class="pdf-reader__canvas"
            :class="{ 'pdf-reader__canvas--dark': isDarkPage }"
            :style="canvasStyle"
            role="img"
            :aria-label="$t('reader.pageAria', { page, total })"
          ></canvas>
        </div>

        <p class="pdf-reader__sr" aria-live="polite">
          {{ status === 'ready' ? $t('reader.pageAria', { page, total }) : '' }}
        </p>

        <div v-if="status === 'loading'" class="pdf-reader__status">
          <LoadingSpinner :message="$t('pdfViewer.loading')" />
        </div>

        <div v-if="status === 'error'" class="pdf-reader__status pdf-reader__status--error" role="alert">
          <p class="pdf-reader__error-text">{{ errorMessage }}</p>
          <div class="pdf-reader__error-actions">
            <button type="button" class="pdf-reader__btn pdf-reader__btn--primary" @click="load">
              {{ $t('pdfViewer.retry') }}
            </button>
            <button type="button" class="pdf-reader__btn" @click="emit('back')">
              {{ $t('pdfViewer.back') }}
            </button>
          </div>
        </div>

        <p v-if="toast" class="pdf-reader__toast" role="status">{{ toast }}</p>
      </main>
    </div>

    <div v-if="status === 'ready'" class="pdf-reader__bottom">
      <ReaderControls
        :page="page"
        :total="total"
        :zoom="zoom"
        :zoom-percent="zoomPercent"
        :dark-page="isDarkPage"
        @goto="goToPage"
        @zoom-in="zoomBy(1)"
        @zoom-out="zoomBy(-1)"
        @cycle-fit="cycleFit"
        @toggle-dark="toggleDark"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth.js'
import {
  fetchProgress,
  saveProgress,
  saveProgressOnExit,
  fetchBookmarks,
  addBookmark,
  removeBookmark
} from '../api/reader.js'
import {
  openPdf,
  loadOutline,
  searchPdf,
  computeScale,
  stepZoom,
  clampZoom,
  clampPage
} from '../utils/pdf.js'
import { useFullscreen } from '../composables/useFullscreen.js'
import ReaderBar from './reader/ReaderBar.vue'
import ReaderSidebar from './reader/ReaderSidebar.vue'
import ReaderControls from './reader/ReaderControls.vue'
import LoadingSpinner from './LoadingSpinner.vue'

const SAVE_DELAY_MS = 2500
const CHROME_IDLE_MS = 3500
const TOAST_MS = 4000
const STAGE_PADDING_PX = 16
const COMPACT_QUERY = '(max-width: 720px)'
const SWIPE_MIN_PX = 60
const TAP_MAX_PX = 10

const props = defineProps({
  book: { type: Object, required: true },
  // Absolute URL of the PDF (the backend proxy), already resolved by the view.
  pdfUrl: { type: String, required: true }
})

const emit = defineEmits(['close', 'back'])

const { t, te } = useI18n()
const auth = useAuthStore()

const rootRef = ref(null)
const scrollerRef = ref(null)
const canvasRef = ref(null)
const sidebarRef = ref(null)
const { isFullscreen, canFullscreen, toggleFullscreen } = useFullscreen(rootRef)

// Document
const status = ref('loading') // 'loading' | 'ready' | 'error'
const errorMessage = ref('')
const pdf = shallowRef(null)
const total = ref(1)
const page = ref(1)
const outline = ref([])
const bookmarks = ref([])
let destroyPdf = null
let loadId = 0

// View
const zoom = ref(auth.readerPreferences.zoom)
const zoomPercent = ref(100)
const isDarkPage = ref(auth.readerPreferences.pageTheme === 'dark')
const pinchScale = ref(1)
const sidebarOpen = ref(false)
const sidebarTab = ref('contents')
const isCompact = ref(false)
const chromeVisible = ref(true)
const toast = ref('')

// Search
const searchResults = ref([])
const searchedQuery = ref('')
const isSearching = ref(false)
let searchId = 0

// Bookmarks
const bookmarkBusy = ref(false)
const bookmarkError = ref('')

const canvasStyle = computed(() =>
  pinchScale.value === 1 ? null : { transform: `scale(${pinchScale.value})`, transformOrigin: 'center top' }
)

// ---------------------------------------------------------------- loading

function describeLoadError(err) {
  if (err?.status === 404) return t('reader.noPdf')
  return t('pdfViewer.error')
}

async function load() {
  const id = ++loadId
  status.value = 'loading'
  errorMessage.value = ''
  cleanupDocument()

  try {
    const [opened, progress, saved] = await Promise.all([
      openPdf(props.pdfUrl, auth.token),
      fetchProgress(props.book.id),
      fetchBookmarks(props.book.id)
    ])

    if (id !== loadId) {
      opened.destroy()
      return
    }

    pdf.value = opened.pdf
    destroyPdf = opened.destroy
    total.value = opened.pdf.numPages
    bookmarks.value = saved
    page.value = clampPage(progress.page, total.value)
    lastSavedPage = page.value
    status.value = 'ready'

    if (page.value > 1) {
      showToast(t('reader.resumed', { page: page.value }))
    }

    loadOutline(opened.pdf)
      .then((items) => {
        if (id === loadId) outline.value = items
      })
      .catch(() => {})

    await nextTick()
    await renderPage()
    restartChromeTimer()
  } catch (err) {
    if (id !== loadId) return
    errorMessage.value = describeLoadError(err)
    status.value = 'error'
  }
}

function cleanupDocument() {
  renderToken++
  cancelRender()
  if (destroyPdf) {
    destroyPdf()
    destroyPdf = null
  }
  pdf.value = null
  outline.value = []
  searchResults.value = []
  searchedQuery.value = ''
}

// -------------------------------------------------------------- rendering

let renderTask = null
let renderToken = 0

function cancelRender() {
  if (renderTask) {
    renderTask.cancel()
    renderTask = null
  }
}

async function renderPage() {
  const doc = pdf.value
  const canvas = canvasRef.value
  const scroller = scrollerRef.value
  if (!doc || !canvas || !scroller) return

  const token = ++renderToken
  const previous = renderTask
  if (previous) {
    previous.cancel()
    // The same canvas can't host two renders; wait for the cancelled one to settle.
    await previous.promise.catch(() => {})
  }
  if (token !== renderToken) return

  try {
    const pdfPage = await doc.getPage(page.value)
    if (token !== renderToken) return

    const pad = isCompact.value ? 0 : STAGE_PADDING_PX * 2
    const base = pdfPage.getViewport({ scale: 1 })
    const scale = computeScale(
      zoom.value,
      { width: base.width, height: base.height },
      { width: Math.max(scroller.clientWidth - pad, 100), height: Math.max(scroller.clientHeight - pad, 100) }
    )
    zoomPercent.value = clampZoom(scale * 100)

    const viewport = pdfPage.getViewport({ scale })
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.floor(viewport.width * ratio)
    canvas.height = Math.floor(viewport.height * ratio)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`

    renderTask = pdfPage.render({
      canvas,
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null
    })
    await renderTask.promise
    renderTask = null
    scroller.scrollTop = 0
  } catch (err) {
    if (err?.name === 'RenderingCancelledException' || token !== renderToken) return
    errorMessage.value = t('pdfViewer.error')
    status.value = 'error'
  }
}

watch([page, zoom], () => {
  if (status.value === 'ready') renderPage()
})

// ------------------------------------------------------------- navigation

function goToPage(target) {
  page.value = clampPage(target, total.value)
}

function gotoFromSidebar(target) {
  goToPage(target)
  if (isCompact.value) sidebarOpen.value = false
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function openSearch() {
  sidebarTab.value = 'search'
  sidebarOpen.value = true
  nextTick(() => sidebarRef.value?.focusSearch())
}

// ------------------------------------------------------------------- zoom

function zoomBy(direction) {
  zoom.value = stepZoom(zoomPercent.value, direction)
  auth.setReaderPreferences({ zoom: zoom.value })
}

function cycleFit() {
  zoom.value = zoom.value === 'fit-width' ? 'fit-page' : 'fit-width'
  auth.setReaderPreferences({ zoom: zoom.value })
}

function toggleDark() {
  isDarkPage.value = !isDarkPage.value
  auth.setReaderPreferences({ pageTheme: isDarkPage.value ? 'dark' : 'light' })
}

// -------------------------------------------------------------- bookmarks

function bookmarkMessage(errorKey) {
  return errorKey && te(errorKey) ? t(errorKey) : t('reader.bookmarkError')
}

async function addCurrentBookmark() {
  bookmarkBusy.value = true
  bookmarkError.value = ''
  const result = await addBookmark(props.book.id, { page: page.value })
  bookmarkBusy.value = false

  if (!result.success) {
    bookmarkError.value = bookmarkMessage(result.errorKey)
    return
  }
  if (!bookmarks.value.some((b) => b.id === result.bookmark.id)) {
    bookmarks.value = [...bookmarks.value, result.bookmark].sort((a, b) => a.page - b.page)
  }
}

async function removeCurrentBookmark(bookmark) {
  bookmarkError.value = ''
  const result = await removeBookmark(props.book.id, bookmark.id)
  if (!result.success) {
    bookmarkError.value = bookmarkMessage(result.errorKey)
    return
  }
  bookmarks.value = bookmarks.value.filter((b) => b.id !== bookmark.id)
}

// ----------------------------------------------------------------- search

async function runSearch(query) {
  const id = ++searchId
  const text = query.trim()
  if (!text || !pdf.value) return

  isSearching.value = true
  searchedQuery.value = text
  searchResults.value = []
  try {
    const results = await searchPdf(pdf.value, text, () => id !== searchId)
    if (id === searchId) searchResults.value = results
  } catch (err) {
    if (id === searchId) searchResults.value = []
  } finally {
    if (id === searchId) isSearching.value = false
  }
}

// --------------------------------------------------------------- progress

let lastSavedPage = 0
let saveTimer = null

function clearSaveTimer() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
}

watch(page, () => {
  if (status.value !== 'ready') return
  clearSaveTimer()
  saveTimer = setTimeout(async () => {
    saveTimer = null
    const current = page.value
    const result = await saveProgress(props.book.id, { page: current, totalPages: total.value })
    if (result.success) lastSavedPage = current
  }, SAVE_DELAY_MS)
})

// Last chance to keep the position when the tab is hidden or closed.
function flushProgress() {
  clearSaveTimer()
  if (status.value !== 'ready' || page.value === lastSavedPage) return
  lastSavedPage = page.value
  saveProgressOnExit(props.book.id, { page: page.value, totalPages: total.value }, auth.token)
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden') flushProgress()
}

// ----------------------------------------------------------------- chrome

let chromeTimer = null

function restartChromeTimer() {
  clearTimeout(chromeTimer)
  if (!isCompact.value) return
  chromeTimer = setTimeout(() => {
    const typing = document.activeElement?.tagName === 'INPUT'
    if (!sidebarOpen.value && !typing) chromeVisible.value = false
  }, CHROME_IDLE_MS)
}

function showChrome() {
  chromeVisible.value = true
  restartChromeTimer()
}

function toggleChrome() {
  chromeVisible.value = !chromeVisible.value
  if (chromeVisible.value) restartChromeTimer()
}

function showToast(message) {
  toast.value = message
  setTimeout(() => {
    if (toast.value === message) toast.value = ''
  }, TOAST_MS)
}

// ---------------------------------------------------------------- gestures

let touch = null
let pinch = null

function distance(touches) {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
}

function resetTouch() {
  touch = null
  pinch = null
  pinchScale.value = 1
}

function onTouchStart(event) {
  if (event.touches.length === 2) {
    pinch = { start: distance(event.touches), percent: zoomPercent.value, next: zoomPercent.value }
    touch = null
  } else if (event.touches.length === 1) {
    const point = event.touches[0]
    touch = { x: point.clientX, y: point.clientY, time: Date.now() }
  }
}

function onTouchMove(event) {
  if (pinch && event.touches.length === 2) {
    const next = clampZoom((pinch.percent * distance(event.touches)) / pinch.start)
    pinch.next = next
    pinchScale.value = next / pinch.percent
  }
}

function canSwipe() {
  const scroller = scrollerRef.value
  return scroller && scroller.scrollWidth <= scroller.clientWidth + 1
}

function onTouchEnd(event) {
  if (pinch) {
    if (event.touches.length < 2) {
      const next = pinch.next
      const changed = next !== pinch.percent
      pinch = null
      touch = null
      pinchScale.value = 1
      if (changed) {
        zoom.value = next
        auth.setReaderPreferences({ zoom: next })
      }
    }
    return
  }
  if (!touch) return

  const point = event.changedTouches[0]
  const dx = point.clientX - touch.x
  const dy = point.clientY - touch.y
  const elapsed = Date.now() - touch.time
  touch = null

  if (Math.abs(dx) < TAP_MAX_PX && Math.abs(dy) < TAP_MAX_PX && elapsed < 400) {
    const bounds = scrollerRef.value.getBoundingClientRect()
    const fraction = (point.clientX - bounds.left) / bounds.width
    if (fraction < 0.25) goToPage(page.value - 1)
    else if (fraction > 0.75) goToPage(page.value + 1)
    else toggleChrome()
  } else if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dy) < 50 && canSwipe()) {
    goToPage(page.value + (dx < 0 ? 1 : -1))
  }
}

// ---------------------------------------------------------------- keyboard

function onKeydown(event) {
  showChrome()
  const key = event.key
  const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)

  if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'f' && status.value === 'ready') {
    event.preventDefault()
    openSearch()
    return
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return

  // Esc only dismisses the panel; it never closes the reader.
  if (key === 'Escape' && sidebarOpen.value) {
    sidebarOpen.value = false
    return
  }
  if (inField || status.value !== 'ready') return

  const actions = {
    ArrowLeft: () => goToPage(page.value - 1),
    PageUp: () => goToPage(page.value - 1),
    ArrowRight: () => goToPage(page.value + 1),
    PageDown: () => goToPage(page.value + 1),
    Home: () => goToPage(1),
    End: () => goToPage(total.value),
    '+': () => zoomBy(1),
    '=': () => zoomBy(1),
    '-': () => zoomBy(-1)
  }
  if (actions[key]) {
    event.preventDefault()
    actions[key]()
  }
}

// -------------------------------------------------------------- lifecycle

let mediaQuery = null
let resizeObserver = null
let resizeFrame = null
let wakeLock = null

function onCompactChange(event) {
  isCompact.value = event.matches
  chromeVisible.value = true
  restartChromeTimer()
}

async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen')
  } catch (err) {
    // Refused or unsupported; the screen just follows the device's own timeout.
  }
}

// The browser drops the lock whenever the tab is hidden; take it again on return.
function onVisible() {
  if (document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) requestWakeLock()
}

watch(() => props.book.title, () => {
  document.title = `${props.book.title} · ${t('app.title')}`
})

onMounted(() => {
  document.title = `${props.book.title} · ${t('app.title')}`

  mediaQuery = window.matchMedia?.(COMPACT_QUERY)
  if (mediaQuery) {
    isCompact.value = mediaQuery.matches
    mediaQuery.addEventListener?.('change', onCompactChange)
  }

  document.addEventListener('keydown', onKeydown)
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('visibilitychange', onVisibilityChange)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('pagehide', flushProgress)

  // Fit modes follow the stage size (window resize, side panel, rotation).
  if (typeof ResizeObserver !== 'undefined' && scrollerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        if (status.value === 'ready' && typeof zoom.value === 'string') renderPage()
      })
    })
    resizeObserver.observe(scrollerRef.value)
  }

  requestWakeLock()
  load()
})

function onPointerMove(event) {
  if (event.pointerType === 'mouse') showChrome()
}

onUnmounted(() => {
  flushProgress()
  loadId++
  searchId++
  cleanupDocument()
  clearTimeout(chromeTimer)
  mediaQuery?.removeEventListener?.('change', onCompactChange)
  resizeObserver?.disconnect()
  cancelAnimationFrame(resizeFrame)
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('pagehide', flushProgress)
  wakeLock?.release?.().catch?.(() => {})
})
</script>

<style scoped>
.pdf-reader {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg);
}

.pdf-reader__main {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}

.pdf-reader__sidebar {
  flex: none;
  width: 18rem;
}

.pdf-reader__stage {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background-color: #e2e8f0;
}

.pdf-reader--dark .pdf-reader__stage {
  background-color: #0f172a;
}

.pdf-reader__scroller {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: auto;
  padding: 1rem;
  /* Pinch is handled by the reader itself, so the browser must not zoom the whole page. */
  touch-action: pan-x pan-y;
  overscroll-behavior: contain;
}

.pdf-reader__canvas {
  flex: none;
  margin: auto;
  background-color: var(--color-white);
  box-shadow: var(--shadow-lg);
}

.pdf-reader__canvas--dark {
  filter: invert(1) hue-rotate(180deg);
}

.pdf-reader__status {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  background-color: var(--color-white);
}

.pdf-reader__status--error {
  background-color: var(--color-error-bg);
}

.pdf-reader__error-text {
  margin: 0;
  color: var(--color-error);
}

.pdf-reader__error-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.pdf-reader__btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-white);
  color: var(--color-text);
  font: inherit;
  cursor: pointer;
}

.pdf-reader__btn--primary {
  border-color: var(--color-primary);
  background-color: var(--color-primary);
  color: var(--color-white);
}

.pdf-reader__btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.pdf-reader__toast {
  position: absolute;
  left: 50%;
  bottom: 1rem;
  transform: translateX(-50%);
  max-width: calc(100% - 2rem);
  margin: 0;
  padding: 0.5rem 0.875rem;
  border-radius: var(--radius-md);
  background-color: var(--color-text);
  color: var(--color-white);
  font-size: 0.8125rem;
  box-shadow: var(--shadow-md);
  z-index: 6;
}

.pdf-reader__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* Phones: the page gets the whole screen; bars float over it and fade away while reading. */
.pdf-reader--compact .pdf-reader__top,
.pdf-reader--compact .pdf-reader__bottom {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 20;
  transition: transform 0.2s ease, opacity 0.2s ease;
  box-shadow: var(--shadow-md);
}

.pdf-reader--compact .pdf-reader__top {
  top: 0;
}

.pdf-reader--compact .pdf-reader__bottom {
  bottom: 0;
}

.pdf-reader--compact.pdf-reader--chrome-hidden .pdf-reader__top {
  transform: translateY(-100%);
  opacity: 0;
  pointer-events: none;
}

.pdf-reader--compact.pdf-reader--chrome-hidden .pdf-reader__bottom {
  transform: translateY(100%);
  opacity: 0;
  pointer-events: none;
}

.pdf-reader--compact .pdf-reader__main {
  position: absolute;
  inset: 0;
}

.pdf-reader--compact .pdf-reader__scroller {
  padding: 0;
}

.pdf-reader--compact .pdf-reader__backdrop {
  position: absolute;
  inset: 0;
  z-index: 25;
  background-color: rgba(15, 23, 42, 0.45);
}

.pdf-reader--compact .pdf-reader__sidebar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  width: auto;
  height: 70%;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border-inline-end: none;
  box-shadow: var(--shadow-lg);
  padding-bottom: env(safe-area-inset-bottom);
}

@media (prefers-reduced-motion: reduce) {
  .pdf-reader--compact .pdf-reader__top,
  .pdf-reader--compact .pdf-reader__bottom {
    transition: none;
  }
}
</style>

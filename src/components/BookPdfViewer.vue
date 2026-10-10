<template>
  <div ref="rootRef" class="pdf-reader">
    <ReaderBar
      :book="book"
      :can-fullscreen="canFullscreen"
      :is-fullscreen="isFullscreen"
      @back="emit('back')"
      @reload="reload"
      @fullscreen="toggleFullscreen"
      @close="emit('close')"
    />

    <main class="pdf-reader__body">
      <div v-if="isLoading" class="pdf-reader__status pdf-reader__loading">
        <LoadingSpinner :message="$t('pdfViewer.loading')" />
      </div>

      <div v-if="error" class="pdf-reader__status pdf-reader__status--error" role="alert">
        <p class="pdf-reader__error-text">{{ error }}</p>
        <div class="pdf-reader__error-actions">
          <button type="button" class="pdf-reader__btn pdf-reader__btn--primary" @click="reload">
            {{ $t('pdfViewer.retry') }}
          </button>
          <button type="button" class="pdf-reader__btn" @click="emit('back')">
            {{ $t('pdfViewer.back') }}
          </button>
        </div>
      </div>

      <iframe
        :key="frameKey"
        class="pdf-reader__frame"
        :src="previewUrl"
        :title="$t('pdfViewer.frameTitle', { title: book.title })"
        frameborder="0"
        allowfullscreen
        loading="eager"
        @load="handleLoad"
        @error="handleError"
      ></iframe>
    </main>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ReaderBar from './reader/ReaderBar.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import { useFullscreen } from '../composables/useFullscreen.js'

// An iframe fires `load` even when Drive answers with an error page, so a real
// failure can only be detected when `load` never arrives.
const LOAD_TIMEOUT_MS = 20000

const props = defineProps({
  previewUrl: {
    type: String,
    required: true
  },
  book: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'back'])

const { t } = useI18n()

const rootRef = ref(null)
const isLoading = ref(true)
const error = ref(null)
const frameKey = ref(0)
const { isFullscreen, canFullscreen, toggleFullscreen } = useFullscreen(rootRef)
let loadTimer = null

function clearLoadTimer() {
  if (loadTimer) {
    clearTimeout(loadTimer)
    loadTimer = null
  }
}

function startLoadTimer() {
  clearLoadTimer()
  loadTimer = setTimeout(handleError, LOAD_TIMEOUT_MS)
}

function handleLoad() {
  clearLoadTimer()
  isLoading.value = false
}

function handleError() {
  clearLoadTimer()
  isLoading.value = false
  error.value = t('pdfViewer.error')
}

function reload() {
  error.value = null
  isLoading.value = true
  frameKey.value += 1
  startLoadTimer()
}

// Tabs show the book, not the portal name, so several open books are distinguishable.
function updateDocumentTitle() {
  document.title = `${props.book.title} · ${t('app.title')}`
}

watch(() => props.book.title, updateDocumentTitle)

onMounted(() => {
  updateDocumentTitle()
  startLoadTimer()
})

onUnmounted(() => {
  clearLoadTimer()
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

.pdf-reader__btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.pdf-reader__body {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
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

.pdf-reader__frame {
  flex: 1;
  width: 100%;
  min-height: 0;
  border: none;
  background-color: var(--color-white);
}

</style>

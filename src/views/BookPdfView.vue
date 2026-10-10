<template>
  <div class="book-pdf-view">
    <LoadingSpinner v-if="isLoading" :message="$t('bookDetail.loading')" />

    <div v-else-if="error" class="book-pdf-view__error" role="alert">
      {{ error }}
    </div>

    <template v-else-if="enhanced">
      <!-- Enhanced (flag pdf_enhanced): our own pdf.js viewer, served by the backend PDF proxy. -->
      <PdfReader
        v-if="pdfJsUrl"
        :book="book"
        :pdf-url="pdfJsUrl"
        @back="handleBack"
        @close="handleClose"
      />

      <!-- Enhanced bar around the Google Drive preview (mock mode, or no proxy). -->
      <BookPdfViewer
        v-else-if="previewUrl"
        :preview-url="previewUrl"
        :book="book"
        @back="handleBack"
        @close="handleClose"
      />

      <div v-else class="book-pdf-view__error" role="alert">
        {{ $t('pdfViewer.error') }}
      </div>
    </template>

    <!-- Flag off: the original reader, unchanged. -->
    <BookPdfViewerLegacy
      v-else-if="previewUrl"
      :preview-url="previewUrl"
      @close="handleLegacyClose"
    />

    <div v-else class="book-pdf-view__error" role="alert">
      {{ $t('pdfViewer.error') }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { fetchBookById } from '../api/books.js'
import { getDrivePreviewUrl } from '../utils/drive.js'
import { getPdfJsUrl } from '../utils/pdf.js'
import { useFeatureFlagsStore, FEATURE_FLAGS } from '../stores/featureFlags.js'
import client from '../api/client.js'
import BookPdfViewer from '../components/BookPdfViewer.vue'
import BookPdfViewerLegacy from '../components/BookPdfViewerLegacy.vue'
import PdfReader from '../components/PdfReader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'

// Same switch as the API layer: mocks unless VITE_USE_MOCK_API is exactly 'false'.
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const flags = useFeatureFlagsStore()

const book = ref(null)
const isLoading = ref(false)
const error = ref(null)

const bookId = computed(() => {
  const id = route.params.id
  return id ? Number(id) : null
})

const previewUrl = computed(() => {
  if (!book.value?.pdfUrl) {
    return null
  }
  return getDrivePreviewUrl(book.value.pdfUrl)
})

// Flag pdf_enhanced: reader bar, in-app PDF viewer, progress, bookmarks, phone layout.
const enhanced = computed(() => flags.isEnabled(FEATURE_FLAGS.PDF_ENHANCED))

// In mock mode there is no API host, so relative paths point at the portal's own
// files (e.g. the bundled sample PDF under /samples).
const pdfJsUrl = computed(() =>
  getPdfJsUrl(book.value, {
    useMock: USE_MOCK_API,
    apiBaseUrl: client.defaults.baseURL,
    portalBaseUrl: `${window.location.origin}${import.meta.env.BASE_URL}`
  })
)

function handleBack() {
  router.push({ name: 'book-detail', params: { id: bookId.value } })
}

// The original reader just closes the window.
function handleLegacyClose() {
  window.close()
}

// window.close() is ignored when the tab wasn't opened by the portal (e.g. a
// pasted link), so fall back to the library instead of leaving the button dead.
function handleClose() {
  window.close()
  setTimeout(() => {
    if (!window.closed) {
      router.push({ name: 'library' })
    }
  }, 150)
}

async function loadBook() {
  isLoading.value = true
  error.value = null

  try {
    if (!bookId.value) {
      error.value = t('bookDetail.notFound')
      return
    }

    // Flags are read first-class here: the viewer to show depends on them.
    const [loadedBook] = await Promise.all([fetchBookById(bookId.value), flags.ensureLoaded()])
    book.value = loadedBook
    if (!book.value) {
      error.value = t('bookDetail.notFound')
    } else if (!book.value.pdfUrl) {
      error.value = t('pdfViewer.error')
    }
  } catch (err) {
    error.value = t('bookDetail.error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadBook()
})
</script>

<style scoped>
.book-pdf-view {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg);
}

.book-pdf-view__error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--color-error);
  background-color: var(--color-error-bg);
  text-align: center;
}
</style>

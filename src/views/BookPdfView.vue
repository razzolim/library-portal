<template>
  <div class="book-pdf-view">
    <LoadingSpinner v-if="isLoading" :message="$t('bookDetail.loading')" />

    <div v-else-if="error" class="book-pdf-view__error" role="alert">
      {{ error }}
    </div>

    <!-- Backend PDF proxy: our own viewer (pages, progress, bookmarks, search). -->
    <PdfReader
      v-else-if="pdfJsUrl"
      :book="book"
      :pdf-url="pdfJsUrl"
      @back="handleBack"
      @close="handleClose"
    />

    <!-- Google Drive link: embedded Drive preview. -->
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { fetchBookById } from '../api/books.js'
import { getDrivePreviewUrl } from '../utils/drive.js'
import { resolvePdfUrl } from '../utils/pdf.js'
import client from '../api/client.js'
import BookPdfViewer from '../components/BookPdfViewer.vue'
import PdfReader from '../components/PdfReader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

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

// Anything that is not a Drive link is the backend's PDF proxy (absolute, or
// relative to the API base URL), which our own viewer can read.
const pdfJsUrl = computed(() => {
  if (!book.value?.pdfUrl || previewUrl.value) {
    return null
  }
  return resolvePdfUrl(book.value.pdfUrl, client.defaults.baseURL)
})

function handleBack() {
  router.push({ name: 'book-detail', params: { id: bookId.value } })
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

    book.value = await fetchBookById(bookId.value)
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

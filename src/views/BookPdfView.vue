<template>
  <div class="book-pdf-view">
    <LoadingSpinner v-if="isLoading" :message="$t('bookDetail.loading')" />

    <div v-else-if="error" class="book-pdf-view__error" role="alert">
      {{ error }}
    </div>

    <BookPdfViewer
      v-else-if="previewUrl"
      :preview-url="previewUrl"
      @close="handleClose"
    />

    <div v-else class="book-pdf-view__error" role="alert">
      {{ $t('pdfViewer.error') }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { fetchBookById } from '../api/books.js'
import { getDrivePreviewUrl } from '../utils/drive.js'
import BookPdfViewer from '../components/BookPdfViewer.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const { t } = useI18n()
const route = useRoute()

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

function handleClose() {
  window.close()
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

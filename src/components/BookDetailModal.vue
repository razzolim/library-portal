<template>
  <div class="book-detail-overlay" @click="handleOverlayClick">
    <div class="book-detail-modal" role="dialog" aria-modal="true" aria-labelledby="book-detail-title">
      <button class="book-detail-modal__close" @click="handleClose" :aria-label="$t('bookDetail.close')">
        ×
      </button>

      <div v-if="isLoading" class="book-detail-modal__loading">
        <LoadingSpinner :message="$t('bookDetail.loading')" />
      </div>

      <div v-else-if="error" class="book-detail-modal__error" role="alert">
        {{ error }}
      </div>

      <div v-else-if="book" class="book-detail-modal__content">
        <div class="book-detail-modal__cover" :style="{ backgroundColor: coverColor }">
          <span class="book-detail-modal__initials">{{ initials }}</span>
        </div>
        <div class="book-detail-modal__info">
          <h2 id="book-detail-title" class="book-detail-modal__title">{{ book.title }}</h2>
          <p class="book-detail-modal__author">{{ book.author }}</p>

          <dl class="book-detail-modal__meta">
            <div class="book-detail-modal__meta-item">
              <dt>{{ $t('library.year') }}</dt>
              <dd>{{ book.year }}</dd>
            </div>
            <div class="book-detail-modal__meta-item">
              <dt>{{ $t('library.genre') }}</dt>
              <dd>{{ book.genre }}</dd>
            </div>
            <div class="book-detail-modal__meta-item">
              <dt>{{ $t('library.status') }}</dt>
              <dd>
                <span class="book-detail-modal__status" :class="statusClass">{{ statusLabel }}</span>
              </dd>
            </div>
            <div class="book-detail-modal__meta-item">
              <dt>{{ $t('bookDetail.isbn') }}</dt>
              <dd>{{ book.isbn }}</dd>
            </div>
          </dl>

          <div v-if="book.summary" class="book-detail-modal__summary">
            <h3 class="book-detail-modal__summary-title">{{ $t('bookDetail.summary') }}</h3>
            <p class="book-detail-modal__summary-text">{{ book.summary }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchBookById } from '../api/books.js'
import LoadingSpinner from './LoadingSpinner.vue'

const props = defineProps({
  bookId: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['close'])

const { t } = useI18n()

const book = ref(null)
const isLoading = ref(false)
const error = ref(null)

const coverColor = computed(() => book.value?.coverColor || '#3b82f6')

const initials = computed(() => {
  if (!book.value) return ''
  return book.value.title
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
})

const statusLabel = computed(() => {
  if (!book.value) return ''
  return book.value.status === 'available'
    ? t('library.available')
    : t('library.borrowed')
})

const statusClass = computed(() => {
  if (!book.value) return ''
  return book.value.status === 'available'
    ? 'book-detail-modal__status--available'
    : 'book-detail-modal__status--borrowed'
})

function handleClose() {
  emit('close')
}

function handleOverlayClick(event) {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    handleClose()
  }
}

async function loadBook() {
  isLoading.value = true
  error.value = null

  try {
    const id = typeof props.bookId === 'string' ? parseInt(props.bookId, 10) : props.bookId
    book.value = await fetchBookById(id)
    if (!book.value) {
      error.value = t('bookDetail.notFound')
    }
  } catch (err) {
    error.value = t('bookDetail.error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadBook()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.book-detail-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: rgba(15, 23, 42, 0.6);
  z-index: 100;
}

.book-detail-modal {
  position: relative;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  background-color: var(--color-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.book-detail-modal__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-full);
  background-color: var(--color-muted);
  color: var(--color-text);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  z-index: 10;
  transition: background-color 0.2s ease;
}

.book-detail-modal__close:hover {
  background-color: var(--color-border);
}

.book-detail-modal__loading,
.book-detail-modal__error {
  padding: 3rem;
  text-align: center;
}

.book-detail-modal__error {
  color: var(--color-error);
  background-color: var(--color-error-bg);
  border-radius: var(--radius-lg);
  margin: 1rem;
}

.book-detail-modal__content {
  display: flex;
  flex-direction: column;
}

.book-detail-modal__cover {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-white);
  font-size: 2.5rem;
  font-weight: 700;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.book-detail-modal__info {
  padding: 1.5rem;
}

.book-detail-modal__title {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.3;
}

.book-detail-modal__author {
  margin: 0 0 1.5rem;
  font-size: 1.1rem;
  color: var(--color-text-muted);
}

.book-detail-modal__meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 0;
}

.book-detail-modal__meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.book-detail-modal__meta-item dt {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.book-detail-modal__meta-item dd {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text);
  font-weight: 500;
}

.book-detail-modal__status {
  align-self: flex-start;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 600;
}

.book-detail-modal__status--available {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.book-detail-modal__status--borrowed {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
}

.book-detail-modal__summary {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.book-detail-modal__summary-title {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.book-detail-modal__summary-text {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text);
  line-height: 1.6;
}

@media (max-width: 480px) {
  .book-detail-modal__meta {
    grid-template-columns: 1fr;
  }
}
</style>

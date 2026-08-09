<template>
  <div class="library-view">
    <div class="library-view__container">
      <div class="library-view__intro">
        <h2 class="library-view__title">{{ $t('library.title') }}</h2>
        <p class="library-view__subtitle">{{ $t('library.subtitle') }}</p>
      </div>

      <div class="library-view__toolbar">
        <input
          v-model="searchQuery"
          class="library-view__search"
          type="text"
          :placeholder="$t('library.searchPlaceholder')"
        />
        <span class="library-view__count">
          {{ $t('library.booksCount', { count: filteredBooks.length }) }}
        </span>
      </div>

      <LoadingSpinner v-if="isLoading" :message="$t('library.loading')" />

      <div v-else-if="error" class="library-view__error" role="alert">
        {{ error }}
      </div>

      <div v-else-if="filteredBooks.length === 0" class="library-view__empty">
        <p>{{ $t('library.empty') }}</p>
      </div>

      <template v-else>
        <div class="library-view__grid">
          <BookCard v-for="book in paginatedBooks" :key="book.id" :book="book" />
        </div>

        <PaginationControls
          v-model="itemsPerPage"
          v-model:current-page="currentPage"
          :total-items="filteredBooks.length"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchBooks } from '../api/books.js'
import BookCard from '../components/BookCard.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import PaginationControls from '../components/PaginationControls.vue'

const { t } = useI18n()

const books = ref([])
const isLoading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(12)

const filteredBooks = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return books.value

  return books.value.filter(
    (book) =>
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query)
  )
})

const paginatedBooks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredBooks.value.slice(start, start + itemsPerPage.value)
})

watch(searchQuery, () => {
  currentPage.value = 1
})

async function loadBooks() {
  isLoading.value = true
  error.value = null

  try {
    books.value = await fetchBooks()
  } catch (err) {
    error.value = t('library.error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadBooks()
})
</script>

<style scoped>
.library-view {
  padding: 2rem;
  background-color: var(--color-bg);
  flex: 1;
}

.library-view__container {
  max-width: 1200px;
  margin: 0 auto;
}

.library-view__intro {
  margin-bottom: 1.5rem;
}

.library-view__title {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
}

.library-view__subtitle {
  margin: 0;
  color: var(--color-text-muted);
}

.library-view__toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.library-view__search {
  flex: 1;
  min-width: 240px;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  background-color: var(--color-white);
  color: var(--color-text);
}

.library-view__search:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.library-view__count {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.library-view__error {
  padding: 1rem;
  border-radius: var(--radius-sm);
  background-color: var(--color-error-bg);
  color: var(--color-error);
  margin-bottom: 1rem;
}

.library-view__empty {
  padding: 3rem;
  text-align: center;
  color: var(--color-text-muted);
  background-color: var(--color-white);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.library-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 600px) {
  .library-view {
    padding: 1rem;
  }
}
</style>

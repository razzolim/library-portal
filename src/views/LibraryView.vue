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
        <select v-model="selectedCategory" class="library-view__category" :aria-label="$t('library.categoryFilter')">
          <option value="">{{ $t('library.allCategories') }}</option>
          <option v-for="category in availableCategories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
        <span class="library-view__count">
          {{ $t('library.booksCount', { count: filteredBooks.length }) }}
        </span>

        <div class="library-view__view-toggle" role="group" :aria-label="$t('library.viewMode')">
          <button
            type="button"
            class="library-view__view-btn"
            :class="{ 'library-view__view-btn--active': viewMode === 'grid' }"
            :aria-pressed="viewMode === 'grid'"
            :title="$t('library.gridView')"
            @click="viewMode = 'grid'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            type="button"
            class="library-view__view-btn"
            :class="{ 'library-view__view-btn--active': viewMode === 'list' }"
            :aria-pressed="viewMode === 'list'"
            :title="$t('library.listView')"
            @click="viewMode = 'list'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <LoadingSpinner v-if="isLoading" :message="$t('library.loading')" />

      <div v-else-if="error" class="library-view__error" role="alert">
        {{ error }}
      </div>

      <div v-else-if="filteredBooks.length === 0" class="library-view__empty">
        <p>{{ $t('library.empty') }}</p>
      </div>

      <template v-else>
        <div v-if="viewMode === 'grid'" class="library-view__grid">
          <BookCard v-for="book in paginatedBooks" :key="book.id" :book="book" />
        </div>

        <div v-else class="library-view__list">
          <RouterLink
            v-for="book in paginatedBooks"
            :key="book.id"
            :to="{ name: 'book-detail', params: { id: book.id } }"
            class="book-list-item"
            :aria-label="$t('bookDetail.ariaLabel', { title: book.title })"
          >
            <div class="book-list-item__cover" :style="{ backgroundColor: book.coverColor || '#3b82f6' }">
              <span class="book-list-item__initials">
                {{ book.title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() }}
              </span>
            </div>
            <div class="book-list-item__content">
              <h3 class="book-list-item__title">{{ book.title }}</h3>
              <p class="book-list-item__author">{{ book.author }}</p>
            </div>
            <div class="book-list-item__meta">
              <span class="book-list-item__year">{{ book.year }}</span>
              <span class="book-list-item__genre">{{ book.genre }}</span>
            </div>
            <span
              class="book-list-item__status"
              :class="book.status === 'available' ? 'book-list-item__status--available' : 'book-list-item__status--borrowed'"
            >
              {{ book.status === 'available' ? $t('library.available') : $t('library.borrowed') }}
            </span>
          </RouterLink>
        </div>

        <PaginationControls
          v-model="itemsPerPage"
          v-model:current-page="currentPage"
          :total-items="filteredBooks.length"
        />
      </template>
    </div>

    <BookDetailModal
      v-if="selectedBookId"
      :book-id="selectedBookId"
      @close="handleCloseDetail"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { fetchBooks } from '../api/books.js'
import BookCard from '../components/BookCard.vue'
import BookDetailModal from '../components/BookDetailModal.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import PaginationControls from '../components/PaginationControls.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const books = ref([])
const isLoading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const selectedCategory = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(12)
const viewMode = ref('grid')

const selectedBookId = computed(() => {
  const id = route.params.id
  return id ? Number(id) : null
})

function handleCloseDetail() {
  router.push({ name: 'library' })
}

const availableCategories = computed(() => {
  const categories = new Set(books.value.map((book) => book.genre).filter(Boolean))
  return Array.from(categories).sort()
})

const filteredBooks = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const category = selectedCategory.value

  return books.value.filter((book) => {
    const matchesQuery =
      !query ||
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query)
    const matchesCategory = !category || book.genre === category
    return matchesQuery && matchesCategory
  })
})

const paginatedBooks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredBooks.value.slice(start, start + itemsPerPage.value)
})

watch(searchQuery, () => {
  currentPage.value = 1
})

watch(selectedCategory, () => {
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

.library-view__category {
  min-width: 180px;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  background-color: var(--color-white);
  color: var(--color-text);
}

.library-view__category:focus {
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

.library-view__view-toggle {
  display: flex;
  gap: 0.25rem;
  margin-left: auto;
}

.library-view__view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-white);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.library-view__view-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.library-view__view-btn--active {
  background-color: var(--color-primary-soft);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.library-view__view-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.library-view__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.book-list-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.book-list-item:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  text-decoration: none;
}

.book-list-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.book-list-item__cover {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-white);
  font-size: 1rem;
  font-weight: 700;
}

.book-list-item__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.book-list-item__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-list-item__author {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-list-item__meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.book-list-item__year {
  font-weight: 500;
}

.book-list-item__genre {
  padding: 0.15rem 0.5rem;
  background-color: var(--color-muted);
  border-radius: var(--radius-sm);
}

.book-list-item__status {
  flex-shrink: 0;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 600;
}

.book-list-item__status--available {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.book-list-item__status--borrowed {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
}

@media (max-width: 768px) {
  .book-list-item__meta {
    display: none;
  }
}

@media (max-width: 600px) {
  .library-view {
    padding: 1rem;
  }

  .library-view__view-toggle {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

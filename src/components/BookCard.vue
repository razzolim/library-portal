<template>
  <RouterLink
    :to="{ name: 'book-detail', params: { id: book.id } }"
    class="book-card"
    :aria-label="$t('bookDetail.ariaLabel', { title: book.title })"
  >
    <BookCover :book="book" class="book-card__cover" />
    <div class="book-card__content">
      <h3 class="book-card__title">{{ book.title }}</h3>
      <p class="book-card__author">{{ book.author }}</p>
      <p class="book-card__meta">
        <span v-if="book.year">{{ book.year }}</span>
        <span v-if="book.year && book.genre" aria-hidden="true"> · </span>
        <span v-if="book.genre">{{ book.genre }}</span>
      </p>
      <span class="book-card__status" :class="statusClass">{{ statusLabel }}</span>
    </div>
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BookCover from './BookCover.vue'

const props = defineProps({
  book: {
    type: Object,
    required: true
  }
})

const { t } = useI18n()

const statusLabel = computed(() => {
  return props.book.status === 'available'
    ? t('library.available')
    : t('library.borrowed')
})

const statusClass = computed(() => {
  return props.book.status === 'available'
    ? 'book-card__status--available'
    : 'book-card__status--borrowed'
})
</script>

<style scoped>
/* No card box: the book cover itself is the tile, with its details below */
.book-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  border-radius: var(--radius-sm);
  text-decoration: none;
  cursor: pointer;
}

.book-card:hover {
  text-decoration: none;
}

.book-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
}

.book-card__cover {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.book-card:hover .book-card__cover {
  transform: translateY(-4px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12), 0 16px 24px -14px rgba(0, 0, 0, 0.5);
}

.book-card__content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.book-card__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
}

.book-card:hover .book-card__title {
  color: var(--color-primary);
}

.book-card__author {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-card__meta {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.book-card__status {
  align-self: flex-start;
  margin-top: 0.35rem;
  padding: 0.2rem 0.65rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}

.book-card__status--available {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.book-card__status--borrowed {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
}

@media (prefers-reduced-motion: reduce) {
  .book-card:hover .book-card__cover {
    transform: none;
  }
}
</style>

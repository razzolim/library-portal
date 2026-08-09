<template>
  <article class="book-card">
    <div class="book-card__cover" :style="{ backgroundColor: coverColor }">
      <span class="book-card__initials">{{ initials }}</span>
    </div>
    <div class="book-card__content">
      <h3 class="book-card__title">{{ book.title }}</h3>
      <p class="book-card__author">{{ book.author }}</p>
      <div class="book-card__meta">
        <span class="book-card__year">{{ book.year }}</span>
        <span class="book-card__genre">{{ book.genre }}</span>
      </div>
      <span class="book-card__status" :class="statusClass">{{ statusLabel }}</span>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  book: {
    type: Object,
    required: true
  }
})

const { t } = useI18n()

const coverColor = computed(() => props.book.coverColor || '#3b82f6')

const initials = computed(() => {
  return props.book.title
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
})

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
.book-card {
  display: flex;
  flex-direction: column;
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.book-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.book-card__cover {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-white);
  font-size: 1.75rem;
  font-weight: 700;
}

.book-card__content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.book-card__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
}

.book-card__author {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.book-card__meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.book-card__year {
  font-weight: 500;
}

.book-card__genre {
  padding: 0.15rem 0.5rem;
  background-color: var(--color-muted);
  border-radius: var(--radius-sm);
}

.book-card__status {
  align-self: flex-start;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.book-card__status--available {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.book-card__status--borrowed {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
}
</style>

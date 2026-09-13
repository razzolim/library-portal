<template>
  <div class="change-log">
    <div v-if="isLoading" class="change-log__loading">
      {{ $t('changelog.loading') }}
    </div>
    <div v-else-if="error" class="change-log__error">
      {{ $t('changelog.error') }}
    </div>
    <ul v-else-if="entries.length > 0" class="change-log__list">
      <li v-for="entry in entries" :key="entry.id" class="change-log__entry">
        <div class="change-log__meta">
          <span class="change-log__version">{{ entry.version }}</span>
          <span class="change-log__date">{{ entry.date }}</span>
        </div>
        <h3 class="change-log__title">{{ entry.title }}</h3>
        <div class="change-log__description" v-html="renderMarkdown(entry.description)" />
      </li>
    </ul>
    <div v-else class="change-log__empty">
      {{ $t('changelog.empty') }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchChangelog } from '../api/changelog.js'
import { renderMarkdown } from '../utils/markdown.js'

const entries = ref([])
const isLoading = ref(false)
const error = ref(false)

onMounted(async () => {
  isLoading.value = true
  error.value = false

  try {
    entries.value = await fetchChangelog()
  } catch {
    error.value = true
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.change-log__loading,
.change-log__error,
.change-log__empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--color-text-muted);
  border-radius: var(--radius-md);
  background-color: var(--color-background-soft);
}

.change-log__error {
  color: var(--color-danger);
  background-color: var(--color-danger-soft);
}

.change-log__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.change-log__entry {
  padding: 1.5rem;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.change-log__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.change-log__version {
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 600;
}

.change-log__date {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.change-log__title {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.change-log__description {
  color: var(--color-text);
  line-height: 1.6;
}
</style>

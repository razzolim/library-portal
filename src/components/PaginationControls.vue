<template>
  <div class="pagination">
    <div class="pagination__controls">
      <label class="pagination__per-page" for="items-per-page">
        {{ $t('pagination.itemsPerPage') }}:
        <select
          id="items-per-page"
          :value="modelValue"
          class="pagination__select"
          @change="handleItemsPerPageChange"
        >
          <option v-for="size in pageSizes" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
      </label>

      <span class="pagination__info">
        {{ $t('pagination.showing', { start: rangeStart, end: rangeEnd, total: totalItems }) }}
      </span>
    </div>

    <div class="pagination__actions">
      <button
        class="pagination__button"
        :disabled="currentPage === 1"
        @click="emit('update:currentPage', currentPage - 1)"
      >
        {{ $t('pagination.previous') }}
      </button>

      <span class="pagination__page-info">
        {{ $t('pagination.pageInfo', { current: currentPage, total: totalPages }) }}
      </span>

      <button
        class="pagination__button"
        :disabled="currentPage === totalPages || totalPages === 0"
        @click="emit('update:currentPage', currentPage + 1)"
      >
        {{ $t('pagination.next') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 12
  },
  currentPage: {
    type: Number,
    default: 1
  },
  totalItems: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue', 'update:currentPage'])

const pageSizes = [6, 12, 24, 48]

const totalPages = computed(() => {
  if (props.totalItems === 0) return 0
  return Math.ceil(props.totalItems / props.modelValue)
})

const rangeStart = computed(() => {
  if (props.totalItems === 0) return 0
  return (props.currentPage - 1) * props.modelValue + 1
})

const rangeEnd = computed(() => {
  return Math.min(props.currentPage * props.modelValue, props.totalItems)
})

function handleItemsPerPageChange(event) {
  const value = Number(event.target.value)
  emit('update:modelValue', value)
  emit('update:currentPage', 1)
}
</script>

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.pagination__controls {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.pagination__per-page {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.pagination__select {
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-white);
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
}

.pagination__select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.pagination__info {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.pagination__actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.pagination__button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-white);
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.pagination__button:hover:not(:disabled) {
  background-color: var(--color-muted);
}

.pagination__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination__page-info {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  min-width: 100px;
  text-align: center;
}

@media (max-width: 600px) {
  .pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .pagination__actions {
    justify-content: space-between;
  }
}
</style>

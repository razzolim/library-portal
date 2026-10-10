<template>
  <div class="admin-modal__overlay" @mousedown.self="requestClose">
    <div
      ref="dialogRef"
      class="admin-modal"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @keydown.esc.stop="requestClose"
      @keydown.tab="trapFocus"
    >
      <header class="admin-modal__header">
        <h2 :id="titleId" class="admin-modal__title">{{ title }}</h2>
        <button
          type="button"
          class="admin-modal__close"
          :aria-label="$t('admin.close')"
          :disabled="busy"
          @click="requestClose"
        >
          ×
        </button>
      </header>
      <div class="admin-modal__body">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  // While busy (a request is in flight) the dialog cannot be dismissed.
  busy: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

const titleId = `admin-modal-title-${Math.random().toString(36).slice(2, 8)}`
const dialogRef = ref(null)
let previouslyFocused = null

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'

function requestClose() {
  if (!props.busy) emit('close')
}

function trapFocus(event) {
  const items = [...dialogRef.value.querySelectorAll(FOCUSABLE)]
  if (items.length === 0) return
  const first = items[0]
  const last = items[items.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement
  // Prefer the first form field; fall back to the first action button.
  const target = dialogRef.value.querySelector('.admin-modal__body input, .admin-modal__body button')
  ;(target || dialogRef.value).focus()
})

onBeforeUnmount(() => {
  previouslyFocused?.focus?.()
})
</script>

<style scoped>
.admin-modal__overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: rgba(15, 23, 42, 0.5);
}

.admin-modal {
  width: 100%;
  max-width: 28rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  background-color: var(--color-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.admin-modal:focus {
  outline: none;
}

.admin-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem 0;
}

.admin-modal__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
}

.admin-modal__close {
  width: 2rem;
  height: 2rem;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--color-text-muted);
  background: none;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
}

.admin-modal__close:hover:not(:disabled) {
  color: var(--color-text);
  background-color: var(--color-muted);
}

.admin-modal__close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-modal__body {
  padding: 1rem 1.5rem 1.5rem;
}
</style>

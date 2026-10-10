<template>
  <header class="pdf-reader__bar">
    <button
      type="button"
      class="pdf-reader__icon-btn pdf-reader__back"
      :aria-label="$t('pdfViewer.back')"
      :title="$t('pdfViewer.back')"
      @click="emit('back')"
    >
      <span aria-hidden="true">←</span>
    </button>

    <BookCover class="pdf-reader__cover" :book="book" size="sm" />

    <div class="pdf-reader__heading">
      <h1 class="pdf-reader__title">{{ book.title }}</h1>
      <p class="pdf-reader__author">{{ book.author }}</p>
    </div>

    <div class="pdf-reader__actions">
      <template v-if="showTools">
        <button
          type="button"
          class="pdf-reader__icon-btn"
          :class="{ 'pdf-reader__icon-btn--active': toolsOpen }"
          :aria-label="$t('reader.panel')"
          :title="$t('reader.panel')"
          :aria-pressed="toolsOpen"
          @click="emit('toggle-tools')"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <button
          type="button"
          class="pdf-reader__icon-btn"
          :aria-label="$t('reader.search')"
          :title="$t('reader.search')"
          @click="emit('search')"
        >
          <span aria-hidden="true">⌕</span>
        </button>
      </template>
      <button
        type="button"
        class="pdf-reader__icon-btn"
        :aria-label="$t('pdfViewer.reload')"
        :title="$t('pdfViewer.reload')"
        @click="emit('reload')"
      >
        <span aria-hidden="true">↻</span>
      </button>
      <button
        v-if="canFullscreen"
        type="button"
        class="pdf-reader__icon-btn"
        :aria-label="fullscreenLabel"
        :title="fullscreenLabel"
        :aria-pressed="isFullscreen"
        @click="emit('fullscreen')"
      >
        <span aria-hidden="true">{{ isFullscreen ? '⤡' : '⛶' }}</span>
      </button>
      <button
        type="button"
        class="pdf-reader__icon-btn pdf-reader__close"
        :aria-label="$t('pdfViewer.close')"
        :title="$t('pdfViewer.close')"
        @click="emit('close')"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BookCover from '../BookCover.vue'

const props = defineProps({
  book: { type: Object, required: true },
  canFullscreen: { type: Boolean, default: false },
  isFullscreen: { type: Boolean, default: false },
  showTools: { type: Boolean, default: false },
  toolsOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['back', 'reload', 'fullscreen', 'close', 'toggle-tools', 'search'])

const { t } = useI18n()

const fullscreenLabel = computed(() =>
  props.isFullscreen ? t('pdfViewer.exitFullscreen') : t('pdfViewer.fullscreen')
)
</script>

<style scoped>
.pdf-reader__bar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.25rem;
  padding: 0.375rem 0.75rem;
  padding-top: max(0.375rem, env(safe-area-inset-top));
  background-color: var(--color-white);
  border-bottom: 1px solid var(--color-border);
}

.pdf-reader__cover {
  flex: none;
  width: 1.75rem;
}

.pdf-reader__heading {
  flex: 1;
  min-width: 0;
}

.pdf-reader__title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pdf-reader__author {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.25;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pdf-reader__actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.pdf-reader__icon-btn {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.pdf-reader__icon-btn:hover {
  background-color: var(--color-muted);
}

.pdf-reader__icon-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.pdf-reader__icon-btn--active {
  background-color: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

@media (max-width: 480px) {
  .pdf-reader__author,
  .pdf-reader__cover {
    display: none;
  }
}
</style>

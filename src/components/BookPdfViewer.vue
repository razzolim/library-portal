<template>
  <div class="pdf-viewer-overlay" @click="handleOverlayClick">
    <div class="pdf-viewer" role="dialog" aria-modal="true" :aria-label="$t('pdfViewer.title')">
      <button
        class="pdf-viewer__close"
        @click="handleClose"
        :aria-label="$t('pdfViewer.close')"
      >
        ×
      </button>

      <div
        v-if="isLoading || error"
        class="pdf-viewer__overlay"
        :class="{ 'pdf-viewer__overlay--error': error }"
      >
        <div v-if="isLoading" class="pdf-viewer__loading">
          <LoadingSpinner :message="$t('pdfViewer.loading')" />
        </div>

        <div v-if="error" class="pdf-viewer__error" role="alert">
          {{ error }}
        </div>
      </div>

      <iframe
        ref="iframeRef"
        class="pdf-viewer__frame"
        :src="previewUrl"
        :title="$t('pdfViewer.title')"
        frameborder="0"
        allowfullscreen
        loading="eager"
        @load="handleLoad"
        @error="handleError"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import LoadingSpinner from './LoadingSpinner.vue'

const props = defineProps({
  previewUrl: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

const { t } = useI18n()

const isLoading = ref(true)
const error = ref(null)
const iframeRef = ref(null)

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

function handleLoad() {
  isLoading.value = false
}

function handleError() {
  isLoading.value = false
  error.value = t('pdfViewer.error')
}

function handleContextMenu(event) {
  event.preventDefault()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('contextmenu', handleContextMenu, { capture: true })
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('contextmenu', handleContextMenu, { capture: true })
})
</script>

<style scoped>
.pdf-viewer-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background-color: rgba(15, 23, 42, 0.85);
  z-index: 200;
}

.pdf-viewer {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pdf-viewer__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-full);
  background-color: var(--color-white);
  color: var(--color-text);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  z-index: 10;
  box-shadow: var(--shadow-md);
  transition: background-color 0.2s ease;
}

.pdf-viewer__close:hover {
  background-color: var(--color-muted);
}

.pdf-viewer__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
  background-color: var(--color-white);
  padding: 2rem;
  text-align: center;
}

.pdf-viewer__overlay--error {
  background-color: var(--color-error-bg);
}

.pdf-viewer__loading {
  color: var(--color-text);
}

.pdf-viewer__error {
  color: var(--color-error);
}

.pdf-viewer__frame {
  flex: 1;
  width: 100%;
  border: none;
  background-color: var(--color-white);
}
</style>

<template>
  <footer class="reader-controls">
    <div class="reader-controls__progress" aria-hidden="true">
      <div class="reader-controls__progress-fill" :style="{ width: `${percent}%` }"></div>
    </div>

    <div class="reader-controls__row">
      <button
        type="button"
        class="reader-controls__btn"
        :disabled="page <= 1"
        :aria-label="$t('reader.previousPage')"
        :title="$t('reader.previousPage')"
        @click="emit('goto', page - 1)"
      >
        <span aria-hidden="true">‹</span>
      </button>

      <form class="reader-controls__page" @submit.prevent="submitPage">
        <label class="reader-controls__sr" for="reader-page-input">{{ $t('reader.goToPage') }}</label>
        <input
          id="reader-page-input"
          v-model="draft"
          class="reader-controls__input"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          @focus="$event.target.select()"
          @blur="resetDraft"
        />
        <span class="reader-controls__total">{{ $t('reader.pageOf', { total }) }}</span>
      </form>

      <button
        type="button"
        class="reader-controls__btn"
        :disabled="page >= total"
        :aria-label="$t('reader.nextPage')"
        :title="$t('reader.nextPage')"
        @click="emit('goto', page + 1)"
      >
        <span aria-hidden="true">›</span>
      </button>

      <input
        class="reader-controls__slider"
        type="range"
        min="1"
        :max="total"
        :value="page"
        :aria-label="$t('reader.goToPage')"
        @change="emit('goto', Number($event.target.value))"
        @input="draft = $event.target.value"
      />

      <span class="reader-controls__status" aria-live="off">
        {{ $t('reader.percentRead', { percent }) }}<template v-if="timeLabel"> · {{ timeLabel }}</template>
      </span>

      <div class="reader-controls__group">
        <button
          type="button"
          class="reader-controls__btn"
          :aria-label="$t('reader.zoomOut')"
          :title="$t('reader.zoomOut')"
          @click="emit('zoom-out')"
        >
          <span aria-hidden="true">−</span>
        </button>
        <button
          type="button"
          class="reader-controls__zoom"
          :title="$t('reader.cycleFit')"
          :aria-label="$t('reader.cycleFit')"
          @click="emit('cycle-fit')"
        >
          {{ zoomLabel }}
        </button>
        <button
          type="button"
          class="reader-controls__btn"
          :aria-label="$t('reader.zoomIn')"
          :title="$t('reader.zoomIn')"
          @click="emit('zoom-in')"
        >
          <span aria-hidden="true">+</span>
        </button>
        <button
          type="button"
          class="reader-controls__btn"
          :class="{ 'reader-controls__btn--active': darkPage }"
          :aria-pressed="darkPage"
          :aria-label="darkPage ? $t('reader.lightPage') : $t('reader.darkPage')"
          :title="darkPage ? $t('reader.lightPage') : $t('reader.darkPage')"
          @click="emit('toggle-dark')"
        >
          <span aria-hidden="true">◐</span>
        </button>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { clampPage, percentRead, estimateTimeLeft, isNumericZoom } from '../../utils/pdf.js'

const props = defineProps({
  page: { type: Number, required: true },
  total: { type: Number, required: true },
  zoom: { type: [String, Number], required: true },
  zoomPercent: { type: Number, default: 100 },
  darkPage: { type: Boolean, default: false }
})

const emit = defineEmits(['goto', 'zoom-in', 'zoom-out', 'cycle-fit', 'toggle-dark'])

const { t } = useI18n()

const draft = ref(String(props.page))

const percent = computed(() => percentRead(props.page, props.total))

const timeLabel = computed(() => {
  const left = estimateTimeLeft(props.page, props.total)
  if (!left) return ''
  const time = left.hours
    ? t('reader.hoursMinutes', { hours: left.hours, minutes: left.minutes })
    : t('reader.minutes', { minutes: left.minutes })
  return t('reader.timeLeft', { time })
})

const zoomLabel = computed(() => {
  if (props.zoom === 'fit-width') return t('reader.fitWidth')
  if (props.zoom === 'fit-page') return t('reader.fitPage')
  return `${isNumericZoom(props.zoom) ? Math.round(props.zoom) : props.zoomPercent}%`
})

watch(() => props.page, (page) => {
  draft.value = String(page)
})

function resetDraft() {
  draft.value = String(props.page)
}

function submitPage() {
  emit('goto', clampPage(draft.value, props.total))
  document.activeElement?.blur?.()
}
</script>

<style scoped>
.reader-controls {
  flex: none;
  background-color: var(--color-white);
  border-top: 1px solid var(--color-border);
  padding-bottom: env(safe-area-inset-bottom);
}

.reader-controls__progress {
  height: 3px;
  background-color: var(--color-border);
}

.reader-controls__progress-fill {
  height: 100%;
  background-color: var(--color-primary);
  transition: width 0.2s ease;
}

.reader-controls__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
}

.reader-controls__group {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.reader-controls__btn,
.reader-controls__zoom {
  min-width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md);
  background: none;
  color: var(--color-text);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}

.reader-controls__zoom {
  padding: 0 0.5rem;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  min-width: 4.5rem;
}

.reader-controls__btn:hover:not(:disabled),
.reader-controls__zoom:hover {
  background-color: var(--color-muted);
}

.reader-controls__btn:disabled {
  color: var(--color-border);
  cursor: default;
}

.reader-controls__btn--active {
  background-color: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.reader-controls__page {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.reader-controls__input {
  width: 3.25rem;
  padding: 0.3125rem 0.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  text-align: center;
  font: inherit;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
  background-color: var(--color-white);
}

.reader-controls__slider {
  flex: 1;
  min-width: 4rem;
  accent-color: var(--color-primary);
}

.reader-controls__status {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.reader-controls__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.reader-controls button:focus-visible,
.reader-controls input:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Phones: two rows. Page turning and the slider on top, zoom and theme below. */
@media (max-width: 720px) {
  .reader-controls__row {
    flex-wrap: wrap;
    row-gap: 0.25rem;
  }

  .reader-controls__slider {
    order: 5;
    flex-basis: 100%;
  }

  .reader-controls__status {
    order: 3;
    flex: 1;
    text-align: end;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .reader-controls__group {
    order: 6;
    flex: 1;
    justify-content: center;
  }
}
</style>

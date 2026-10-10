<template>
  <aside class="reader-side" :aria-label="$t('reader.panel')">
    <div class="reader-side__head">
      <div class="reader-side__tabs" role="tablist" :aria-label="$t('reader.panel')">
        <button
          v-for="tab in tabs"
          :id="`reader-tab-${tab}`"
          :key="tab"
          type="button"
          role="tab"
          class="reader-side__tab"
          :class="{ 'reader-side__tab--active': modelValue === tab }"
          :aria-selected="modelValue === tab"
          :aria-controls="`reader-panel-${tab}`"
          @click="emit('update:modelValue', tab)"
        >
          {{ $t(`reader.${tab}`) }}
        </button>
      </div>
      <button
        type="button"
        class="reader-side__close"
        :aria-label="$t('reader.closePanel')"
        :title="$t('reader.closePanel')"
        @click="emit('close')"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>

    <div
      :id="`reader-panel-${modelValue}`"
      class="reader-side__body"
      role="tabpanel"
      :aria-labelledby="`reader-tab-${modelValue}`"
    >
      <!-- Contents -->
      <template v-if="modelValue === 'contents'">
        <p v-if="!outline.length" class="reader-side__empty">{{ $t('reader.noContents') }}</p>
        <ul v-else class="reader-side__list">
          <li v-for="(item, index) in outline" :key="index">
            <button
              type="button"
              class="reader-side__item"
              :class="{ 'reader-side__item--current': isCurrentChapter(index) }"
              :style="{ paddingInlineStart: `${0.5 + item.depth * 0.75}rem` }"
              :aria-current="isCurrentChapter(index) ? 'true' : undefined"
              @click="emit('goto', item.page)"
            >
              <span class="reader-side__item-title">{{ item.title }}</span>
              <span class="reader-side__item-page">{{ item.page }}</span>
            </button>
          </li>
        </ul>
      </template>

      <!-- Bookmarks -->
      <template v-else-if="modelValue === 'bookmarks'">
        <button
          type="button"
          class="reader-side__action"
          :disabled="isBookmarked || bookmarkBusy"
          @click="emit('add-bookmark')"
        >
          {{
            isBookmarked
              ? $t('reader.pageBookmarked', { page: currentPage })
              : $t('reader.bookmarkPage', { page: currentPage })
          }}
        </button>
        <p v-if="bookmarkError" class="reader-side__error" role="alert">{{ bookmarkError }}</p>
        <p v-if="!bookmarks.length" class="reader-side__empty">{{ $t('reader.noBookmarks') }}</p>
        <ul v-else class="reader-side__list">
          <li v-for="bookmark in bookmarks" :key="bookmark.id" class="reader-side__row">
            <button
              type="button"
              class="reader-side__item"
              :class="{ 'reader-side__item--current': bookmark.page === currentPage }"
              @click="emit('goto', bookmark.page)"
            >
              <span class="reader-side__item-title">
                {{ bookmark.note || $t('reader.pageLabel', { page: bookmark.page }) }}
              </span>
              <span class="reader-side__item-page">{{ bookmark.page }}</span>
            </button>
            <button
              type="button"
              class="reader-side__remove"
              :aria-label="$t('reader.removeBookmark', { page: bookmark.page })"
              :title="$t('reader.removeBookmark', { page: bookmark.page })"
              @click="emit('remove-bookmark', bookmark)"
            >
              <span aria-hidden="true">×</span>
            </button>
          </li>
        </ul>
      </template>

      <!-- Search -->
      <template v-else>
        <form class="reader-side__search" role="search" @submit.prevent="submitSearch">
          <label class="reader-side__sr" for="reader-search-input">{{ $t('reader.searchLabel') }}</label>
          <input
            id="reader-search-input"
            ref="searchInput"
            v-model="query"
            type="search"
            class="reader-side__input"
            :placeholder="$t('reader.searchPlaceholder')"
            autocomplete="off"
          />
          <button type="submit" class="reader-side__action" :disabled="!query.trim() || isSearching">
            {{ $t('reader.searchButton') }}
          </button>
        </form>
        <p v-if="isSearching" class="reader-side__empty" role="status">{{ $t('reader.searching') }}</p>
        <p v-else-if="searchedQuery && !searchResults.length" class="reader-side__empty" role="status">
          {{ $t('reader.noResults', { query: searchedQuery }) }}
        </p>
        <ul v-if="searchResults.length" class="reader-side__list">
          <li v-for="result in searchResults" :key="result.page">
            <button type="button" class="reader-side__item reader-side__item--stack" @click="emit('goto', result.page)">
              <span class="reader-side__item-page reader-side__item-page--lead">
                {{ $t('reader.pageLabel', { page: result.page }) }}
              </span>
              <span class="reader-side__snippet">{{ result.snippet }}</span>
            </button>
          </li>
        </ul>
      </template>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: 'contents' },
  outline: { type: Array, default: () => [] },
  bookmarks: { type: Array, default: () => [] },
  currentPage: { type: Number, default: 1 },
  searchResults: { type: Array, default: () => [] },
  searchedQuery: { type: String, default: '' },
  isSearching: { type: Boolean, default: false },
  bookmarkBusy: { type: Boolean, default: false },
  bookmarkError: { type: String, default: '' }
})

const emit = defineEmits([
  'update:modelValue',
  'goto',
  'add-bookmark',
  'remove-bookmark',
  'search',
  'close'
])

const tabs = ['contents', 'bookmarks', 'search']
const query = ref(props.searchedQuery)
const searchInput = ref(null)

const isBookmarked = computed(() => props.bookmarks.some((b) => b.page === props.currentPage))

// The chapter being read is the last entry that starts at or before the current page.
const currentChapterIndex = computed(() => {
  let found = -1
  props.outline.forEach((item, index) => {
    if (item.page <= props.currentPage) found = index
  })
  return found
})

function isCurrentChapter(index) {
  return index === currentChapterIndex.value
}

function submitSearch() {
  emit('search', query.value)
}

function focusSearch() {
  nextTick(() => searchInput.value?.focus())
}

watch(
  () => props.modelValue,
  (tab) => {
    if (tab === 'search') focusSearch()
  }
)

defineExpose({ focusSearch })
</script>

<style scoped>
.reader-side {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background-color: var(--color-white);
  border-inline-end: 1px solid var(--color-border);
}

.reader-side__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.reader-side__tabs {
  flex: 1;
  display: flex;
  gap: 0.25rem;
  min-width: 0;
}

.reader-side__tab {
  padding: 0.5rem 0.625rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.reader-side__tab--active {
  color: var(--color-primary-dark);
  border-bottom-color: var(--color-primary);
}

.reader-side__close,
.reader-side__remove {
  width: 2rem;
  height: 2rem;
  flex: none;
  border: none;
  border-radius: var(--radius-md);
  background: none;
  color: var(--color-text-muted);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}

.reader-side__close:hover,
.reader-side__remove:hover {
  background-color: var(--color-muted);
  color: var(--color-text);
}

.reader-side__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.reader-side__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.reader-side__row {
  display: flex;
  align-items: center;
}

.reader-side__item {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text);
  font: inherit;
  font-size: 0.875rem;
  text-align: start;
  cursor: pointer;
}

.reader-side__item:hover {
  background-color: var(--color-muted);
}

.reader-side__item--current {
  background-color: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.reader-side__item--stack {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
}

.reader-side__item-title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.reader-side__item-page {
  flex: none;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.reader-side__item-page--lead {
  font-weight: 600;
}

.reader-side__snippet {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}

.reader-side__empty {
  margin: 0;
  padding: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.reader-side__error {
  margin: 0;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  background-color: var(--color-error-bg);
  color: var(--color-error);
  font-size: 0.8125rem;
}

.reader-side__action {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-white);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}

.reader-side__action:disabled {
  border-color: var(--color-border);
  background-color: var(--color-muted);
  color: var(--color-text-muted);
  cursor: default;
}

.reader-side__search {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.reader-side__input {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font: inherit;
  font-size: 1rem; /* 16px keeps iOS from zooming on focus */
  color: var(--color-text);
  background-color: var(--color-white);
}

.reader-side__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.reader-side button:focus-visible,
.reader-side input:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>

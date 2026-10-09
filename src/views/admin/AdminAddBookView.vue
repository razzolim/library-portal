<template>
  <div class="admin-add-book">
    <div class="admin-tool__header">
      <h2 class="admin-tool__title">{{ $t('admin.tools.addBook.title') }}</h2>
      <p class="admin-tool__description">{{ $t('admin.tools.addBook.description') }}</p>
    </div>

    <form class="admin-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="createdBook" class="admin-form__alert admin-form__alert--success" role="status">
        <strong>{{ $t('admin.books.success', { title: createdBook.title }) }}</strong>
        <div class="admin-form__alert-actions">
          <RouterLink
            :to="{ name: 'book-detail', params: { id: createdBook.id } }"
            class="admin-form__btn admin-form__btn--link"
          >
            {{ $t('admin.books.viewBook') }}
          </RouterLink>
        </div>
      </div>
      <div v-if="requestError" class="admin-form__alert admin-form__alert--error" role="alert">
        {{ requestError }}
      </div>

      <div class="admin-form__grid">
        <div class="admin-form__field admin-form__field--full">
          <label class="admin-form__label" for="admin-book-title">
            {{ $t('admin.books.fields.title') }}<span class="admin-form__required" aria-hidden="true">*</span>
          </label>
          <input
            id="admin-book-title"
            ref="titleInput"
            v-model.trim="form.title"
            type="text"
            class="admin-form__input"
            :class="{ 'admin-form__input--error': fieldErrors.title }"
            :placeholder="$t('admin.books.placeholders.title')"
            :aria-invalid="!!fieldErrors.title"
            :disabled="saving"
            @input="clearError('title')"
          />
          <span v-if="fieldErrors.title" class="admin-form__field-error">{{ fieldErrors.title }}</span>
        </div>

        <div class="admin-form__field admin-form__field--full">
          <label class="admin-form__label" for="admin-book-author">
            {{ $t('admin.books.fields.author') }}<span class="admin-form__required" aria-hidden="true">*</span>
          </label>
          <input
            id="admin-book-author"
            v-model.trim="form.author"
            type="text"
            class="admin-form__input"
            :class="{ 'admin-form__input--error': fieldErrors.author }"
            :placeholder="$t('admin.books.placeholders.author')"
            :aria-invalid="!!fieldErrors.author"
            :disabled="saving"
            @input="clearError('author')"
          />
          <span v-if="fieldErrors.author" class="admin-form__field-error">{{ fieldErrors.author }}</span>
        </div>

        <div class="admin-form__field">
          <label class="admin-form__label" for="admin-book-genre">
            {{ $t('admin.books.fields.genre') }}<span class="admin-form__optional">{{ $t('admin.optional') }}</span>
          </label>
          <input
            id="admin-book-genre"
            v-model.trim="form.genre"
            type="text"
            list="admin-book-genres"
            class="admin-form__input"
            :placeholder="$t('admin.books.placeholders.genre')"
            :disabled="saving"
          />
          <datalist id="admin-book-genres">
            <option v-for="genre in existingGenres" :key="genre" :value="genre" />
          </datalist>
          <span class="admin-form__hint">{{ $t('admin.books.hints.genre') }}</span>
        </div>

        <div class="admin-form__field">
          <label class="admin-form__label" for="admin-book-year">
            {{ $t('admin.books.fields.year') }}<span class="admin-form__optional">{{ $t('admin.optional') }}</span>
          </label>
          <input
            id="admin-book-year"
            v-model="form.year"
            type="number"
            inputmode="numeric"
            min="0"
            :max="maxYear"
            class="admin-form__input"
            :class="{ 'admin-form__input--error': fieldErrors.year }"
            :placeholder="String(maxYear - 1)"
            :aria-invalid="!!fieldErrors.year"
            :disabled="saving"
            @input="clearError('year')"
          />
          <span v-if="fieldErrors.year" class="admin-form__field-error">{{ fieldErrors.year }}</span>
        </div>

        <div class="admin-form__field">
          <label class="admin-form__label" for="admin-book-isbn">
            {{ $t('admin.books.fields.isbn') }}<span class="admin-form__optional">{{ $t('admin.optional') }}</span>
          </label>
          <input
            id="admin-book-isbn"
            v-model.trim="form.isbn"
            type="text"
            class="admin-form__input"
            :class="{ 'admin-form__input--error': fieldErrors.isbn }"
            placeholder="978-0-00-000000-0"
            :aria-invalid="!!fieldErrors.isbn"
            :disabled="saving"
            @input="clearError('isbn')"
          />
          <span v-if="fieldErrors.isbn" class="admin-form__field-error">{{ fieldErrors.isbn }}</span>
        </div>

        <div class="admin-form__field">
          <label class="admin-form__label" for="admin-book-status">
            {{ $t('admin.books.fields.status') }}<span class="admin-form__required" aria-hidden="true">*</span>
          </label>
          <select
            id="admin-book-status"
            v-model="form.status"
            class="admin-form__input"
            :disabled="saving"
          >
            <option value="available">{{ $t('library.available') }}</option>
            <option value="borrowed">{{ $t('library.borrowed') }}</option>
          </select>
        </div>

        <div class="admin-form__field admin-form__field--full">
          <label class="admin-form__label" for="admin-book-pdf-url">
            {{ $t('admin.books.fields.pdfUrl') }}<span class="admin-form__optional">{{ $t('admin.optional') }}</span>
          </label>
          <input
            id="admin-book-pdf-url"
            v-model.trim="form.pdfUrl"
            type="url"
            inputmode="url"
            class="admin-form__input"
            :class="{ 'admin-form__input--error': fieldErrors.pdfUrl }"
            placeholder="https://drive.google.com/file/d/…/view"
            :aria-invalid="!!fieldErrors.pdfUrl"
            :disabled="saving"
            @input="clearError('pdfUrl')"
          />
          <span v-if="fieldErrors.pdfUrl" class="admin-form__field-error">{{ fieldErrors.pdfUrl }}</span>
          <span v-else class="admin-form__hint">{{ $t('admin.books.hints.pdfUrl') }}</span>
        </div>

        <div class="admin-form__field admin-form__field--full">
          <label class="admin-form__label" for="admin-book-summary">
            {{ $t('admin.books.fields.summary') }}<span class="admin-form__optional">{{ $t('admin.optional') }}</span>
          </label>
          <textarea
            id="admin-book-summary"
            v-model.trim="form.summary"
            class="admin-form__input"
            :placeholder="$t('admin.books.placeholders.summary')"
            :maxlength="SUMMARY_MAX_LENGTH"
            :disabled="saving"
          />
          <span class="admin-form__hint">
            {{ $t('admin.books.hints.summary', { count: form.summary.length, max: SUMMARY_MAX_LENGTH }) }}
          </span>
        </div>

        <div class="admin-form__field">
          <label class="admin-form__label" for="admin-book-cover">
            {{ $t('admin.books.fields.coverColor') }}<span class="admin-form__optional">{{ $t('admin.optional') }}</span>
          </label>
          <input
            id="admin-book-cover"
            v-model="form.coverColor"
            type="color"
            class="admin-form__color"
            :disabled="saving"
          />
          <span class="admin-form__hint">{{ $t('admin.books.hints.coverColor') }}</span>
        </div>
      </div>

      <div class="admin-form__actions">
        <button type="submit" class="admin-form__btn admin-form__btn--primary" :disabled="saving">
          <span v-if="saving" class="admin-form__spinner" aria-hidden="true" />
          {{ saving ? $t('admin.books.saving') : $t('admin.books.submit') }}
        </button>
        <button type="button" class="admin-form__btn admin-form__btn--secondary" :disabled="saving" @click="resetForm">
          {{ $t('admin.books.clear') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { fetchBooks } from '../../api/books.js'
import { createBook } from '../../api/admin.js'
import { useAuthStore } from '../../stores/auth'

const SUMMARY_MAX_LENGTH = 2000
const DEFAULT_COVER_COLOR = '#4a5568'
// ISBN-10 (last char may be X) or ISBN-13, checked after removing hyphens.
const ISBN_PATTERN = /^(?:\d{9}[\dXx]|\d{13})$/

const ERROR_KEY_MAP = {
  'admin.books.duplicateIsbn': 'admin.books.duplicateIsbn',
  'admin.books.invalidFields': 'admin.books.invalidFields',
  'admin.forbidden': 'admin.forbidden'
}

const { t } = useI18n()
const auth = useAuthStore()

const maxYear = new Date().getFullYear() + 1

function emptyForm() {
  return {
    title: '',
    author: '',
    genre: '',
    year: '',
    isbn: '',
    status: 'available',
    pdfUrl: '',
    summary: '',
    coverColor: DEFAULT_COVER_COLOR
  }
}

const form = reactive(emptyForm())
const fieldErrors = reactive({ title: '', author: '', year: '', isbn: '', pdfUrl: '' })
const existingGenres = ref([])
const saving = ref(false)
const requestError = ref('')
const createdBook = ref(null)
const titleInput = ref(null)

onMounted(async () => {
  try {
    const books = await fetchBooks()
    existingGenres.value = [...new Set(books.map((b) => b.genre).filter(Boolean))].sort()
  } catch {
    // Genre suggestions are a convenience; the form works without them.
  }
})

function clearError(field) {
  fieldErrors[field] = ''
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validate() {
  fieldErrors.title = form.title ? '' : t('admin.books.errors.titleRequired')
  fieldErrors.author = form.author ? '' : t('admin.books.errors.authorRequired')

  const year = form.year === '' || form.year === null ? null : Number(form.year)
  fieldErrors.year = year === null || (Number.isInteger(year) && year >= 0 && year <= maxYear)
    ? ''
    : t('admin.books.errors.invalidYear', { max: maxYear })

  fieldErrors.isbn = !form.isbn || ISBN_PATTERN.test(form.isbn.replace(/-/g, '')) ? '' : t('admin.books.errors.invalidIsbn')
  fieldErrors.pdfUrl = !form.pdfUrl || isValidHttpUrl(form.pdfUrl) ? '' : t('admin.books.errors.invalidUrl')

  return Object.values(fieldErrors).every((error) => !error)
}

function toPayload() {
  return {
    title: form.title,
    author: form.author,
    genre: form.genre || null,
    year: form.year === '' || form.year === null ? null : Number(form.year),
    isbn: form.isbn || null,
    status: form.status,
    pdfUrl: form.pdfUrl || null,
    summary: form.summary || null,
    coverColor: form.coverColor || null
  }
}

function resetForm() {
  Object.assign(form, emptyForm())
  Object.keys(fieldErrors).forEach((key) => { fieldErrors[key] = '' })
  requestError.value = ''
}

async function handleSubmit() {
  requestError.value = ''
  createdBook.value = null

  if (!validate()) {
    return
  }

  saving.value = true
  try {
    const result = await createBook(toPayload(), { uploadedBy: auth.user?.username })

    if (result.success) {
      createdBook.value = result.book
      resetForm()
      if (result.book.genre && !existingGenres.value.includes(result.book.genre)) {
        existingGenres.value = [...existingGenres.value, result.book.genre].sort()
      }
    } else {
      const key = ERROR_KEY_MAP[result.errorKey] ?? 'admin.books.error'
      requestError.value = t(key)
    }
  } catch {
    requestError.value = t('admin.books.error')
  } finally {
    saving.value = false
  }

  if (createdBook.value) {
    // Inputs are re-enabled only after `saving` resets, so focus on the next tick.
    await nextTick()
    titleInput.value?.focus()
  }
}
</script>

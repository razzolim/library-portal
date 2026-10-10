<template>
  <div class="admin-import">
    <div class="admin-tool__header">
      <h2 class="admin-tool__title">{{ $t('admin.tools.importBooks.title') }}</h2>
      <p class="admin-tool__description">{{ $t('admin.tools.importBooks.description') }}</p>
    </div>

    <form class="admin-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="importedCount !== null" class="admin-form__alert admin-form__alert--success" role="status">
        <strong>{{ $t('admin.books.import.success', { count: importedCount }, importedCount) }}</strong>
        <div class="admin-form__alert-actions">
          <RouterLink :to="{ name: 'library' }" class="admin-form__btn admin-form__btn--link">
            {{ $t('admin.books.import.viewLibrary') }}
          </RouterLink>
        </div>
      </div>

      <div v-if="requestError" class="admin-form__alert admin-form__alert--error" role="alert">
        <strong>{{ requestError }}</strong>
        <p v-if="requestHint" class="admin-import__alert-hint">{{ requestHint }}</p>
      </div>

      <div class="admin-form__field">
        <span id="admin-import-label" class="admin-form__label">
          {{ $t('admin.books.import.fileLabel') }}<span class="admin-form__required" aria-hidden="true">*</span>
        </span>

        <div v-if="!file" class="admin-import__drop-wrapper">
          <label
            class="admin-import__drop"
            :class="{ 'admin-import__drop--active': dragging, 'admin-import__drop--error': fileError }"
            for="admin-import-file"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="handleDrop"
          >
            <svg class="admin-import__drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <span class="admin-import__drop-title">
              {{ $t('admin.books.import.dropTitle') }}
              <span class="admin-import__drop-browse">{{ $t('admin.books.import.browse') }}</span>
            </span>
            <span class="admin-import__drop-hint">
              {{ $t('admin.books.import.dropHint', { size: '1 MB', rows: MAX_ROWS }) }}
            </span>
          </label>
          <input
            id="admin-import-file"
            ref="fileInput"
            class="admin-import__input"
            type="file"
            accept=".csv,text/csv"
            :aria-labelledby="'admin-import-label'"
            :disabled="importing"
            @change="handleFileChange"
          />
        </div>

        <div v-else class="admin-import__file" :class="{ 'admin-import__file--error': fileError }">
          <svg class="admin-import__file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8" />
          </svg>
          <div class="admin-import__file-info">
            <span class="admin-import__file-name">{{ file.name }}</span>
            <span class="admin-import__file-meta">
              {{ formatSize(file.size) }}
              <template v-if="summary && !fileError">
                · {{ $t('admin.books.import.rowCount', { count: summary.rowCount }, summary.rowCount) }}
              </template>
            </span>
          </div>
          <button
            type="button"
            class="admin-import__remove"
            :aria-label="$t('admin.books.import.remove')"
            :disabled="importing"
            @click="clearFile"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <span v-if="fileError" class="admin-form__field-error" role="alert">{{ fileError }}</span>
        <span v-else class="admin-form__hint">{{ $t('admin.books.import.allOrNothing') }}</span>
      </div>

      <div v-if="rowErrors.length" class="admin-import__report" role="alert">
        <h3 class="admin-import__report-title">
          {{ $t('admin.books.import.problemsTitle', { count: rowErrors.length }, rowErrors.length) }}
        </h3>
        <div class="admin-import__table-wrapper">
          <table class="admin-import__table">
            <thead>
              <tr>
                <th scope="col">{{ $t('admin.books.import.line') }}</th>
                <th scope="col">{{ $t('admin.books.import.column') }}</th>
                <th scope="col">{{ $t('admin.books.import.problem') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(issue, index) in visibleIssues" :key="index">
                <td>{{ issue.line }}</td>
                <td><code>{{ issue.column }}</code></td>
                <td>{{ issue.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="hiddenIssues > 0" class="admin-form__hint">
          {{ $t('admin.books.import.moreProblems', { count: hiddenIssues }, hiddenIssues) }}
        </p>
      </div>

      <details class="admin-import__format">
        <summary class="admin-import__format-summary">{{ $t('admin.books.import.formatTitle') }}</summary>
        <div class="admin-import__format-body">
          <p>{{ $t('admin.books.import.formatIntro') }}</p>
          <ul class="admin-import__columns">
            <li v-for="column in REQUIRED_COLUMNS" :key="column">
              <code>{{ column }}</code>
              <span class="admin-import__tag">{{ $t('admin.books.import.required') }}</span>
              {{ $t(`admin.books.import.columnHelp.${column}`) }}
            </li>
            <li v-for="column in OPTIONAL_COLUMNS" :key="column">
              <code>{{ column }}</code>
              {{ $t(`admin.books.import.columnHelp.${column}`) }}
            </li>
          </ul>
          <p class="admin-form__hint">{{ $t('admin.books.import.formatNote') }}</p>
        </div>
      </details>

      <div class="admin-form__actions">
        <button
          type="submit"
          class="admin-form__btn admin-form__btn--primary"
          :disabled="importing"
        >
          <span v-if="importing" class="admin-form__spinner" aria-hidden="true" />
          {{ importing ? $t('admin.books.import.importing') : $t('admin.books.import.submit') }}
        </button>
        <button type="button" class="admin-form__btn admin-form__btn--secondary" @click="downloadTemplate">
          {{ $t('admin.books.import.downloadTemplate') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { importBooks } from '../../api/admin.js'
import { useAuthStore } from '../../stores/auth'
import {
  inspectBooksCsv,
  IMPORT_MAX_BYTES as MAX_BYTES,
  IMPORT_MAX_ROWS as MAX_ROWS,
  IMPORT_REQUIRED_COLUMNS as REQUIRED_COLUMNS,
  IMPORT_OPTIONAL_COLUMNS as OPTIONAL_COLUMNS,
  IMPORT_TEMPLATE_CSV
} from '../../utils/csv.js'

const MAX_VISIBLE_ISSUES = 50

const { t } = useI18n()
const auth = useAuthStore()

const file = ref(null)
const csvText = ref('')
const summary = ref(null)
const fileError = ref('')
const dragging = ref(false)
const importing = ref(false)
const requestError = ref('')
const requestHint = ref('')
const rowErrors = ref([])
const importedCount = ref(null)
const fileInput = ref(null)

const issues = computed(() =>
  rowErrors.value.flatMap(({ line, fields }) =>
    Object.entries(fields).map(([column, code]) => ({
      line,
      column,
      message: t(`admin.books.import.codes.${code}`, t('admin.books.import.codes.invalid'))
    }))
  )
)
const visibleIssues = computed(() => issues.value.slice(0, MAX_VISIBLE_ISSUES))
const hiddenIssues = computed(() => issues.value.length - visibleIssues.value.length)

function formatSize(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

function readText(source) {
  if (typeof source.text === 'function') return source.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(source)
  })
}

function resetResults() {
  requestError.value = ''
  requestHint.value = ''
  rowErrors.value = []
  importedCount.value = null
}

function clearFile() {
  file.value = null
  csvText.value = ''
  summary.value = null
  fileError.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function selectFile(selected) {
  resetResults()
  clearFile()
  if (!selected) return

  file.value = selected
  if (!/\.csv$/i.test(selected.name)) {
    fileError.value = t('admin.books.import.errors.notCsv')
    return
  }
  if (selected.size === 0) {
    fileError.value = t('admin.books.import.errors.empty')
    return
  }
  if (selected.size > MAX_BYTES) {
    fileError.value = t('admin.books.import.errors.tooLarge', { size: '1 MB' })
    return
  }

  try {
    csvText.value = await readText(selected)
  } catch {
    fileError.value = t('admin.books.import.errors.unreadable')
    return
  }

  const result = inspectBooksCsv(csvText.value)
  summary.value = result
  if (result.unterminated || result.rowCount === 0) {
    fileError.value = t('admin.books.import.errors.noRows')
  } else if (result.missing.length || result.unknown.length || result.duplicated.length) {
    fileError.value = headerMessage(result)
  } else if (result.rowCount > MAX_ROWS) {
    fileError.value = t('admin.books.import.errors.tooManyRows', { max: MAX_ROWS, count: result.rowCount })
  }
}

function headerMessage({ missing = [], unknown = [], duplicated = [] }) {
  const parts = []
  if (missing.length) parts.push(t('admin.books.import.errors.missingColumns', { columns: missing.join(', ') }))
  if (unknown.length) parts.push(t('admin.books.import.errors.unknownColumns', { columns: unknown.join(', ') }))
  if (duplicated.length) parts.push(t('admin.books.import.errors.duplicatedColumns', { columns: duplicated.join(', ') }))
  return parts.join(' ')
}

function handleFileChange(event) {
  selectFile(event.target.files?.[0])
}

function handleDrop(event) {
  dragging.value = false
  if (importing.value) return
  selectFile(event.dataTransfer?.files?.[0])
}

function downloadTemplate() {
  const blob = new Blob([IMPORT_TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'books-import-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function applyFailure(result) {
  switch (result.errorKey) {
    case 'admin.books.import.invalidRows':
    case 'admin.books.import.duplicateIsbn':
      rowErrors.value = result.errors ?? []
      requestError.value = t(result.errorKey)
      requestHint.value = t('admin.books.import.nothingImported')
      break
    case 'admin.books.import.invalidHeader':
      fileError.value = headerMessage(result)
      requestError.value = t(result.errorKey)
      break
    case 'admin.books.import.tooManyRows':
      requestError.value = t(result.errorKey, { max: result.maxRows ?? MAX_ROWS })
      break
    case 'admin.books.import.fileTooLarge':
    case 'admin.books.import.invalidFile':
    case 'admin.books.import.unsupportedMediaType':
    case 'admin.rateLimited':
    case 'admin.forbidden':
      requestError.value = t(result.errorKey)
      break
    default:
      requestError.value = t('admin.books.import.error')
  }
}

async function handleSubmit() {
  resetResults()
  if (!file.value) {
    fileError.value = t('admin.books.import.errors.noFile')
    return
  }
  if (fileError.value) return

  importing.value = true
  try {
    const result = await importBooks(csvText.value, { uploadedBy: auth.user?.username })
    if (result.success) {
      importedCount.value = result.imported
      clearFile()
    } else {
      applyFailure(result)
    }
  } catch {
    requestError.value = t('admin.books.import.error')
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.admin-import__alert-hint {
  margin: 0;
}

.admin-import__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
}

.admin-import__drop-wrapper {
  position: relative;
}

.admin-import__drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 2rem 1rem;
  text-align: center;
  background-color: var(--color-bg);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.admin-import__drop:hover,
.admin-import__drop--active {
  border-color: var(--color-primary);
  background-color: var(--color-primary-soft);
}

.admin-import__input:focus-visible + .admin-import__drop,
.admin-import__drop-wrapper:focus-within .admin-import__drop {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.admin-import__drop--error {
  border-color: var(--color-error);
}

.admin-import__drop-icon {
  width: 2.25rem;
  height: 2.25rem;
  color: var(--color-primary);
}

.admin-import__drop-title {
  font-weight: 600;
  color: var(--color-text);
}

.admin-import__drop-browse {
  color: var(--color-primary-dark);
  text-decoration: underline;
}

.admin-import__drop-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.admin-import__file {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: var(--color-white);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
}

.admin-import__file--error {
  border-color: var(--color-error);
}

.admin-import__file-icon {
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  color: var(--color-primary);
}

.admin-import__file-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.admin-import__file-name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text);
}

.admin-import__file-meta {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.admin-import__remove {
  display: flex;
  padding: 0.375rem;
  color: var(--color-text-muted);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.admin-import__remove:hover:not(:disabled) {
  color: var(--color-text);
  background-color: var(--color-muted);
}

.admin-import__remove:focus-visible {
  outline: 2px solid var(--color-primary);
}

.admin-import__remove svg {
  width: 1.125rem;
  height: 1.125rem;
}

.admin-import__report {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-import__report-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-error);
}

.admin-import__table-wrapper {
  max-height: 18rem;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.admin-import__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.admin-import__table th,
.admin-import__table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.admin-import__table th {
  position: sticky;
  top: 0;
  background-color: var(--color-muted);
  font-weight: 600;
}

.admin-import__table tr:last-child td {
  border-bottom: none;
}

.admin-import__format {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.admin-import__format-summary {
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
}

.admin-import__format-body {
  padding: 0 1rem 1rem;
  font-size: 0.875rem;
  color: var(--color-text);
}

.admin-import__format-body p {
  margin: 0 0 0.5rem;
}

.admin-import__columns {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0 0 0.75rem;
  padding-left: 1.25rem;
}

.admin-import__columns code,
.admin-import__table code {
  padding: 0.0625rem 0.375rem;
  font-size: 0.8125rem;
  background-color: var(--color-muted);
  border-radius: var(--radius-sm);
}

.admin-import__tag {
  margin: 0 0.25rem;
  padding: 0.0625rem 0.375rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-warning);
  background-color: var(--color-warning-bg);
  border-radius: var(--radius-full);
}
</style>

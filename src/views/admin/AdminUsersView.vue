<template>
  <div class="admin-users">
    <div class="admin-tool__header">
      <h2 class="admin-tool__title">{{ $t('admin.tools.users.title') }}</h2>
      <p class="admin-tool__description">{{ $t('admin.tools.users.description') }}</p>
    </div>

    <div v-if="notice" class="admin-form__alert admin-form__alert--success admin-users__notice" role="status">
      <span>{{ notice }}</span>
      <button type="button" class="admin-users__notice-close" :aria-label="$t('admin.close')" @click="notice = ''">×</button>
    </div>

    <div class="admin-users__toolbar">
      <label class="admin-users__search">
        <span class="admin-users__sr-only">{{ $t('admin.users.searchLabel') }}</span>
        <input
          v-model="query"
          type="search"
          class="admin-form__input"
          :placeholder="$t('admin.users.searchPlaceholder')"
          autocomplete="off"
        />
      </label>
    </div>

    <div v-if="isLoading && users.length === 0" class="admin-users__state">
      <LoadingSpinner :message="$t('admin.users.loading')" />
    </div>

    <div v-else-if="loadError" class="admin-form__alert admin-form__alert--error" role="alert">
      <span>{{ loadError }}</span>
      <div class="admin-form__alert-actions">
        <button type="button" class="admin-form__btn admin-form__btn--secondary" @click="loadUsers">
          {{ $t('admin.users.retry') }}
        </button>
      </div>
    </div>

    <p v-else-if="users.length === 0" class="admin-users__state">
      {{ appliedQuery ? $t('admin.users.emptySearch') : $t('admin.users.empty') }}
    </p>

    <template v-else>
      <table class="admin-users__table" :class="{ 'admin-users__table--busy': isLoading }" :aria-busy="isLoading">
        <thead>
          <tr>
            <th scope="col">{{ $t('admin.users.columns.user') }}</th>
            <th scope="col">{{ $t('admin.users.columns.email') }}</th>
            <th scope="col">{{ $t('admin.users.columns.role') }}</th>
            <th scope="col">{{ $t('admin.users.columns.status') }}</th>
            <th scope="col"><span class="admin-users__sr-only">{{ $t('admin.users.columns.actions') }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.username" class="admin-users__row" :class="{ 'admin-users__row--disabled': !user.enabled }">
            <td :data-label="$t('admin.users.columns.user')">
              <span class="admin-users__name">{{ user.fullName }}</span>
              <span class="admin-users__username">
                @{{ user.username }}
                <span v-if="isSelf(user)" class="admin-users__badge admin-users__badge--you">{{ $t('admin.users.you') }}</span>
              </span>
            </td>
            <td :data-label="$t('admin.users.columns.email')">
              <span v-if="user.email" class="admin-users__email">{{ user.email }}</span>
              <span v-else class="admin-users__muted">{{ $t('admin.users.noEmail') }}</span>
            </td>
            <td :data-label="$t('admin.users.columns.role')">
              <span class="admin-users__badge" :class="`admin-users__badge--${user.role}`">
                {{ $t(`admin.users.roles.${user.role}`) }}
              </span>
            </td>
            <td :data-label="$t('admin.users.columns.status')">
              <span class="admin-users__badge" :class="user.enabled ? 'admin-users__badge--active' : 'admin-users__badge--disabled'">
                {{ user.enabled ? $t('admin.users.status.active') : $t('admin.users.status.disabled') }}
              </span>
            </td>
            <td class="admin-users__actions-cell">
              <div class="admin-users__menu-wrap">
                <button
                  type="button"
                  class="admin-form__btn admin-form__btn--secondary admin-users__menu-button"
                  aria-haspopup="menu"
                  :aria-expanded="openMenu === user.username"
                  :aria-label="$t('admin.users.actionsFor', { username: user.username })"
                  @click="toggleMenu(user.username)"
                >
                  {{ $t('admin.users.actions') }}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <ul v-if="openMenu === user.username" class="admin-users__menu" role="menu">
                  <li role="none">
                    <button type="button" role="menuitem" class="admin-users__menu-item" data-action="reset" @click="openDialog('reset', user)">
                      {{ $t('admin.users.resetPassword') }}
                    </button>
                  </li>
                  <li role="none">
                    <button type="button" role="menuitem" class="admin-users__menu-item" data-action="email" @click="openDialog('email', user)">
                      {{ $t('admin.users.editEmail') }}
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="admin-users__menu-item"
                      data-action="toggle"
                      :disabled="isSelf(user) && user.enabled"
                      :title="isSelf(user) ? $t('admin.users.selfHint') : undefined"
                      @click="openDialog('toggle', user)"
                    >
                      {{ user.enabled ? $t('admin.users.disable') : $t('admin.users.enable') }}
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="admin-users__menu-item admin-users__menu-item--danger"
                      data-action="delete"
                      :disabled="isSelf(user)"
                      :title="isSelf(user) ? $t('admin.users.selfHint') : undefined"
                      @click="openDialog('delete', user)"
                    >
                      {{ $t('admin.users.delete') }}
                    </button>
                  </li>
                </ul>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <PaginationControls
        v-model="pageSize"
        v-model:current-page="page"
        :total-items="total"
        showing-key="pagination.showingUsers"
      />
    </template>

    <AdminModal v-if="dialog" :title="dialogTitle" :busy="saving" @close="closeDialog">
      <!-- Reset password -->
      <form v-if="dialog.type === 'reset'" class="admin-form" novalidate @submit.prevent="submitDialog">
        <div v-if="dialogError" class="admin-form__alert admin-form__alert--error" role="alert">{{ dialogError }}</div>

        <div class="admin-form__field">
          <label class="admin-form__label" for="admin-users-new-password">{{ $t('admin.resetPassword.newPassword') }}</label>
          <div class="admin-form__input-wrapper">
            <input
              id="admin-users-new-password"
              v-model="dialogForm.newPassword"
              :type="showPassword ? 'text' : 'password'"
              class="admin-form__input admin-form__input--with-action"
              :class="{ 'admin-form__input--error': dialogFieldErrors.newPassword }"
              :placeholder="$t('admin.resetPassword.newPasswordPlaceholder')"
              :aria-invalid="!!dialogFieldErrors.newPassword"
              autocomplete="new-password"
              :disabled="saving"
              @input="dialogFieldErrors.newPassword = ''"
            />
            <button
              type="button"
              class="admin-form__icon-btn"
              :aria-label="showPassword ? $t('login.hidePassword') : $t('login.showPassword')"
              @click="showPassword = !showPassword"
            >
              <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </div>
          <span v-if="dialogFieldErrors.newPassword" class="admin-form__field-error">{{ dialogFieldErrors.newPassword }}</span>
          <span class="admin-form__hint">
            {{ $t('admin.resetPassword.passwordHint', { min: MIN_PASSWORD_LENGTH }) }}
            <button type="button" class="admin-form__btn admin-form__btn--link" :disabled="saving" @click="fillGeneratedPassword">
              {{ $t('admin.resetPassword.generate') }}
            </button>
          </span>
        </div>

        <div class="admin-form__field">
          <label class="admin-form__label" for="admin-users-confirm-password">{{ $t('admin.resetPassword.confirmPassword') }}</label>
          <input
            id="admin-users-confirm-password"
            v-model="dialogForm.confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            class="admin-form__input"
            :class="{ 'admin-form__input--error': dialogFieldErrors.confirmPassword }"
            :placeholder="$t('admin.resetPassword.confirmPasswordPlaceholder')"
            :aria-invalid="!!dialogFieldErrors.confirmPassword"
            autocomplete="new-password"
            :disabled="saving"
            @input="dialogFieldErrors.confirmPassword = ''"
          />
          <span v-if="dialogFieldErrors.confirmPassword" class="admin-form__field-error">{{ dialogFieldErrors.confirmPassword }}</span>
        </div>

        <div class="admin-form__actions">
          <button type="submit" class="admin-form__btn admin-form__btn--primary" :disabled="saving">
            <span v-if="saving" class="admin-form__spinner" aria-hidden="true" />
            {{ saving ? $t('admin.resetPassword.resetting') : $t('admin.resetPassword.submit') }}
          </button>
          <button type="button" class="admin-form__btn admin-form__btn--secondary" :disabled="saving" @click="closeDialog">{{ $t('admin.cancel') }}</button>
        </div>
      </form>

      <!-- Edit email -->
      <form v-else-if="dialog.type === 'email'" class="admin-form" novalidate @submit.prevent="submitDialog">
        <div v-if="dialogError" class="admin-form__alert admin-form__alert--error" role="alert">{{ dialogError }}</div>

        <div class="admin-form__field">
          <label class="admin-form__label" for="admin-users-email">{{ $t('admin.users.emailLabel') }}</label>
          <input
            id="admin-users-email"
            v-model.trim="dialogForm.email"
            type="email"
            class="admin-form__input"
            :class="{ 'admin-form__input--error': dialogFieldErrors.email }"
            :placeholder="$t('admin.users.emailPlaceholder')"
            :aria-invalid="!!dialogFieldErrors.email"
            autocomplete="off"
            :disabled="saving"
            @input="dialogFieldErrors.email = ''"
          />
          <span v-if="dialogFieldErrors.email" class="admin-form__field-error">{{ dialogFieldErrors.email }}</span>
        </div>

        <div class="admin-form__actions">
          <button type="submit" class="admin-form__btn admin-form__btn--primary" :disabled="saving">
            <span v-if="saving" class="admin-form__spinner" aria-hidden="true" />
            {{ saving ? $t('admin.users.saving') : $t('admin.users.saveEmail') }}
          </button>
          <button type="button" class="admin-form__btn admin-form__btn--secondary" :disabled="saving" @click="closeDialog">{{ $t('admin.cancel') }}</button>
        </div>
      </form>

      <!-- Disable / enable -->
      <form v-else-if="dialog.type === 'toggle'" class="admin-form" @submit.prevent="submitDialog">
        <div v-if="dialogError" class="admin-form__alert admin-form__alert--error" role="alert">{{ dialogError }}</div>
        <p class="admin-users__dialog-text">
          {{ dialog.user.enabled
            ? $t('admin.users.disableMessage', { username: dialog.user.username })
            : $t('admin.users.enableMessage', { username: dialog.user.username }) }}
        </p>
        <div class="admin-form__actions">
          <button
            type="submit"
            class="admin-form__btn"
            :class="dialog.user.enabled ? 'admin-form__btn--danger' : 'admin-form__btn--primary'"
            :disabled="saving"
          >
            <span v-if="saving" class="admin-form__spinner" aria-hidden="true" />
            {{ dialog.user.enabled ? $t('admin.users.disable') : $t('admin.users.enable') }}
          </button>
          <button type="button" class="admin-form__btn admin-form__btn--secondary" :disabled="saving" @click="closeDialog">{{ $t('admin.cancel') }}</button>
        </div>
      </form>

      <!-- Delete -->
      <form v-else-if="dialog.type === 'delete'" class="admin-form" @submit.prevent="submitDialog">
        <div v-if="dialogError" class="admin-form__alert admin-form__alert--error" role="alert">{{ dialogError }}</div>
        <p class="admin-users__dialog-text">{{ $t('admin.users.deleteMessage', { username: dialog.user.username }) }}</p>
        <div class="admin-form__field">
          <label class="admin-form__label" for="admin-users-delete-confirm">
            {{ $t('admin.users.typeToConfirm', { username: dialog.user.username }) }}
          </label>
          <input
            id="admin-users-delete-confirm"
            v-model.trim="dialogForm.confirmText"
            type="text"
            class="admin-form__input"
            autocomplete="off"
            spellcheck="false"
            :disabled="saving"
          />
        </div>
        <div class="admin-form__actions">
          <button type="submit" class="admin-form__btn admin-form__btn--danger" :disabled="saving || dialogForm.confirmText !== dialog.user.username">
            <span v-if="saving" class="admin-form__spinner" aria-hidden="true" />
            {{ $t('admin.users.deleteConfirm') }}
          </button>
          <button type="button" class="admin-form__btn admin-form__btn--secondary" :disabled="saving" @click="closeDialog">{{ $t('admin.cancel') }}</button>
        </div>
      </form>
    </AdminModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  fetchUsers,
  resetUserPassword,
  updateUserEmail,
  setUserEnabled,
  deleteUser
} from '../../api/admin.js'
import { useAuthStore } from '../../stores/auth'
import { MIN_PASSWORD_LENGTH, generatePassword } from '../../utils/password.js'
import AdminModal from '../../components/admin/AdminModal.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import PaginationControls from '../../components/PaginationControls.vue'

const SEARCH_DEBOUNCE_MS = 300
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ERROR_KEY_MAP = {
  'admin.users.notFound': 'admin.users.errors.notFound',
  'admin.resetPassword.userNotFound': 'admin.users.errors.notFound',
  'admin.users.duplicateEmail': 'admin.users.errors.duplicateEmail',
  'admin.users.invalidEmail': 'admin.users.errors.invalidEmail',
  'admin.users.cannotModifySelf': 'admin.users.errors.cannotModifySelf',
  'admin.users.lastAdmin': 'admin.users.errors.lastAdmin',
  'admin.resetPassword.weakPassword': 'admin.resetPassword.passwordTooShort',
  'admin.forbidden': 'admin.forbidden'
}

const { t } = useI18n()
const auth = useAuthStore()

const users = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(12)
const query = ref('')
const appliedQuery = ref('')
const isLoading = ref(false)
const loadError = ref('')
const notice = ref('')
const openMenu = ref(null)

const dialog = ref(null)
const saving = ref(false)
const dialogError = ref('')
const showPassword = ref(false)
const dialogForm = reactive({ newPassword: '', confirmPassword: '', email: '', confirmText: '' })
const dialogFieldErrors = reactive({ newPassword: '', confirmPassword: '', email: '' })

let requestId = 0
let searchTimer = null

const dialogTitle = computed(() => {
  if (!dialog.value) return ''
  const { type, user } = dialog.value
  switch (type) {
    case 'reset': return t('admin.users.resetTitle', { username: user.username })
    case 'email': return t('admin.users.emailTitle', { username: user.username })
    case 'toggle': return user.enabled
      ? t('admin.users.disableTitle', { username: user.username })
      : t('admin.users.enableTitle', { username: user.username })
    default: return t('admin.users.deleteTitle', { username: user.username })
  }
})

function isSelf(user) {
  return user.username === auth.user?.username
}

async function loadUsers() {
  const current = ++requestId
  isLoading.value = true
  loadError.value = ''

  try {
    let result = await fetchUsers({ page: page.value, pageSize: pageSize.value, query: appliedQuery.value })
    if (current !== requestId) return

    // The last item of the last page was removed: go back to the new last page.
    if (result.items.length === 0 && result.total > 0 && page.value > 1) {
      page.value = Math.ceil(result.total / pageSize.value)
      return
    }

    users.value = result.items
    total.value = result.total
  } catch {
    if (current !== requestId) return
    loadError.value = t('admin.users.loadError')
  } finally {
    if (current === requestId) isLoading.value = false
  }
}

watch(query, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    appliedQuery.value = value.trim()
  }, SEARCH_DEBOUNCE_MS)
})

watch(appliedQuery, () => {
  closeMenu()
  if (page.value !== 1) {
    page.value = 1
  } else {
    loadUsers()
  }
})

watch([page, pageSize], () => {
  closeMenu()
  loadUsers()
})

function toggleMenu(username) {
  openMenu.value = openMenu.value === username ? null : username
}

function closeMenu() {
  openMenu.value = null
}

function handleDocumentClick(event) {
  if (!event.target.closest?.('.admin-users__menu-wrap')) closeMenu()
}

function handleEscape(event) {
  if (event.key === 'Escape') closeMenu()
}

function openDialog(type, user) {
  closeMenu()
  Object.assign(dialogForm, { newPassword: '', confirmPassword: '', email: user.email || '', confirmText: '' })
  Object.keys(dialogFieldErrors).forEach((key) => { dialogFieldErrors[key] = '' })
  dialogError.value = ''
  showPassword.value = false
  dialog.value = { type, user }
}

function closeDialog() {
  if (saving.value) return
  dialog.value = null
}

function fillGeneratedPassword() {
  const password = generatePassword()
  dialogForm.newPassword = password
  dialogForm.confirmPassword = password
  dialogFieldErrors.newPassword = ''
  dialogFieldErrors.confirmPassword = ''
  showPassword.value = true
}

function validateDialog() {
  const { type } = dialog.value

  if (type === 'reset') {
    dialogFieldErrors.newPassword = dialogForm.newPassword.length >= MIN_PASSWORD_LENGTH
      ? ''
      : t('admin.resetPassword.passwordTooShort', { min: MIN_PASSWORD_LENGTH })
    dialogFieldErrors.confirmPassword = dialogForm.newPassword === dialogForm.confirmPassword
      ? ''
      : t('admin.resetPassword.passwordMismatch')
    return !dialogFieldErrors.newPassword && !dialogFieldErrors.confirmPassword
  }

  if (type === 'email') {
    dialogFieldErrors.email = !dialogForm.email
      ? t('admin.users.errors.emailRequired')
      : EMAIL_PATTERN.test(dialogForm.email) ? '' : t('admin.users.errors.invalidEmail')
    return !dialogFieldErrors.email
  }

  return true
}

function runAction() {
  const { type, user } = dialog.value
  const actor = auth.user?.username

  switch (type) {
    case 'reset':
      return resetUserPassword({ username: user.username, newPassword: dialogForm.newPassword })
    case 'email':
      return updateUserEmail(user.username, dialogForm.email)
    case 'toggle':
      return setUserEnabled(user.username, !user.enabled, { actor })
    default:
      return deleteUser(user.username, { actor })
  }
}

function successMessage() {
  const { type, user } = dialog.value
  const params = { username: user.username }
  switch (type) {
    case 'reset': return t('admin.users.notices.passwordReset', params)
    case 'email': return t('admin.users.notices.emailUpdated', params)
    case 'toggle': return t(user.enabled ? 'admin.users.notices.disabled' : 'admin.users.notices.enabled', params)
    default: return t('admin.users.notices.deleted', params)
  }
}

async function submitDialog() {
  dialogError.value = ''
  if (!validateDialog()) return

  saving.value = true
  try {
    const result = await runAction()

    if (result.success) {
      const message = successMessage()
      const refresh = dialog.value.type !== 'reset'
      saving.value = false
      dialog.value = null
      notice.value = message
      if (refresh) await loadUsers()
    } else {
      dialogError.value = t(ERROR_KEY_MAP[result.errorKey] ?? 'admin.users.errors.generic', { min: MIN_PASSWORD_LENGTH })
    }
  } catch {
    dialogError.value = t('admin.users.errors.generic')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadUsers()
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  clearTimeout(searchTimer)
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.admin-users__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.admin-users__notice {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.admin-users__notice-close {
  font-size: 1.25rem;
  line-height: 1;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
}

.admin-users__toolbar {
  margin-bottom: 1rem;
}

.admin-users__search {
  display: block;
  max-width: 24rem;
}

.admin-users__state {
  padding: 2rem 0;
  text-align: center;
  color: var(--color-text-muted);
}

.admin-users__table {
  width: 100%;
  border-collapse: collapse;
  transition: opacity 0.15s ease;
}

.admin-users__table--busy {
  opacity: 0.6;
}

.admin-users__table th {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-align: left;
  text-transform: uppercase;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
}

.admin-users__table td {
  padding: 0.75rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--color-border);
}

.admin-users__row--disabled .admin-users__name,
.admin-users__row--disabled .admin-users__email {
  color: var(--color-text-muted);
}

.admin-users__name {
  display: block;
  font-weight: 600;
}

.admin-users__username,
.admin-users__muted {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.admin-users__email {
  word-break: break-all;
}

.admin-users__badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-full);
  color: var(--color-text-muted);
  background-color: var(--color-muted);
}

.admin-users__badge--admin {
  color: var(--color-warning);
  background-color: var(--color-warning-bg);
}

.admin-users__badge--active {
  color: var(--color-success);
  background-color: var(--color-success-bg);
}

.admin-users__badge--disabled {
  color: var(--color-error);
  background-color: var(--color-error-bg);
}

.admin-users__badge--you {
  margin-left: 0.25rem;
  color: var(--color-primary-dark);
  background-color: var(--color-primary-soft);
}

.admin-users__actions-cell {
  width: 1%;
  white-space: nowrap;
  text-align: right;
}

.admin-users__menu-wrap {
  position: relative;
  display: inline-block;
  text-align: left;
}

.admin-users__menu-button {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.admin-users__menu {
  position: absolute;
  top: calc(100% + 0.25rem);
  right: 0;
  z-index: 20;
  min-width: 12rem;
  margin: 0;
  padding: 0.25rem 0;
  list-style: none;
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.admin-users__menu-item {
  display: block;
  width: 100%;
  padding: 0.625rem 1rem;
  font-size: 0.9rem;
  text-align: left;
  color: var(--color-text);
  background: none;
  border: none;
  cursor: pointer;
}

.admin-users__menu-item:hover:not(:disabled),
.admin-users__menu-item:focus-visible {
  background-color: var(--color-background-soft);
  outline: none;
}

.admin-users__menu-item--danger {
  color: var(--color-danger);
}

.admin-users__menu-item--danger:hover:not(:disabled) {
  background-color: var(--color-danger-soft);
}

.admin-users__menu-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.admin-users__dialog-text {
  margin: 0;
  color: var(--color-text);
}

/* Small screens: each row becomes a card with labelled fields. */
@media (max-width: 640px) {
  .admin-users__table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }

  .admin-users__table,
  .admin-users__table tbody,
  .admin-users__table tr,
  .admin-users__table td {
    display: block;
  }

  .admin-users__table tr {
    margin-bottom: 0.75rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .admin-users__table td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.5rem 0;
    text-align: right;
    border-bottom: none;
  }

  .admin-users__table td::before {
    content: attr(data-label);
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .admin-users__actions-cell {
    width: auto;
  }

  .admin-users__actions-cell::before {
    content: none;
  }

  .admin-users__actions-cell .admin-users__menu-wrap {
    margin-left: auto;
  }
}
</style>

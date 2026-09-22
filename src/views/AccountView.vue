<template>
  <div class="account-view">
    <div class="account-view__card">
      <h1 class="account-view__title">{{ $t('account.title') }}</h1>

      <section class="account-view__section">
        <h2 class="account-view__section-title">{{ $t('account.profile') }}</h2>
        <dl class="account-view__details">
          <div class="account-view__detail">
            <dt class="account-view__label">{{ $t('account.fullName') }}</dt>
            <dd class="account-view__value">{{ auth.user?.fullName || '-' }}</dd>
          </div>
          <div class="account-view__detail">
            <dt class="account-view__label">{{ $t('account.username') }}</dt>
            <dd class="account-view__value">{{ auth.user?.username || '-' }}</dd>
          </div>
          <div class="account-view__detail">
            <dt class="account-view__label">{{ $t('account.role') }}</dt>
            <dd class="account-view__value">{{ auth.user?.role || '-' }}</dd>
          </div>
        </dl>
      </section>

      <section class="account-view__section">
        <h2 class="account-view__section-title">{{ $t('account.security') }}</h2>

        <div class="account-view__password-header" @click="passwordSectionOpen = !passwordSectionOpen">
          <span class="account-view__password-toggle-label">{{ $t('account.changePassword') }}</span>
          <span class="account-view__chevron" :class="{ 'account-view__chevron--open': passwordSectionOpen }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>

        <Transition name="slide">
          <form
            v-if="passwordSectionOpen"
            class="account-view__password-form"
            @submit.prevent="handleChangePassword"
            novalidate
          >
            <div v-if="passwordSuccess" class="account-view__alert account-view__alert--success" role="status">
              {{ $t('account.passwordChanged') }}
            </div>
            <div v-if="passwordError" class="account-view__alert account-view__alert--error" role="alert">
              {{ passwordError }}
            </div>

            <div class="account-view__field">
              <label class="account-view__field-label" for="current-password">
                {{ $t('account.currentPassword') }}
              </label>
              <div class="account-view__input-wrapper">
                <input
                  id="current-password"
                  v-model="form.currentPassword"
                  :type="showCurrent ? 'text' : 'password'"
                  class="account-view__input"
                  :placeholder="$t('account.currentPasswordPlaceholder')"
                  autocomplete="current-password"
                  :disabled="saving"
                />
                <button
                  type="button"
                  class="account-view__eye-btn"
                  :aria-label="showCurrent ? $t('login.hidePassword') : $t('login.showPassword')"
                  @click="showCurrent = !showCurrent"
                >
                  <svg v-if="!showCurrent" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
            </div>

            <div class="account-view__field">
              <label class="account-view__field-label" for="new-password">
                {{ $t('account.newPassword') }}
              </label>
              <div class="account-view__input-wrapper">
                <input
                  id="new-password"
                  v-model="form.newPassword"
                  :type="showNew ? 'text' : 'password'"
                  class="account-view__input"
                  :class="{ 'account-view__input--error': fieldErrors.newPassword }"
                  :placeholder="$t('account.newPasswordPlaceholder')"
                  autocomplete="new-password"
                  :disabled="saving"
                  @input="fieldErrors.newPassword = ''"
                />
                <button
                  type="button"
                  class="account-view__eye-btn"
                  :aria-label="showNew ? $t('login.hidePassword') : $t('login.showPassword')"
                  @click="showNew = !showNew"
                >
                  <svg v-if="!showNew" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
              <span v-if="fieldErrors.newPassword" class="account-view__field-error">
                {{ fieldErrors.newPassword }}
              </span>
            </div>

            <div class="account-view__field">
              <label class="account-view__field-label" for="confirm-password">
                {{ $t('account.confirmPassword') }}
              </label>
              <div class="account-view__input-wrapper">
                <input
                  id="confirm-password"
                  v-model="form.confirmPassword"
                  :type="showConfirm ? 'text' : 'password'"
                  class="account-view__input"
                  :class="{ 'account-view__input--error': fieldErrors.confirmPassword }"
                  :placeholder="$t('account.confirmPasswordPlaceholder')"
                  autocomplete="new-password"
                  :disabled="saving"
                  @input="fieldErrors.confirmPassword = ''"
                />
                <button
                  type="button"
                  class="account-view__eye-btn"
                  :aria-label="showConfirm ? $t('login.hidePassword') : $t('login.showPassword')"
                  @click="showConfirm = !showConfirm"
                >
                  <svg v-if="!showConfirm" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
              <span v-if="fieldErrors.confirmPassword" class="account-view__field-error">
                {{ fieldErrors.confirmPassword }}
              </span>
            </div>

            <button
              type="submit"
              class="account-view__save-btn"
              :disabled="saving"
            >
              <span v-if="saving" class="account-view__spinner" aria-hidden="true" />
              {{ saving ? $t('account.savingPassword') : $t('account.savePassword') }}
            </button>
          </form>
        </Transition>
      </section>

      <section class="account-view__section">
        <h2 class="account-view__section-title">{{ $t('account.preferences') }}</h2>
        <div class="account-view__preference">
          <LanguageSwitcher @change="updateLocale" />
        </div>
      </section>

      <div class="account-view__actions">
        <RouterLink :to="{ name: 'library' }" class="account-view__link">
          {{ $t('account.backToLibrary') }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import { updateLocale as updateLocaleApi, changePassword } from '../api/books.js'
import { useAuthStore } from '../stores/auth'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'

const { t } = useI18n()
const auth = useAuthStore()

async function updateLocale(newLocale) {
  await updateLocaleApi(newLocale)
  setLocale(newLocale)

  if (auth.user) {
    auth.user.locale = newLocale
  }
}

const passwordSectionOpen = ref(false)
const saving = ref(false)
const passwordSuccess = ref(false)
const passwordError = ref('')
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const fieldErrors = reactive({ newPassword: '', confirmPassword: '' })

const ERROR_KEY_MAP = {
  'users.changePassword.wrongCurrentPassword': 'account.wrongCurrentPassword',
  'users.changePassword.missingFields': 'account.changePasswordMissingFields',
}

async function handleChangePassword() {
  passwordSuccess.value = false
  passwordError.value = ''
  fieldErrors.newPassword = ''
  fieldErrors.confirmPassword = ''

  if (form.newPassword.length < 8) {
    fieldErrors.newPassword = t('account.passwordTooShort')
    return
  }

  if (form.newPassword !== form.confirmPassword) {
    fieldErrors.confirmPassword = t('account.passwordMismatch')
    return
  }

  saving.value = true
  try {
    const result = await changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    })

    if (result.success) {
      passwordSuccess.value = true
      form.currentPassword = ''
      form.newPassword = ''
      form.confirmPassword = ''
    } else {
      const key = ERROR_KEY_MAP[result.errorKey] ?? 'account.changePasswordError'
      passwordError.value = t(key)
    }
  } catch {
    passwordError.value = t('account.changePasswordError')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.account-view {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
}

.account-view__card {
  width: 100%;
  max-width: 32rem;
  padding: 2rem;
  background-color: var(--color-background);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.account-view__title {
  margin: 0 0 1.5rem;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text);
}

.account-view__section {
  margin-bottom: 2rem;
}

.account-view__section-title {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
}

.account-view__details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0;
}

.account-view__detail {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.account-view__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.account-view__value {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text);
}

.account-view__preference {
  padding: 1rem;
  background-color: var(--color-background-soft);
  border-radius: var(--radius-md);
}

/* Password section */

.account-view__password-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  background-color: var(--color-background-soft);
  border-radius: var(--radius-md);
  cursor: pointer;
  user-select: none;
  border: 1px solid var(--color-border);
  transition: background-color 0.15s ease;
}

.account-view__password-header:hover {
  background-color: var(--color-primary-soft);
}

.account-view__password-toggle-label {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-text);
}

.account-view__chevron {
  color: var(--color-text-muted);
  transition: transform 0.2s ease;
  display: flex;
  align-items: center;
}

.account-view__chevron--open {
  transform: rotate(180deg);
}

.account-view__password-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1.25rem;
  background-color: var(--color-background-soft);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.account-view__alert {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 500;
}

.account-view__alert--success {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.account-view__alert--error {
  background-color: var(--color-error-bg);
  color: var(--color-error);
}

.account-view__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.account-view__field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.account-view__input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.account-view__input {
  width: 100%;
  padding: 0.625rem 2.75rem 0.625rem 0.875rem;
  font-size: 0.9375rem;
  color: var(--color-text);
  background-color: var(--color-background);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  outline: none;
}

.account-view__input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.account-view__input--error {
  border-color: var(--color-error);
}

.account-view__input--error:focus {
  box-shadow: 0 0 0 3px rgba(153, 27, 27, 0.12);
}

.account-view__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.account-view__eye-btn {
  position: absolute;
  right: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: color 0.15s ease;
}

.account-view__eye-btn:hover {
  color: var(--color-text);
}

.account-view__field-error {
  font-size: 0.8rem;
  color: var(--color-error);
}

.account-view__save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6875rem 1.25rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-white);
  background-color: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.2s ease;
  align-self: flex-start;
}

.account-view__save-btn:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.account-view__save-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.account-view__spinner {
  width: 0.875rem;
  height: 0.875rem;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: var(--color-white);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Slide transition for the form */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Actions */
.account-view__actions {
  margin-top: 1.5rem;
}

.account-view__link {
  display: inline-block;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-white);
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.account-view__link:hover {
  background-color: var(--color-primary-dark);
}

@media (max-width: 600px) {
  .account-view__card {
    padding: 1.5rem 1rem;
  }
}
</style>

<template>
  <div class="admin-reset-password">
    <div class="admin-tool__header">
      <h2 class="admin-tool__title">{{ $t('admin.tools.resetPassword.title') }}</h2>
      <p class="admin-tool__description">{{ $t('admin.tools.resetPassword.description') }}</p>
    </div>

    <form class="admin-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="successUsername" class="admin-form__alert admin-form__alert--success" role="status">
        <strong>{{ $t('admin.resetPassword.success', { username: successUsername }) }}</strong>
        <span>{{ $t('admin.resetPassword.successHint') }}</span>
      </div>
      <div v-if="requestError" class="admin-form__alert admin-form__alert--error" role="alert">
        {{ requestError }}
      </div>

      <div class="admin-form__field">
        <label class="admin-form__label" for="admin-reset-username">
          {{ $t('admin.resetPassword.username') }}<span class="admin-form__required" aria-hidden="true">*</span>
        </label>
        <input
          id="admin-reset-username"
          ref="usernameInput"
          v-model.trim="form.username"
          type="text"
          class="admin-form__input"
          :class="{ 'admin-form__input--error': fieldErrors.username }"
          :placeholder="$t('admin.resetPassword.usernamePlaceholder')"
          :aria-invalid="!!fieldErrors.username"
          :aria-describedby="fieldErrors.username ? 'admin-reset-username-error' : undefined"
          autocomplete="off"
          spellcheck="false"
          :disabled="saving || confirming"
          @input="onFieldInput('username')"
        />
        <span v-if="fieldErrors.username" id="admin-reset-username-error" class="admin-form__field-error">
          {{ fieldErrors.username }}
        </span>
      </div>

      <div class="admin-form__field">
        <label class="admin-form__label" for="admin-reset-new-password">
          {{ $t('admin.resetPassword.newPassword') }}<span class="admin-form__required" aria-hidden="true">*</span>
        </label>
        <div class="admin-form__input-wrapper">
          <input
            id="admin-reset-new-password"
            v-model="form.newPassword"
            :type="showPassword ? 'text' : 'password'"
            class="admin-form__input admin-form__input--with-action"
            :class="{ 'admin-form__input--error': fieldErrors.newPassword }"
            :placeholder="$t('admin.resetPassword.newPasswordPlaceholder')"
            :aria-invalid="!!fieldErrors.newPassword"
            aria-describedby="admin-reset-new-password-hint"
            autocomplete="new-password"
            :disabled="saving || confirming"
            @input="onFieldInput('newPassword')"
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
        <span v-if="fieldErrors.newPassword" class="admin-form__field-error">
          {{ fieldErrors.newPassword }}
        </span>
        <span id="admin-reset-new-password-hint" class="admin-form__hint">
          {{ $t('admin.resetPassword.passwordHint', { min: MIN_PASSWORD_LENGTH }) }}
          <button
            type="button"
            class="admin-form__btn admin-form__btn--link"
            :disabled="saving || confirming"
            @click="generatePassword"
          >
            {{ $t('admin.resetPassword.generate') }}
          </button>
        </span>
      </div>

      <div class="admin-form__field">
        <label class="admin-form__label" for="admin-reset-confirm-password">
          {{ $t('admin.resetPassword.confirmPassword') }}<span class="admin-form__required" aria-hidden="true">*</span>
        </label>
        <input
          id="admin-reset-confirm-password"
          v-model="form.confirmPassword"
          :type="showPassword ? 'text' : 'password'"
          class="admin-form__input"
          :class="{ 'admin-form__input--error': fieldErrors.confirmPassword }"
          :placeholder="$t('admin.resetPassword.confirmPasswordPlaceholder')"
          :aria-invalid="!!fieldErrors.confirmPassword"
          autocomplete="new-password"
          :disabled="saving || confirming"
          @input="onFieldInput('confirmPassword')"
        />
        <span v-if="fieldErrors.confirmPassword" class="admin-form__field-error">
          {{ fieldErrors.confirmPassword }}
        </span>
      </div>

      <!-- Two-step submit: resetting someone else's password is disruptive, so ask for confirmation. -->
      <div v-if="confirming" class="admin-form__alert admin-form__alert--warning" role="alertdialog" aria-live="assertive">
        <strong>{{ $t('admin.resetPassword.confirmTitle', { username: form.username }) }}</strong>
        <span>{{ $t('admin.resetPassword.confirmMessage') }}</span>
        <div class="admin-form__alert-actions">
          <button type="button" class="admin-form__btn admin-form__btn--danger" :disabled="saving" @click="confirmReset">
            <span v-if="saving" class="admin-form__spinner" aria-hidden="true" />
            {{ saving ? $t('admin.resetPassword.resetting') : $t('admin.resetPassword.confirm') }}
          </button>
          <button type="button" class="admin-form__btn admin-form__btn--secondary" :disabled="saving" @click="confirming = false">
            {{ $t('admin.cancel') }}
          </button>
        </div>
      </div>

      <div v-else class="admin-form__actions">
        <button type="submit" class="admin-form__btn admin-form__btn--primary">
          {{ $t('admin.resetPassword.submit') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { resetUserPassword } from '../../api/admin.js'

const MIN_PASSWORD_LENGTH = 8
const GENERATED_PASSWORD_LENGTH = 14
// Excludes look-alike characters (0/O, 1/l/I) so the password is easy to share.
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?'

const ERROR_KEY_MAP = {
  'admin.resetPassword.userNotFound': 'admin.resetPassword.userNotFound',
  'admin.resetPassword.weakPassword': 'admin.resetPassword.passwordTooShort',
  'admin.forbidden': 'admin.forbidden'
}

const { t } = useI18n()

const form = reactive({ username: '', newPassword: '', confirmPassword: '' })
const fieldErrors = reactive({ username: '', newPassword: '', confirmPassword: '' })
const showPassword = ref(false)
const confirming = ref(false)
const saving = ref(false)
const requestError = ref('')
const successUsername = ref('')
const usernameInput = ref(null)

function onFieldInput(field) {
  fieldErrors[field] = ''
  successUsername.value = ''
}

function generatePassword() {
  const values = new Uint32Array(GENERATED_PASSWORD_LENGTH)
  crypto.getRandomValues(values)
  const password = Array.from(values, (v) => PASSWORD_ALPHABET[v % PASSWORD_ALPHABET.length]).join('')

  form.newPassword = password
  form.confirmPassword = password
  fieldErrors.newPassword = ''
  fieldErrors.confirmPassword = ''
  // Reveal the generated password so the admin can copy and share it.
  showPassword.value = true
}

function validate() {
  fieldErrors.username = form.username ? '' : t('admin.resetPassword.usernameRequired')
  fieldErrors.newPassword = form.newPassword.length >= MIN_PASSWORD_LENGTH
    ? ''
    : t('admin.resetPassword.passwordTooShort', { min: MIN_PASSWORD_LENGTH })
  fieldErrors.confirmPassword = form.newPassword === form.confirmPassword
    ? ''
    : t('admin.resetPassword.passwordMismatch')

  return !fieldErrors.username && !fieldErrors.newPassword && !fieldErrors.confirmPassword
}

function handleSubmit() {
  requestError.value = ''
  successUsername.value = ''

  if (validate()) {
    confirming.value = true
  }
}

async function confirmReset() {
  saving.value = true
  requestError.value = ''

  try {
    const result = await resetUserPassword({
      username: form.username,
      newPassword: form.newPassword
    })

    if (result.success) {
      successUsername.value = result.username || form.username
      form.username = ''
      form.newPassword = ''
      form.confirmPassword = ''
      showPassword.value = false
    } else {
      const key = ERROR_KEY_MAP[result.errorKey] ?? 'admin.resetPassword.error'
      requestError.value = t(key, { min: MIN_PASSWORD_LENGTH })
    }
  } catch {
    requestError.value = t('admin.resetPassword.error')
  } finally {
    saving.value = false
    confirming.value = false
  }

  if (successUsername.value) {
    // Inputs are re-enabled only after `confirming` resets, so focus on the next tick.
    await nextTick()
    usernameInput.value?.focus()
  }
}
</script>

<style scoped>
.admin-reset-password .admin-form {
  max-width: 28rem;
}
</style>

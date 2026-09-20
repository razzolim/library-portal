<template>
  <form class="login-form" @submit.prevent="handleSubmit">
    <div class="login-form__field">
      <label class="login-form__label" for="username">{{ $t('login.username') }}</label>
      <input
        id="username"
        v-model="username"
        class="login-form__input"
        type="text"
        :placeholder="$t('login.usernamePlaceholder')"
        required
        :disabled="props.isLoading"
      />
    </div>

    <div class="login-form__field">
      <label class="login-form__label" for="password">{{ $t('login.password') }}</label>
      <div class="login-form__input-wrapper">
        <input
          id="password"
          v-model="password"
          class="login-form__input login-form__input--with-toggle"
          :type="passwordFieldType"
          :placeholder="$t('login.passwordPlaceholder')"
          required
          :disabled="props.isLoading"
        />
        <button
          type="button"
          class="login-form__toggle-password"
          :aria-label="passwordFieldType === 'password' ? $t('login.showPassword') : $t('login.hidePassword')"
          :aria-pressed="showPassword"
          :disabled="props.isLoading"
          @click="togglePasswordVisibility"
        >
          <svg v-if="showPassword" class="login-form__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
            <path d="M17 7l-5 5" />
          </svg>
          <svg v-else class="login-form__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </button>
      </div>
    </div>

    <button
      class="login-form__submit"
      type="submit"
      :disabled="props.isLoading || !isValid"
    >
      <span v-if="props.isLoading">{{ $t('login.signingIn') }}</span>
      <span v-else>{{ $t('login.signIn') }}</span>
    </button>
  </form>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const username = ref('')
const password = ref('')
const showPassword = ref(false)

const passwordFieldType = computed(() => (showPassword.value ? 'text' : 'password'))
const isValid = computed(() => username.value.trim() && password.value.trim())

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value
}

function handleSubmit() {
  if (!isValid.value) return
  emit('submit', { username: username.value.trim(), password: password.value })
}
</script>

<style scoped>
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

.login-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-form__label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
}

.login-form__input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  background-color: var(--color-white);
  color: var(--color-text);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.login-form__input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.login-form__input:disabled {
  background-color: var(--color-muted);
  cursor: not-allowed;
}

.login-form__input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.login-form__input--with-toggle {
  width: 100%;
  padding-right: 2.75rem;
}

.login-form__toggle-password {
  position: absolute;
  right: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.login-form__toggle-password:hover:not(:disabled) {
  color: var(--color-text);
  background-color: var(--color-muted);
}

.login-form__toggle-password:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-form__toggle-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.login-form__submit {
  padding: 0.875rem 1rem;
  border: none;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary);
  color: var(--color-white);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.login-form__submit:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.login-form__submit:disabled {
  background-color: var(--color-border);
  cursor: not-allowed;
}
</style>

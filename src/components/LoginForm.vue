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
      <input
        id="password"
        v-model="password"
        class="login-form__input"
        type="password"
        :placeholder="$t('login.passwordPlaceholder')"
        required
        :disabled="props.isLoading"
      />
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

const isValid = computed(() => username.value.trim() && password.value.trim())

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

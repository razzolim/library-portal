<template>
  <div class="login-view">
    <div class="login-view__card">
      <div class="login-view__header">
        <span class="login-view__logo">📚</span>
        <h2 class="login-view__title">{{ $t('login.title') }}</h2>
        <p class="login-view__subtitle">{{ $t('login.subtitle') }}</p>
      </div>

      <div v-if="auth.error" class="login-view__error" role="alert">
        {{ auth.error }}
      </div>

      <LoginForm :is-loading="auth.isLoading" @submit="handleLogin" />

      <div class="login-view__hint">
        <p>{{ $t('login.demoCredentials') }}</p>
        <code>reader / reader</code>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginForm from '../components/LoginForm.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

async function handleLogin(credentials) {
  const success = await auth.login(credentials)

  if (success) {
    const redirect = route.query.redirect || '/library'
    router.push(redirect)
  }
}
</script>

<style scoped>
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background: linear-gradient(
    135deg,
    var(--color-bg) 0%,
    var(--color-bg-secondary) 100%
  );
}

.login-view__card {
  width: 100%;
  max-width: 420px;
  padding: 2.5rem;
  background-color: var(--color-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.login-view__header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.login-view__logo {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.75rem;
}

.login-view__title {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.login-view__subtitle {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.login-view__error {
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  border-radius: var(--radius-sm);
  background-color: var(--color-error-bg);
  color: var(--color-error);
  font-size: 0.9rem;
}

.login-view__hint {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--color-border);
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.login-view__hint p {
  margin: 0 0 0.5rem;
}

.login-view__hint code {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background-color: var(--color-muted);
  border-radius: var(--radius-sm);
  font-family: monospace;
  color: var(--color-text);
}
</style>

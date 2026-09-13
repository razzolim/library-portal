<template>
  <div class="app">
    <AppHeader v-if="auth.isAuthenticated" />
    <main class="main-content">
      <RouterView />
    </main>
    <footer v-if="auth.isAuthenticated" class="app-footer">
      <RouterLink :to="{ name: 'changelog' }" class="app-footer__link">
        {{ $t('changelog.title') }}
      </RouterLink>
    </footer>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppHeader from './components/AppHeader.vue'

const auth = useAuthStore()
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.app-footer {
  padding: 1rem 2rem;
  background-color: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
  text-align: center;
}

.app-footer__link {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
}

.app-footer__link:hover {
  text-decoration: underline;
}

@media (max-width: 600px) {
  .app-footer {
    padding: 1rem;
  }
}
</style>

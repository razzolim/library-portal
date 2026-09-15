<template>
  <div class="app">
    <AppHeader v-if="auth.isAuthenticated" />
    <main class="main-content">
      <RouterView />
    </main>
    <footer v-if="auth.isAuthenticated" class="app-footer">
      <span class="app-footer__version">{{ $t('app.version', { version: appVersion }) }}</span>
      <span class="app-footer__separator" aria-hidden="true">·</span>
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
import { getLatestChangelogVersion } from './utils/changelog.js'

const auth = useAuthStore()
const appVersion = getLatestChangelogVersion()
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

.app-footer__version,
.app-footer__separator {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.app-footer__separator {
  margin: 0 0.5rem;
}

@media (max-width: 600px) {
  .app-footer {
    padding: 1rem;
  }
}
</style>

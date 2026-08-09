<template>
  <header class="header">
    <div class="header__brand">
      <span class="header__logo">📚</span>
      <h1 class="header__title">{{ $t('app.title') }}</h1>
    </div>
    <div class="header__user">
      <span class="header__welcome">{{ $t('app.welcome', { name: auth.username }) }}</span>
      <LanguageSwitcher />
      <button class="header__logout" @click="handleLogout">{{ $t('app.logout') }}</button>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LanguageSwitcher from './LanguageSwitcher.vue'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background-color: var(--color-primary);
  color: var(--color-white);
  box-shadow: var(--shadow-sm);
}

.header__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header__logo {
  font-size: 1.5rem;
}

.header__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.header__user {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header__welcome {
  font-size: 0.9rem;
  opacity: 0.9;
}

.header__logout {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-white);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-white);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s ease;
}

.header__logout:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

@media (max-width: 600px) {
  .header {
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
  }

  .header__welcome {
    display: none;
  }
}
</style>

<template>
  <header class="header">
    <div class="header__brand">
      <span class="header__logo">📚</span>
      <h1 class="header__title">{{ $t('app.title') }}</h1>
    </div>
    <div class="header__user">
      <span class="header__welcome">{{ $t('app.welcome', { name: auth.username }) }}</span>
      <div class="header__profile" ref="menuRef">
        <button
          class="header__profile-button"
          :aria-expanded="isOpen"
          :aria-label="$t('profile.menuLabel')"
          @click="toggleMenu"
        >
          <svg class="header__profile-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </button>
        <ul v-if="isOpen" class="header__profile-dropdown" role="menu">
          <li role="none">
            <RouterLink :to="{ name: 'account' }" class="header__profile-option" role="menuitem" @click="closeMenu">
              {{ $t('profile.myAccount') }}
            </RouterLink>
          </li>
          <li role="none">
            <button class="header__profile-option header__profile-option--logout" role="menuitem" @click="handleLogout">
              {{ $t('app.logout') }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const isOpen = ref(false)
const menuRef = ref(null)

function toggleMenu() {
  isOpen.value = !isOpen.value
}

function closeMenu() {
  isOpen.value = false
}

function handleClickOutside(event) {
  if (menuRef.value && !menuRef.value.contains(event.target)) {
    closeMenu()
  }
}

function handleEscape(event) {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

async function handleLogout() {
  closeMenu()
  await auth.logout()
  router.push({ name: 'login' })
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
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

.header__profile {
  position: relative;
}

.header__profile-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: var(--radius-full);
  background-color: transparent;
  color: var(--color-white);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.header__profile-button:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.header__profile-button:focus {
  outline: none;
  border-color: var(--color-white);
}

.header__profile-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.header__profile-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 12rem;
  margin: 0;
  padding: 0.5rem 0;
  list-style: none;
  background-color: var(--color-white);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
}

.header__profile-option {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  color: var(--color-text);
  font-size: 0.95rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.header__profile-option:hover {
  background-color: var(--color-background-soft);
}

.header__profile-option--logout {
  border-top: 1px solid var(--color-border);
  color: var(--color-danger);
}

.header__profile-option--logout:hover {
  background-color: var(--color-danger-soft);
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

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
        <h2 class="account-view__section-title">{{ $t('account.preferences') }}</h2>
        <div class="account-view__preference">
          <LanguageSwitcher />
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
import { useAuthStore } from '../stores/auth'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'

const auth = useAuthStore()
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

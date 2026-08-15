<template>
  <div class="changelog-view">
    <div class="changelog-view__container">
      <h1 class="changelog-view__title">{{ $t('changelog.title') }}</h1>
      <ChangeLog />
      <div class="changelog-view__actions">
        <RouterLink :to="{ name: 'library' }" class="changelog-view__link">
          {{ $t('changelog.backToLibrary') }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import ChangeLog from '../components/ChangeLog.vue'
</script>

<style scoped>
.changelog-view {
  display: flex;
  justify-content: center;
  padding: 2rem 1rem;
}

.changelog-view__container {
  width: 100%;
  max-width: 48rem;
}

.changelog-view__title {
  margin: 0 0 1.5rem;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text);
}

.changelog-view__actions {
  margin-top: 1.5rem;
}

.changelog-view__link {
  display: inline-block;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-white);
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.changelog-view__link:hover {
  background-color: var(--color-primary-dark);
}
</style>

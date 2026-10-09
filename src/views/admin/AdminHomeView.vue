<template>
  <div class="admin-home">
    <div class="admin-tool__header">
      <h2 class="admin-tool__title">{{ $t('admin.overview') }}</h2>
      <p class="admin-tool__description">{{ $t('admin.overviewDescription') }}</p>
    </div>

    <ul class="admin-home__grid">
      <li v-for="tool in adminTools" :key="tool.key">
        <RouterLink :to="{ name: tool.route }" class="admin-home__card">
          <span class="admin-home__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path :d="tool.icon" />
            </svg>
          </span>
          <span class="admin-home__text">
            <span class="admin-home__card-title">{{ $t(`admin.tools.${tool.key}.title`) }}</span>
            <span class="admin-home__card-description">{{ $t(`admin.tools.${tool.key}.description`) }}</span>
          </span>
          <svg class="admin-home__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { adminTools } from './adminTools.js'
</script>

<style scoped>
.admin-home__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin-home__card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  height: 100%;
  padding: 1.25rem;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.admin-home__card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  text-decoration: none;
}

.admin-home__card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.admin-home__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  color: var(--color-primary-dark);
  background-color: var(--color-primary-soft);
  border-radius: var(--radius-md);
}

.admin-home__icon svg {
  width: 1.25rem;
  height: 1.25rem;
}

.admin-home__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.25rem;
}

.admin-home__card-title {
  font-weight: 600;
}

.admin-home__card-description {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.admin-home__arrow {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  align-self: center;
  color: var(--color-text-muted);
}
</style>

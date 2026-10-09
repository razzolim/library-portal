<template>
  <div class="admin-view">
    <div class="admin-view__container">
      <header class="admin-view__header">
        <span class="admin-view__badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {{ $t('admin.badge') }}
        </span>
        <h1 class="admin-view__title">{{ $t('admin.title') }}</h1>
        <p class="admin-view__subtitle">{{ $t('admin.subtitle') }}</p>
      </header>

      <div class="admin-view__layout">
        <nav class="admin-view__nav" :aria-label="$t('admin.navLabel')">
          <RouterLink
            :to="{ name: 'admin' }"
            class="admin-view__nav-link"
            exact-active-class="admin-view__nav-link--active"
          >
            <svg class="admin-view__nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            {{ $t('admin.overview') }}
          </RouterLink>

          <div v-for="group in groups" :key="group.name" class="admin-view__nav-group">
            <span class="admin-view__nav-group-title">{{ $t(`admin.groups.${group.name}`) }}</span>
            <RouterLink
              v-for="tool in group.tools"
              :key="tool.key"
              :to="{ name: tool.route }"
              class="admin-view__nav-link"
              active-class="admin-view__nav-link--active"
            >
              <svg class="admin-view__nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path :d="tool.icon" />
              </svg>
              {{ $t(`admin.tools.${tool.key}.title`) }}
            </RouterLink>
          </div>
        </nav>

        <section class="admin-view__panel">
          <RouterView />
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { adminTools, adminToolGroups } from './adminTools.js'

const groups = computed(() =>
  adminToolGroups
    .map((name) => ({ name, tools: adminTools.filter((tool) => tool.group === name) }))
    .filter((group) => group.tools.length > 0)
)
</script>

<style scoped>
.admin-view {
  padding: 2rem 1rem;
}

.admin-view__container {
  max-width: 64rem;
  margin: 0 auto;
}

.admin-view__header {
  margin-bottom: 1.5rem;
}

.admin-view__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-warning);
  background-color: var(--color-warning-bg);
  border-radius: var(--radius-full);
}

.admin-view__badge svg {
  width: 0.875rem;
  height: 0.875rem;
}

.admin-view__title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text);
}

.admin-view__subtitle {
  margin: 0.25rem 0 0;
  color: var(--color-text-muted);
}

.admin-view__layout {
  display: grid;
  grid-template-columns: 14rem 1fr;
  gap: 1.5rem;
  align-items: start;
}

.admin-view__nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  position: sticky;
  top: 1rem;
}

.admin-view__nav-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.75rem;
}

.admin-view__nav-group-title {
  padding: 0 0.75rem 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.admin-view__nav-link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-text);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.admin-view__nav-link:hover {
  background-color: var(--color-background-soft);
  text-decoration: none;
}

.admin-view__nav-link:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.admin-view__nav-link--active {
  color: var(--color-primary-dark);
  background-color: var(--color-primary-soft);
}

.admin-view__nav-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.admin-view__panel {
  min-width: 0;
  padding: 2rem;
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

@media (max-width: 768px) {
  .admin-view__layout {
    grid-template-columns: 1fr;
  }

  /* On small screens the sidebar becomes a horizontally scrollable tab bar. */
  .admin-view__nav {
    position: static;
    flex-direction: row;
    overflow-x: auto;
    padding: 0.5rem;
  }

  .admin-view__nav-group {
    flex-direction: row;
    margin-top: 0;
  }

  .admin-view__nav-group-title {
    display: none;
  }

  .admin-view__nav-link {
    white-space: nowrap;
  }

  .admin-view__panel {
    padding: 1.5rem 1rem;
  }
}
</style>

<style>
/*
 * Shared styles for admin tool screens rendered inside the admin panel.
 * Kept unscoped so every child view can reuse the same form building blocks.
 */
.admin-tool__header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.admin-tool__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.admin-tool__description {
  margin: 0.25rem 0 0;
  font-size: 0.9375rem;
  color: var(--color-text-muted);
}

.admin-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.admin-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.admin-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.admin-form__field--full {
  grid-column: 1 / -1;
}

.admin-form__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.admin-form__required {
  margin-left: 0.125rem;
  color: var(--color-error);
}

.admin-form__optional {
  margin-left: 0.25rem;
  font-weight: 400;
  color: var(--color-text-muted);
}

.admin-form__hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.admin-form__input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.admin-form__input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-family: inherit;
  font-size: 0.9375rem;
  color: var(--color-text);
  background-color: var(--color-white);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.admin-form__input--with-action {
  padding-right: 2.75rem;
}

textarea.admin-form__input {
  min-height: 7rem;
  resize: vertical;
}

.admin-form__input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.admin-form__input--error {
  border-color: var(--color-error);
}

.admin-form__input--error:focus {
  box-shadow: 0 0 0 3px rgba(153, 27, 27, 0.12);
}

.admin-form__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.admin-form__color {
  width: 3rem;
  height: 2.5rem;
  padding: 0.125rem;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-white);
  cursor: pointer;
}

.admin-form__icon-btn {
  position: absolute;
  right: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.admin-form__icon-btn:hover {
  color: var(--color-text);
}

.admin-form__field-error {
  font-size: 0.8rem;
  color: var(--color-error);
}

.admin-form__alert {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.875rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}

.admin-form__alert strong {
  font-weight: 600;
}

.admin-form__alert--success {
  color: var(--color-success);
  background-color: var(--color-success-bg);
}

.admin-form__alert--error {
  color: var(--color-error);
  background-color: var(--color-error-bg);
}

.admin-form__alert--warning {
  color: var(--color-warning);
  background-color: var(--color-warning-bg);
}

.admin-form__alert-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.admin-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.admin-form__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  border: 1.5px solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.admin-form__btn:hover {
  text-decoration: none;
}

.admin-form__btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.admin-form__btn--primary {
  color: var(--color-white);
  background-color: var(--color-primary);
}

.admin-form__btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.admin-form__btn--danger {
  color: var(--color-white);
  background-color: var(--color-danger);
}

.admin-form__btn--danger:hover:not(:disabled) {
  filter: brightness(0.9);
}

.admin-form__btn--secondary {
  color: var(--color-text);
  background-color: var(--color-white);
  border-color: var(--color-border);
}

.admin-form__btn--secondary:hover:not(:disabled) {
  background-color: var(--color-background-soft);
}

.admin-form__btn--link {
  padding: 0;
  color: inherit;
  background: none;
  text-decoration: underline;
}

.admin-form__spinner {
  width: 0.875rem;
  height: 0.875rem;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: var(--color-white);
  border-radius: 50%;
  animation: admin-spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes admin-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .admin-form__grid {
    grid-template-columns: 1fr;
  }

  .admin-form__actions .admin-form__btn {
    flex: 1;
  }
}
</style>

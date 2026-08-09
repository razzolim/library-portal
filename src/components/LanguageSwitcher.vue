<template>
  <div class="language-switcher">
    <label for="language-select" class="language-switcher__label">{{ $t('language.label') }}:</label>
    <select
      id="language-select"
      :value="currentLocale"
      class="language-switcher__select"
      @change="handleChange"
    >
      <option
        v-for="locale in availableLocales"
        :key="locale.code"
        :value="locale.code"
      >
        {{ locale.flag }} {{ locale.label }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { availableLocales, setLocale, getCurrentLocale } from '../i18n'

const currentLocale = computed(() => getCurrentLocale())

function handleChange(event) {
  setLocale(event.target.value)
}
</script>

<style scoped>
.language-switcher {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.language-switcher__label {
  font-size: 0.9rem;
  color: var(--color-white);
  opacity: 0.9;
}

.language-switcher__select {
  padding: 0.4rem 1.75rem 0.4rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: var(--radius-sm);
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--color-white);
  font-size: 0.85rem;
  cursor: pointer;
}

.language-switcher__select:focus {
  outline: none;
  border-color: var(--color-white);
}

.language-switcher__select option {
  background-color: var(--color-white);
  color: var(--color-text);
}

@media (max-width: 600px) {
  .language-switcher__label {
    display: none;
  }
}
</style>

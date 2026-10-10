<template>
  <div class="admin-flags">
    <div class="admin-tool__header">
      <h2 class="admin-tool__title">{{ $t('admin.tools.featureFlags.title') }}</h2>
      <p class="admin-tool__description">{{ $t('admin.tools.featureFlags.description') }}</p>
    </div>

    <div v-if="notice" class="admin-form__alert admin-form__alert--success" role="status">{{ notice }}</div>
    <div v-if="actionError" class="admin-form__alert admin-form__alert--error" role="alert">{{ actionError }}</div>

    <form class="admin-form admin-flags__create" novalidate @submit.prevent="handleCreate">
      <h3 class="admin-flags__section-title">{{ $t('admin.featureFlags.createTitle') }}</h3>

      <div class="admin-form__field">
        <label class="admin-form__label" for="admin-flag-key">
          {{ $t('admin.featureFlags.key') }}<span class="admin-form__required" aria-hidden="true">*</span>
        </label>
        <input
          id="admin-flag-key"
          v-model.trim="form.key"
          type="text"
          class="admin-form__input"
          :class="{ 'admin-form__input--error': keyError }"
          :placeholder="$t('admin.featureFlags.keyPlaceholder')"
          :aria-invalid="!!keyError"
          autocomplete="off"
          spellcheck="false"
          :disabled="creating"
          @input="keyError = ''"
        />
        <span v-if="keyError" class="admin-form__field-error">{{ keyError }}</span>
        <span v-else class="admin-form__hint">{{ $t('admin.featureFlags.keyHint') }}</span>
      </div>

      <div class="admin-form__field">
        <label class="admin-form__label" for="admin-flag-description">
          {{ $t('admin.featureFlags.descriptionLabel') }} <span class="admin-form__optional">{{ $t('admin.optional') }}</span>
        </label>
        <input
          id="admin-flag-description"
          v-model.trim="form.description"
          type="text"
          class="admin-form__input"
          maxlength="255"
          :placeholder="$t('admin.featureFlags.descriptionPlaceholder')"
          :disabled="creating"
        />
      </div>

      <div class="admin-form__actions">
        <button type="submit" class="admin-form__btn admin-form__btn--primary" :disabled="creating">
          <span v-if="creating" class="admin-form__spinner" aria-hidden="true" />
          {{ creating ? $t('admin.featureFlags.creating') : $t('admin.featureFlags.create') }}
        </button>
      </div>
    </form>

    <h3 class="admin-flags__section-title">{{ $t('admin.featureFlags.listTitle') }}</h3>

    <LoadingSpinner v-if="isLoading" :message="$t('admin.featureFlags.loading')" />

    <div v-else-if="loadError" class="admin-form__alert admin-form__alert--error" role="alert">
      <span>{{ loadError }}</span>
      <div class="admin-form__alert-actions">
        <button type="button" class="admin-form__btn admin-form__btn--secondary" @click="loadFlags">
          {{ $t('admin.users.retry') }}
        </button>
      </div>
    </div>

    <p v-else-if="flags.length === 0" class="admin-flags__empty">{{ $t('admin.featureFlags.empty') }}</p>

    <ul v-else class="admin-flags__list">
      <li v-for="flag in flags" :key="flag.key" class="admin-flags__item" data-test="flag">
        <div class="admin-flags__info">
          <code class="admin-flags__key">{{ flag.key }}</code>
          <p v-if="flag.description" class="admin-flags__text">{{ flag.description }}</p>
          <p class="admin-flags__meta">
            {{ flag.updatedBy
              ? $t('admin.featureFlags.updatedBy', { user: flag.updatedBy, date: formatDateTime(flag.updatedAt, locale) })
              : $t('admin.featureFlags.updatedAt', { date: formatDateTime(flag.updatedAt, locale) }) }}
          </p>

          <div v-if="pendingDelete === flag.key" class="admin-form__alert admin-form__alert--warning" role="alertdialog">
            <strong>{{ $t('admin.featureFlags.deleteTitle', { key: flag.key }) }}</strong>
            <span>{{ $t('admin.featureFlags.deleteMessage') }}</span>
            <div class="admin-form__alert-actions">
              <button
                type="button"
                class="admin-form__btn admin-form__btn--danger"
                data-test="confirm-delete"
                :disabled="busyKey === flag.key"
                @click="confirmDelete(flag)"
              >
                {{ $t('admin.featureFlags.confirmDelete') }}
              </button>
              <button
                type="button"
                class="admin-form__btn admin-form__btn--secondary"
                :disabled="busyKey === flag.key"
                @click="pendingDelete = ''"
              >
                {{ $t('admin.cancel') }}
              </button>
            </div>
          </div>
        </div>

        <div class="admin-flags__controls">
          <button
            type="button"
            role="switch"
            class="admin-flags__switch"
            :class="{ 'admin-flags__switch--on': flag.enabled }"
            :aria-checked="flag.enabled"
            :aria-label="$t('admin.featureFlags.toggleLabel', { key: flag.key })"
            :disabled="busyKey === flag.key"
            data-test="toggle"
            @click="toggle(flag)"
          >
            <span class="admin-flags__knob" />
          </button>
          <span class="admin-flags__state">
            {{ flag.enabled ? $t('admin.featureFlags.on') : $t('admin.featureFlags.off') }}
          </span>
          <button
            type="button"
            class="admin-form__btn admin-form__btn--link"
            data-test="delete"
            :disabled="busyKey === flag.key"
            @click="pendingDelete = flag.key"
          >
            {{ $t('admin.featureFlags.delete') }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  fetchFeatureFlags,
  createFeatureFlag,
  setFeatureFlagEnabled,
  deleteFeatureFlag,
  FEATURE_FLAG_KEY_PATTERN
} from '../../api/admin.js'
import { useAuthStore } from '../../stores/auth'
import { formatDateTime } from '../../utils/date.js'
import LoadingSpinner from '../../components/LoadingSpinner.vue'

const ERROR_KEYS = [
  'admin.featureFlags.invalidKey',
  'admin.featureFlags.duplicateKey',
  'admin.featureFlags.notFound',
  'admin.forbidden'
]

const { t, locale } = useI18n()
const auth = useAuthStore()

const flags = ref([])
const isLoading = ref(true)
const loadError = ref('')
const actionError = ref('')
const notice = ref('')
const form = reactive({ key: '', description: '' })
const keyError = ref('')
const creating = ref(false)
const busyKey = ref('')
const pendingDelete = ref('')

function messageFor(errorKey) {
  return t(ERROR_KEYS.includes(errorKey) ? errorKey : 'admin.featureFlags.error')
}

async function loadFlags() {
  isLoading.value = true
  loadError.value = ''
  try {
    flags.value = await fetchFeatureFlags()
  } catch {
    loadError.value = t('admin.featureFlags.loadError')
  } finally {
    isLoading.value = false
  }
}

async function handleCreate() {
  notice.value = ''
  actionError.value = ''

  if (!FEATURE_FLAG_KEY_PATTERN.test(form.key)) {
    keyError.value = t('admin.featureFlags.invalidKey')
    return
  }

  creating.value = true
  try {
    const result = await createFeatureFlag(
      { key: form.key, description: form.description, enabled: false },
      { actor: auth.user?.username }
    )
    if (result.success) {
      notice.value = t('admin.featureFlags.created', { key: result.flag.key })
      form.key = ''
      form.description = ''
      await loadFlags()
    } else if (result.errorKey === 'admin.featureFlags.invalidKey' || result.errorKey === 'admin.featureFlags.duplicateKey') {
      keyError.value = messageFor(result.errorKey)
    } else {
      actionError.value = messageFor(result.errorKey)
    }
  } catch {
    actionError.value = t('admin.featureFlags.error')
  } finally {
    creating.value = false
  }
}

async function toggle(flag) {
  notice.value = ''
  actionError.value = ''
  busyKey.value = flag.key
  try {
    const result = await setFeatureFlagEnabled(flag.key, !flag.enabled, { actor: auth.user?.username })
    if (result.success) {
      Object.assign(flag, result.flag)
      notice.value = t(result.flag.enabled ? 'admin.featureFlags.enabledNotice' : 'admin.featureFlags.disabledNotice', { key: flag.key })
    } else {
      actionError.value = messageFor(result.errorKey)
    }
  } catch {
    actionError.value = t('admin.featureFlags.error')
  } finally {
    busyKey.value = ''
  }
}

async function confirmDelete(flag) {
  notice.value = ''
  actionError.value = ''
  busyKey.value = flag.key
  try {
    const result = await deleteFeatureFlag(flag.key)
    if (result.success) {
      flags.value = flags.value.filter((f) => f.key !== flag.key)
      notice.value = t('admin.featureFlags.deleted', { key: flag.key })
    } else {
      actionError.value = messageFor(result.errorKey)
    }
  } catch {
    actionError.value = t('admin.featureFlags.error')
  } finally {
    busyKey.value = ''
    pendingDelete.value = ''
  }
}

onMounted(loadFlags)
</script>

<style scoped>
.admin-flags .admin-form {
  max-width: 28rem;
}

.admin-flags__create {
  margin-bottom: 2rem;
}

.admin-flags__section-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.admin-flags__empty {
  color: var(--color-text-muted, #6b7280);
}

.admin-flags__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.admin-flags__item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 0.5rem);
}

.admin-flags__info {
  min-width: 0;
  flex: 1;
}

.admin-flags__key {
  font-weight: 600;
  word-break: break-all;
}

.admin-flags__text {
  margin: 0.25rem 0 0;
}

.admin-flags__meta {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #6b7280);
}

.admin-flags__controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.admin-flags__state {
  min-width: 1.75rem;
  font-size: 0.875rem;
}

.admin-flags__switch {
  position: relative;
  width: 2.75rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: #9ca3af;
  cursor: pointer;
  transition: background 0.15s;
}

.admin-flags__switch--on {
  background: #16a34a;
}

.admin-flags__switch:disabled {
  opacity: 0.6;
  cursor: wait;
}

.admin-flags__switch:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.admin-flags__knob {
  position: absolute;
  top: 0.1875rem;
  left: 0.1875rem;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s;
}

.admin-flags__switch--on .admin-flags__knob {
  transform: translateX(1.25rem);
}

@media (max-width: 600px) {
  .admin-flags__item {
    flex-direction: column;
  }
}
</style>

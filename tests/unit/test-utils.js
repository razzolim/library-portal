import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '../../src/i18n/locales/en.json'
import ptBR from '../../src/i18n/locales/pt-BR.json'

export function createTestI18n(locale = 'en') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: {
      en,
      'pt-BR': ptBR
    }
  })
}

export function mountWithI18n(component, options = {}) {
  const i18n = createTestI18n(options.locale || 'en')

  const mergedOptions = {
    ...options,
    global: {
      plugins: [i18n],
      ...(options.global || {})
    }
  }

  // If global.plugins was provided, merge it rather than overwrite
  if (options.global?.plugins) {
    mergedOptions.global.plugins = [i18n, ...options.global.plugins]
  }

  return mount(component, mergedOptions)
}

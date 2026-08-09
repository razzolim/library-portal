import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ptBR from './locales/pt-BR.json'

const STORAGE_KEY = 'library_portal_locale'

const messages = {
  en,
  'pt-BR': ptBR
}

function detectLocale() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && messages[stored]) {
    return stored
  }

  const browserLocale = navigator.language || 'en'
  if (browserLocale.toLowerCase().startsWith('pt')) {
    return 'pt-BR'
  }

  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages
})

export function setLocale(locale) {
  i18n.global.locale.value = locale
  localStorage.setItem(STORAGE_KEY, locale)
}

export function getCurrentLocale() {
  return i18n.global.locale.value
}

export const availableLocales = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' }
]

export default i18n

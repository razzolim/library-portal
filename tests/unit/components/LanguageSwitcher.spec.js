import { describe, it, expect } from 'vitest'
import { mountWithI18n } from '../test-utils.js'
import LanguageSwitcher from '../../../src/components/LanguageSwitcher.vue'
import { setLocale, getCurrentLocale } from '../../../src/i18n'

describe('LanguageSwitcher', () => {
  it('renders the language select', () => {
    const wrapper = mountWithI18n(LanguageSwitcher)
    expect(wrapper.find('select').exists()).toBe(true)
  })

  it('lists available locales', () => {
    const wrapper = mountWithI18n(LanguageSwitcher)
    const options = wrapper.findAll('option')

    expect(options.length).toBe(2)
    expect(options[0].element.value).toBe('en')
    expect(options[1].element.value).toBe('pt-BR')
  })

  it('reflects the current locale', () => {
    setLocale('pt-BR')
    const wrapper = mountWithI18n(LanguageSwitcher)

    expect(wrapper.find('select').element.value).toBe('pt-BR')

    // Reset to English to avoid side effects
    setLocale('en')
  })
})

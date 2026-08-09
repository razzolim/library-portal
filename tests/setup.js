import { setLocale } from '../src/i18n'

// Ensure all tests run with the English locale by default to avoid flakiness
// caused by locale changes from other tests or localStorage.
setLocale('en')

export function setup() {
  setLocale('en')
}

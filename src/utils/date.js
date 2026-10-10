export function formatDate(dateString, locale = 'en') {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

/**
 * Date and time, e.g. "Oct 9, 2026, 6:14 PM" (en) or "9 de out. de 2026, 18:14" (pt-BR).
 */
export function formatDateTime(dateString, locale = 'en') {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

const RELATIVE_UNITS = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60]
]

/**
 * How long ago a date was, e.g. "3 days ago", "yesterday", "há 2 horas".
 * Anything under a minute reads as "now". Future dates read as "in …".
 */
export function formatRelativeTime(dateString, locale = 'en', now = Date.now()) {
  if (!dateString) return ''
  const time = new Date(dateString).getTime()
  if (isNaN(time)) return ''

  const seconds = Math.round((time - now) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      return formatter.format(Math.round(seconds / unitSeconds), unit)
    }
  }
  return formatter.format(0, 'second')
}

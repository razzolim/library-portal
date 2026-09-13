import { marked } from 'marked'
import DOMPurify from 'dompurify'

/**
 * Render a Markdown string to sanitized HTML.
 * This is used by the change log component to display rich descriptions.
 *
 * @param {string} markdown
 * @returns {string} Sanitized HTML.
 */
export function renderMarkdown(markdown) {
  if (!markdown) return ''

  const rawHtml = marked.parse(markdown, { async: false })
  return DOMPurify.sanitize(rawHtml)
}

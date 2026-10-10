export const MIN_PASSWORD_LENGTH = 8

const GENERATED_PASSWORD_LENGTH = 14
// Excludes look-alike characters (0/O, 1/l/I) so the password is easy to share.
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?'

/**
 * Generates a random password using the Web Crypto API.
 */
export function generatePassword(length = GENERATED_PASSWORD_LENGTH) {
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  return Array.from(values, (v) => PASSWORD_ALPHABET[v % PASSWORD_ALPHABET.length]).join('')
}

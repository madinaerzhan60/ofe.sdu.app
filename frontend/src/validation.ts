import type { Member } from './model'

export const SDU_EMAIL = /^[a-z0-9._%+-]+@sdu\.edu\.kz$/i

export const normalizeEmail = (value: string) => value.trim().toLowerCase()
export const isSduEmail = (value: string) => SDU_EMAIL.test(normalizeEmail(value))

/** Accepts "@name", "name", "t.me/name" or "https://t.me/name". */
export function normalizeTelegram(value: string) {
  const handle = value.trim().replace(/^https?:\/\//i, '').replace(/^(www\.)?(t|telegram)\.me\//i, '').replace(/^@+/, '').replace(/\s+/g, '')
  return handle ? '@' + handle : ''
}
export const isTelegram = (value: string) => /^@[A-Za-z0-9_]{5,32}$/.test(normalizeTelegram(value))

/** Kazakhstan numbers: 8 701 123 45 67, +7 (701) 123-45-67 or 7011234567 → +77011234567. */
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) return '+7' + digits.slice(1)
  if (digits.length === 10) return '+7' + digits
  return value.trim()
}
export const isPhone = (value: string) => /^\+7\d{10}$/.test(normalizePhone(value))
export function formatPhone(value: string) {
  const phone = normalizePhone(value)
  const m = phone.match(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/)
  return m ? `+7 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : value
}

/** Public, non-identifying team summary stored in the project's `team` field. */
export function teamSummary(members: Member[], ownerRole = 'Founder') {
  const roles = [ownerRole, ...members.map(member => member.role)]
  return roles.join(', ')
}

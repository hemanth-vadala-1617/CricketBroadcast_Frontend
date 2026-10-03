import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Follows the host the page was opened from (192.168.1.6 -> http://192.168.1.6:5141) unless VITE_API_URL is set.
export const API_URL: string = (import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5141`).replace(/\/$/, '')

/** Uploaded files come back as "/uploads/x.png"; make them loadable from the SPA origin. */
export function assetUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return /^(https?:|data:|blob:)/i.test(url) ? url : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

export function newId(): string {
  return crypto.randomUUID()
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** <input type="datetime-local"> value <-> ISO */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

/** Readable text colour (black/white) for a hex background. */
export function contrastText(hex: string | null | undefined): string {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return '#ffffff'
  const n = parseInt(hex.slice(1), 16)
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.6 ? '#0f172a' : '#ffffff'
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

/** Indian digit grouping: 100000 -> "1,00,000". */
export function formatIndianNumber(n: number): string {
  return Math.trunc(n).toLocaleString('en-IN')
}

/** Digits only (commas, spaces, letters ignored), no leading zeros, optional cap. null = nothing typed. */
export function parseWholeNumber(text: string, max?: number): number | null {
  const digits = text.replace(/\D/g, '').slice(0, 15)
  if (!digits) return null
  const n = Number(digits)
  return max === undefined ? n : Math.min(n, max)
}

/** Index in `formatted` just after its Nth digit (used to keep the caret still while commas appear). */
export function caretAfterDigits(formatted: string, digits: number): number {
  if (digits <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]!)) seen++
    if (seen === digits) return i + 1
  }
  return formatted.length
}
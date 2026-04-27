/**
 * Astrology Scheduling API
 * Completely separate from bookingsAPI — no overlap.
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Attach JWT from localStorage automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const astrologyAPI = {
  // ── Availability (SuperAdmin) ─────────────────────────────────────────
  getAvailability: () =>
    api.get('/astrology/availability/'),

  updateAvailability: (data) =>
    api.put('/astrology/availability/', data),

  // ── Slots (Client) ───────────────────────────────────────────────────
  getSlots: (date, clientTimezone) =>
    api.get('/astrology/slots/', {
      params: { date, client_timezone: clientTimezone },
    }),

  // ── Schedule ─────────────────────────────────────────────────────────
  bookSlot: (bookingId, startUtc, clientTimezone) =>
    api.post('/astrology/schedule/', {
      booking_id:      bookingId,
      start_utc:       startUtc,
      client_timezone: clientTimezone,
    }),

  listSchedules: () =>
    api.get('/astrology/schedule/'),

  getMySchedule: (bookingId) =>
    api.get('/astrology/schedule/', { params: { booking_id: bookingId } }),

  cancelSchedule: (scheduleId) =>
    api.delete(`/astrology/schedule/${scheduleId}/`),
}

// ── Timezone helpers (browser-native, no extra deps) ─────────────────────

/** Returns the browser's IANA timezone, e.g. "America/New_York" */
export function detectTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Format a UTC ISO string in a given IANA timezone.
 * @param {string} isoUtc   — e.g. "2026-04-26T09:00:00+00:00"
 * @param {string} tz       — IANA tz, e.g. "Asia/Kolkata"
 * @param {object} opts     — Intl.DateTimeFormat options
 */
export function formatInTz(isoUtc, tz, opts = {}) {
  const d = new Date(isoUtc)
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }).format(d)
}

/** Format as "Mon, 26 Apr" in the given timezone */
export function formatDateInTz(isoUtc, tz) {
  return formatInTz(isoUtc, tz, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Format as "09:00 AM" in the given timezone */
export function formatTimeInTz(isoUtc, tz) {
  return formatInTz(isoUtc, tz, { hour: '2-digit', minute: '2-digit', hour12: true })
}

/** Next N calendar dates from today (inclusive), as 'YYYY-MM-DD' strings */
export function getUpcomingDates(n = 14) {
  const dates = []
  const now   = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${day}`)
  }
  return dates
}

/** Format 'YYYY-MM-DD' as 'Mon, 26 Apr' */
export function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).format(d)
}

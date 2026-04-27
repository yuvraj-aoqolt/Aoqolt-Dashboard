import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { sessionsAPI } from '../../api'
import { FiCalendar, FiClock, FiCheck, FiAlertTriangle, FiGlobe } from 'react-icons/fi'
import toast from 'react-hot-toast'

// ── Timezone detection ────────────────────────────────────────────────────

/** Auto-detect the browser's IANA timezone; falls back to 'UTC'. */
function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// ── Date / slot helpers ───────────────────────────────────────────────────

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

function getMaxDateStr() {
  const d = new Date()
  d.setDate(d.getDate() + 60)
  return d.toISOString().split('T')[0]
}

/**
 * getTimezoneOffsetMs, localHourToUtc, buildSlots — removed.
 * Slots are now fetched from the backend (global availability engine).
 */

/** Format a UTC Date as wall-clock time in `timezone`. */
function fmtTimeInTz(date, timezone) {
  if (!date) return '—'
  try {
    return date.toLocaleTimeString([], { timeZone: timezone, hour: '2-digit', minute: '2-digit' })
  } catch {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

/** Format a UTC Date as a full datetime string in `timezone`. */
function fmtInTz(date, timezone) {
  if (!date) return '—'
  try {
    return date.toLocaleString([], {
      timeZone: timezone,
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })
  } catch {
    return date.toLocaleString()
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function SessionBookingPage() {
  const { token } = useParams()

  // Auto-detect once — never changes
  const clientTimezone = useMemo(() => detectTimezone(), [])

  const [phase, setPhase]               = useState('loading')
  const [errorMsg, setErrorMsg]         = useState('')
  const [sessionInfo, setSessionInfo]   = useState(null)
  const [selectedDate, setSelectedDate] = useState(getTodayStr())
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [slots, setSlots]               = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [bookedData, setBookedData]     = useState(null)

  useEffect(() => {
    sessionsAPI.validateToken(token)
      .then(({ data }) => { setSessionInfo(data.data); setPhase('booking') })
      .catch((err) => {
        setErrorMsg(err.response?.data?.error || 'This link is invalid or has expired.')
        setPhase('error')
      })
  }, [token])

  // Fetch available slots from the global slot engine whenever the date changes
  useEffect(() => {
    if (phase !== 'booking') return
    setSlotsLoading(true)
    setSelectedSlot(null)
    sessionsAPI.getSlots(token, selectedDate, clientTimezone)
      .then(({ data }) => {
        setSlots(
          (data.slots || [])
            .filter(s => s.available)
            .map(s => ({ startUtc: new Date(s.start_utc), endUtc: new Date(s.end_utc) }))
        )
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [token, selectedDate, clientTimezone, phase])

  const handleBook = async () => {
    if (!selectedSlot) return
    setSubmitting(true)
    try {
      const { data } = await sessionsAPI.bookSlot(token, {
        session_start:   selectedSlot.startUtc.toISOString(),
        session_end:     selectedSlot.endUtc.toISOString(),
        client_timezone: clientTimezone,
      })
      setBookedData(data.data)
      setPhase('success')
      toast.success('Session booked successfully!')
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to book slot. Please try again.'
      toast.error(typeof msg === 'string' ? msg : 'Failed to book slot.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white/40">
          <div className="w-10 h-10 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
          <p className="text-sm">Validating your booking link…</p>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#111] border border-red-900/30 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-900/20 border border-red-900/30 flex items-center justify-center mx-auto mb-4">
            <FiAlertTriangle size={24} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Link Unavailable</h2>
          <p className="text-white/50 text-sm">{errorMsg}</p>
          <p className="text-white/25 text-xs mt-4">
            Please contact us to request a new booking link.
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'success') {
    const startDate = bookedData?.session_start ? new Date(bookedData.session_start) : null
    const endDate   = bookedData?.session_end   ? new Date(bookedData.session_end)   : null
    const tz        = bookedData?.client_timezone || clientTimezone

    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#111] border border-green-900/30 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-900/20 border border-green-900/30 flex items-center justify-center mx-auto mb-5">
            <FiCheck size={28} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Session Booked!</h2>
          <p className="text-white/50 text-sm mb-6">
            Your session has been confirmed. You will receive further details by email.
          </p>
          {startDate && (
            <div className="bg-white/[0.04] border border-white/8 rounded-xl p-4 text-left space-y-3">
              <div className="flex items-start gap-3">
                <FiCalendar size={14} className="text-white/40 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-0.5">Start</p>
                  <p className="text-sm text-white/80">{fmtInTz(startDate, tz)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FiClock size={14} className="text-white/40 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-0.5">End</p>
                  <p className="text-sm text-white/80">{fmtInTz(endDate, tz)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FiGlobe size={14} className="text-white/40 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-0.5">Timezone</p>
                  <p className="text-sm text-white/60">{tz}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Booking form ────────────────────────────────────────────────────────

  const expiryDate = sessionInfo?.link_expiry ? new Date(sessionInfo.link_expiry) : null
  const minsLeft   = expiryDate ? Math.max(0, Math.floor((expiryDate - Date.now()) / 60000)) : null

  return (
    <div className="min-h-screen bg-[#080808] px-4 py-10">
      <div className="max-w-lg mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <img
            src="/Aoqolt logo 1-01-02.png"
            alt="Aoqolt"
            className="h-12 object-contain"
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>

        <div className="bg-[#111] border border-white/8 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-white">Book Your Aura Session</h1>
                {sessionInfo?.service_name && (
                  <p className="text-white/40 text-sm mt-0.5">{sessionInfo.service_name}</p>
                )}
                {sessionInfo?.booking_ref && (
                  <p className="text-white/25 text-xs mt-0.5">Booking {sessionInfo.booking_ref}</p>
                )}
              </div>
              {minsLeft !== null && minsLeft > 0 && (
                <div className="flex-shrink-0 flex items-center gap-1.5 bg-orange-900/20 border border-orange-900/30 text-orange-300 text-xs px-3 py-1.5 rounded-full">
                  <FiClock size={11} />
                  Expires in {minsLeft}m
                </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">

            {/* Timezone display — auto-detected, read-only */}
            <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
              <FiGlobe size={14} className="text-white/40 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white/30 text-[11px] uppercase tracking-wider font-semibold">Your timezone</p>
                <p className="text-white/70 text-sm font-medium truncate">{clientTimezone}</p>
              </div>
              <span className="ml-auto flex-shrink-0 text-[10px] bg-green-900/20 text-green-400 border border-green-900/30 px-2 py-0.5 rounded-full">
                Auto-detected
              </span>
            </div>

            {/* Step 1: Pick date */}
            <div>
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-2">
                1. Select a date
              </label>
              <input
                type="date"
                value={selectedDate}
                min={getTodayStr()}
                max={getMaxDateStr()}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-white/20 [color-scheme:dark]"
              />
            </div>

            {/* Step 2: Pick time slot */}
            <div>
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-2">
                2. Select a time slot
              </label>

              {slotsLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-white/30">
                  <div className="w-4 h-4 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
                  <span className="text-xs">Loading slots…</span>
                </div>
              ) : slots.length === 0 ? (
                <p className="text-white/30 text-sm italic py-4 text-center">
                  No available slots for this date. Please pick another date.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot, i) => {
                    const isSelected = selectedSlot?.startUtc.getTime() === slot.startUtc.getTime()
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                          isSelected
                            ? 'bg-[#F20000]/25 border-red-600/50 text-white'
                            : 'bg-white/[0.04] border-white/8 text-white/60 hover:bg-white/[0.08] hover:text-white/80'
                        }`}
                      >
                        {fmtTimeInTz(slot.startUtc, clientTimezone)}
                        <span className="text-[11px] opacity-60 block">
                          – {fmtTimeInTz(slot.endUtc, clientTimezone)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Selected slot preview */}
            {selectedSlot && (
              <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 space-y-1">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Selected slot</p>
                <p className="text-white text-sm font-medium">
                  {fmtInTz(selectedSlot.startUtc, clientTimezone)}
                </p>
                <p className="text-white/40 text-xs">
                  to {fmtInTz(selectedSlot.endUtc, clientTimezone)}
                </p>
              </div>
            )}

            {/* Book button */}
            <button
              onClick={handleBook}
              disabled={!selectedSlot || submitting}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40"
              style={{
                background: selectedSlot && !submitting
                  ? 'linear-gradient(to right, #F20000, #8B0000)'
                  : '#333',
              }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Booking…
                </span>
              ) : 'Confirm Booking'}
            </button>

            <p className="text-white/15 text-xs text-center">
              No account required · One-time link · Times shown in your local timezone
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import SuperAdminLayout from './SuperAdminLayout'
import { sessionsAPI, bookingsAPI } from '../../api'
import { astrologyAPI, formatTimeInTz, formatDateLabel } from '../../api/astrology'
import {
  FiCalendar, FiLink, FiCopy, FiRefreshCw, FiCheck, FiClock, FiMail, FiZap, FiArrowRight,
  FiGlobe, FiSave, FiPlus, FiTrash2, FiAlertCircle,
  FiSearch, FiChevronDown, FiChevronUp, FiEdit2, FiUser, FiMapPin, FiPhone, FiX,
} from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'
import toast from 'react-hot-toast'

// ── Availability helpers ─────────────────────────────────────────────────
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABEL = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' }
const DEFAULT_DAYS = Object.fromEntries(DAYS.map(d => [d, { enabled: false, ranges: [] }]))
const POPULAR_TZ = [
  'UTC',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Sao_Paulo', 'America/Mexico_City',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok',
  'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Asia/Seoul',
  'Australia/Sydney', 'Pacific/Auckland', 'Africa/Nairobi', 'Africa/Cairo',
]

function scheduleToForm(weekly_schedule = {}) {
  const days = { ...DEFAULT_DAYS }
  DAYS.forEach(day => {
    const ranges = (weekly_schedule[day] || []).map(r => {
      const [start = '09:00', end = '17:00'] = r.split('-')
      return { start, end }
    })
    days[day] = { enabled: ranges.length > 0, ranges }
  })
  return days
}

function formToSchedule(days) {
  const schedule = {}
  DAYS.forEach(day => {
    schedule[day] = days[day].enabled
      ? days[day].ranges.map(r => `${r.start}-${r.end}`)
      : []
  })
  return schedule
}

function padTime(base, mins) {
  const total = base * 60 + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function validateAvailForm(form) {
  if (!form.timezone.trim()) return 'Timezone is required.'
  const hasActiveDay = DAYS.some(d => form.days[d].enabled && form.days[d].ranges.length > 0)
  if (!hasActiveDay) return 'At least one day must have availability set.'
  for (const day of DAYS) {
    if (!form.days[day].enabled) continue
    for (const range of form.days[day].ranges) {
      if (!range.start || !range.end) return `${DAY_LABEL[day]}: start and end time are required.`
      if (range.end <= range.start) return `${DAY_LABEL[day]}: end time must be after start time.`
    }
  }
  return null
}

// ── Astrology booking helpers ─────────────────────────────────────────────
const astroStatusBadge = (s) => ({
  pending:         'bg-white/5 text-white/40',
  payment_pending: 'bg-yellow-900/30 text-yellow-400',
  completed:       'bg-green-900/30 text-green-400',
  cancelled:       'bg-red-900/30 text-red-400',
})[s] || 'bg-white/5 text-white/30'

function AstroInfoCell({ label, value, mono }) {
  return (
    <div>
      <p className="text-white/30 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-white/70 text-sm ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  )
}

function AstroDetailCell({ icon, label, value }) {
  return (
    <div className="rounded-xl p-3 border border-white/5 bg-white/[0.02]">
      <p className="text-xs uppercase tracking-wider mb-1 flex items-center gap-1 text-white/30">
        {icon} {label}
      </p>
      <p className="text-sm font-medium text-white/70">{value || '—'}</p>
    </div>
  )
}

function AstroModalField({ label, icon, children }) {
  return (
    <div>
      <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1">
        {icon && <span className="text-white/20">{icon}</span>}{label}
      </label>
      {children}
    </div>
  )
}

const STATUS_META = {
  pending:   { label: 'Pending',   dot: 'bg-yellow-400', badge: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/25' },
  link_sent: { label: 'Link Sent', dot: 'bg-blue-400',   badge: 'bg-blue-400/15   text-blue-400   border-blue-400/25'   },
  booked:    { label: 'Booked',    dot: 'bg-green-400',  badge: 'bg-green-400/15  text-green-400  border-green-400/25'  },
}

function fmtUtc(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, dot: 'bg-white/20', badge: 'bg-white/5 text-white/30 border-white/8' }
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full text-xs px-2 py-0.5 font-medium ${m.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  )
}

function ServiceBadge({ type }) {
  const colors = type === 'family_aura'
    ? 'bg-purple-400/15 text-purple-400 border-purple-400/25'
    : 'bg-pink-400/15 text-pink-400 border-pink-400/25'
  const label = type === 'family_aura' ? 'Family Aura' : 'Single Aura'
  return (
    <span className={`inline-flex items-center border rounded-full text-[11px] px-2 py-0.5 font-semibold ${colors}`}>
      {label}
    </span>
  )
}

function LinkCopyButton({ link }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 px-2 py-1 rounded-lg transition-all"
    >
      {copied ? <FiCheck size={11} className="text-green-400" /> : <FiCopy size={11} />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

export default function SuperAdminSessionsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('aura')

  // ── Aura sessions state ───────────────────────────────────────────────
  const [sessions, setSessions]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(null)

  // ── Availability state ────────────────────────────────────────────────
  const [availLoading, setAvailLoading] = useState(false)
  const [availSaving,  setAvailSaving]  = useState(false)
  const [availError,   setAvailError]   = useState('')
  const [availForm, setAvailForm] = useState({
    timezone:         'UTC',
    session_duration: 30,
    cooldown_time:    10,
    days:             { ...DEFAULT_DAYS },
  })

  // ── Astrology state ───────────────────────────────────────────────────
  const [astroBookings,      setAstroBookings]      = useState([])
  const [astroLoading,       setAstroLoading]       = useState(false)
  const [astroSearch,        setAstroSearch]        = useState('')
  const [astroExpanded,      setAstroExpanded]      = useState(null)
  const [editForm1Modal,     setEditForm1Modal]     = useState(null)
  const [editForm2Modal,     setEditForm2Modal]     = useState(null)
  const [form1Data,          setForm1Data]          = useState({})
  const [form2Data,          setForm2Data]          = useState({})
  const [astroSaving,        setAstroSaving]        = useState(false)
  const [astroDeleting,      setAstroDeleting]      = useState(null)
  const [astroConfirmDel,    setAstroConfirmDel]    = useState(null)
  const [astroTab,           setAstroTab]           = useState('bookings')
  const [schedules,          setSchedules]          = useState([])
  const [loadingSchedules,   setLoadingSchedules]   = useState(false)
  const [cancellingId,       setCancellingId]       = useState(null)

  const frontendUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api/v1', '').replace(':8000', ':3000')
    : 'http://localhost:3000'

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await sessionsAPI.list()
      setSessions(data.data || [])
    } catch {
      toast.error('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Load availability on mount
  useEffect(() => {
    setAvailLoading(true)
    astrologyAPI.getAvailability()
      .then(({ data }) => {
        const d = data.data || data
        setAvailForm({
          timezone:         d.timezone         || 'UTC',
          session_duration: d.session_duration ?? 30,
          cooldown_time:    d.cooldown_time    ?? 10,
          days:             scheduleToForm(d.weekly_schedule || {}),
        })
      })
      .catch(() => {})
      .finally(() => setAvailLoading(false))
  }, [])

  const handleSaveAvailability = async () => {
    const err = validateAvailForm(availForm)
    if (err) { setAvailError(err); return }
    setAvailError('')
    setAvailSaving(true)
    try {
      await astrologyAPI.updateAvailability({
        timezone:         availForm.timezone,
        session_duration: availForm.session_duration,
        cooldown_time:    availForm.cooldown_time,
        weekly_schedule:  formToSchedule(availForm.days),
      })
      toast.success('Availability saved successfully')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save availability')
    } finally {
      setAvailSaving(false)
    }
  }

  const toggleDay = (day) =>
    setAvailForm(f => ({ ...f, days: { ...f.days, [day]: { ...f.days[day], enabled: !f.days[day].enabled } } }))
  const addRange = (day) =>
    setAvailForm(f => ({ ...f, days: { ...f.days, [day]: { ...f.days[day], ranges: [...f.days[day].ranges, { start: '09:00', end: '17:00' }] } } }))
  const removeRange = (day, idx) =>
    setAvailForm(f => ({ ...f, days: { ...f.days, [day]: { ...f.days[day], ranges: f.days[day].ranges.filter((_, i) => i !== idx) } } }))
  const updateRange = (day, idx, field, value) =>
    setAvailForm(f => {
      const ranges = [...f.days[day].ranges]
      ranges[idx] = { ...ranges[idx], [field]: value }
      return { ...f, days: { ...f.days, [day]: { ...f.days[day], ranges } } }
    })

  // ── Astrology: load bookings when tab opens ───────────────────────────
  useEffect(() => {
    if (activeTab !== 'astrology') return
    if (astroBookings.length > 0) return // already loaded
    setAstroLoading(true)
    bookingsAPI.allBookings()
      .then(({ data }) => {
        const all = Array.isArray(data) ? data : data.results || []
        setAstroBookings(all.filter(b => {
          const t = b.service_type || b.service?.service_type || b.selected_service
          return t === 'astrology'
        }))
      })
      .catch(() => toast.error('Failed to load astrology bookings'))
      .finally(() => setAstroLoading(false))
  }, [activeTab])

  // Load schedules when appointments inner tab opens
  useEffect(() => {
    if (activeTab !== 'astrology' || astroTab !== 'appointments') return
    setLoadingSchedules(true)
    astrologyAPI.listSchedules()
      .then(({ data }) => setSchedules(data.results || []))
      .catch(() => toast.error('Failed to load appointments'))
      .finally(() => setLoadingSchedules(false))
  }, [activeTab, astroTab])

  const astroFiltered = astroBookings.filter(b => {
    if (!astroSearch) return true
    const q = astroSearch.toLowerCase()
    return (
      b.booking_id?.toLowerCase().includes(q) ||
      b.full_name?.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q)
    )
  })

  const deleteAstroBooking = async (id) => {
    setAstroConfirmDel(null)
    setAstroDeleting(id)
    try {
      await bookingsAPI.deleteBooking(id)
      setAstroBookings(prev => prev.filter(b => b.id !== id))
      toast.success('Booking deleted')
    } catch {
      toast.error('Failed to delete booking')
    } finally {
      setAstroDeleting(null)
    }
  }

  const openEditForm1 = (booking) => {
    setEditForm1Modal(booking)
    setForm1Data({
      full_name:          booking.full_name || '',
      email:              booking.email || '',
      phone_country_code: booking.phone_country_code || '+1',
      phone_number:       booking.phone_number || '',
      address:            booking.address || '',
      country:            booking.country || '',
      state:              booking.state || '',
      city:               booking.city || '',
      postal_code:        booking.postal_code || '',
      special_note:       booking.special_note || '',
    })
  }

  const openEditForm2 = (booking) => {
    setEditForm2Modal(booking)
    const d  = booking.details || {}
    const cd = d.custom_data || {}
    setForm2Data({
      full_name:        cd.full_name || '',
      birth_date:       d.birth_date || '',
      birth_time:       d.birth_time || '',
      birth_place:      d.birth_place || '',
      appointment_date: cd.appointment_date || '',
      appointment_time: cd.appointment_time || '',
      additional_notes: d.additional_notes || '',
    })
  }

  const handleSaveForm1 = async () => {
    setAstroSaving(true)
    try {
      await bookingsAPI.editForm1(editForm1Modal.id, form1Data)
      setAstroBookings(prev => prev.map(b => b.id === editForm1Modal.id ? { ...b, ...form1Data } : b))
      toast.success('Booking updated')
      setEditForm1Modal(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save changes')
    } finally {
      setAstroSaving(false)
    }
  }

  const handleSaveForm2 = async () => {
    setAstroSaving(true)
    try {
      const payload = {
        birth_date:       form2Data.birth_date  || null,
        birth_time:       form2Data.birth_time  || null,
        birth_place:      form2Data.birth_place || '',
        custom_data:      { full_name: form2Data.full_name, appointment_date: form2Data.appointment_date, appointment_time: form2Data.appointment_time },
        additional_notes: form2Data.additional_notes,
      }
      await bookingsAPI.editForm2(editForm2Modal.id, payload)
      setAstroBookings(prev => prev.map(b => b.id === editForm2Modal.id ? { ...b, details: { ...b.details, ...payload } } : b))
      toast.success('Astrology details updated')
      setEditForm2Modal(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save changes')
    } finally {
      setAstroSaving(false)
    }
  }

  const handleCancelSchedule = async (id) => {
    setCancellingId(id)
    try {
      await astrologyAPI.cancelSchedule(id)
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s))
      toast.success('Appointment cancelled')
    } catch {
      toast.error('Failed to cancel appointment')
    } finally {
      setCancellingId(null)
    }
  }

  const handleGenerateLink = async (session) => {
    setGenerating(session.id)
    try {
      const { data } = await sessionsAPI.generateLink(session.id)
      toast.success('Link generated and email sent to client!')
      setSessions(prev => prev.map(s => s.id === session.id ? data.data : s))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate link')
    } finally {
      setGenerating(null)
    }
  }

  const isExpired = (session) => {
    if (!session.link_expiry) return false
    return new Date(session.link_expiry) < new Date()
  }

  const buildLink = (token) => `${frontendUrl}/session-booking/${token}`

  return (
    <SuperAdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Sessions</h1>
          <p className="text-white/35 text-sm mt-0.5">
            Manage session scheduling for all services
          </p>
        </div>
        {activeTab === 'aura' && (
          <button
            onClick={fetch}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl transition-all disabled:opacity-40"
          >
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 bg-white/[0.03] border border-white/5 rounded-xl p-1 w-fit">
        {[
          { id: 'aura',         icon: FiZap,         label: 'Aura Sessions' },
          { id: 'astrology',    icon: GiCrystalBall, label: 'Astrology Sessions' },
          { id: 'availability', icon: FiClock,       label: 'Availability' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Aura Sessions tab ── */}
      {activeTab === 'aura' && (
        <>
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="w-8 h-8 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center py-24 text-white/20">
              <FiCalendar size={48} className="mb-4 text-white/10" />
              <p className="text-sm">No sessions yet</p>
              <p className="text-xs mt-1 text-white/15">Sessions appear here after clicking "Analysis Completed" in a booking chat</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] overflow-hidden">
              <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1.5fr_1fr] gap-4 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                {['Booking', 'Client', 'Service', 'Status', 'Session Time', 'Link', ''].map(h => (
                  <span key={h} className="text-white/30 text-xs font-semibold uppercase tracking-wider">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-white/[0.04]">
                {sessions.map(session => {
                  const expired    = isExpired(session)
                  const hasToken   = !!session.session_link_token
                  const isBooked   = session.status === 'booked'
                  const canGenerate = !isBooked
                  const link       = hasToken ? buildLink(session.session_link_token) : null
                  return (
                    <div
                      key={session.id}
                      className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1.5fr_1fr] gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors"
                    >
                      <div>
                        <span className="text-xs font-mono font-bold text-white/70 bg-white/8 px-2 py-0.5 rounded-md">
                          {session.booking_ref || '—'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white/80 font-medium truncate">{session.client_name || '—'}</p>
                        <p className="text-xs text-white/30 truncate">{session.client_email}</p>
                      </div>
                      <div><ServiceBadge type={session.service_type} /></div>
                      <div><StatusBadge status={session.status} /></div>
                      <div>
                        {session.session_start ? (
                          <div>
                            <p className="text-xs text-white/60">{fmtUtc(session.session_start)}</p>
                            <p className="text-xs text-white/30">→ {fmtUtc(session.session_end)}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-white/20 italic">Not booked yet</span>
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        {isBooked ? (
                          <span className="flex items-center gap-1 text-xs text-green-400"><FiCheck size={11} /> Booking confirmed</span>
                        ) : hasToken && !expired ? (
                          <div className="space-y-1">
                            <span className="flex items-center gap-1 text-xs text-blue-400"><FiLink size={10} /> Link active</span>
                            <span className="flex items-center gap-1 text-xs text-white/25"><FiClock size={10} /> Expires {fmtUtc(session.link_expiry)}</span>
                            {link && <LinkCopyButton link={link} />}
                          </div>
                        ) : hasToken && expired ? (
                          <div className="space-y-1">
                            <span className="text-xs text-red-400">Link expired</span>
                            {link && <LinkCopyButton link={link} />}
                          </div>
                        ) : (
                          <span className="text-xs text-white/20 italic">No link yet</span>
                        )}
                      </div>
                      <div className="flex justify-end">
                        {canGenerate && (
                          <button
                            onClick={() => handleGenerateLink(session)}
                            disabled={generating === session.id}
                            className="flex items-center gap-1.5 text-xs font-medium bg-[#F20000]/20 hover:bg-[#F20000]/35 text-red-300 border border-red-900/30 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
                          >
                            {generating === session.id
                              ? <div className="w-3 h-3 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin" />
                              : <FiMail size={11} />}
                            {hasToken && !expired ? 'Regenerate' : 'Generate Link'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Astrology Sessions tab ── */}
      {activeTab === 'astrology' && (
        <div>
          {/* Inner sub-tabs: Bookings / Appointments */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit mb-6">
            {[
              { key: 'bookings',     icon: <GiCrystalBall size={12} />, label: 'Bookings' },
              { key: 'appointments', icon: <FiCalendar size={12} />,    label: 'Appointments' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setAstroTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${astroTab === t.key
                    ? 'bg-purple-700/50 text-purple-300 border border-purple-600/30'
                    : 'text-white/40 hover:text-white/60'}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── Bookings ── */}
          {astroTab === 'bookings' && (
            <div>
              <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
                <p className="text-white/30 text-sm">{astroBookings.length} total astrology bookings</p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                    <input
                      value={astroSearch}
                      onChange={e => setAstroSearch(e.target.value)}
                      placeholder="Search by name, email, booking ID…"
                      className="pl-9 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 focus:border-purple-600/40 rounded-xl text-white placeholder:text-white/25 outline-none transition-all w-72"
                    />
                  </div>
                  <button
                    onClick={() => { setAstroLoading(true); bookingsAPI.allBookings().then(({ data }) => { const all = Array.isArray(data) ? data : data.results || []; setAstroBookings(all.filter(b => { const t = b.service_type || b.service?.service_type || b.selected_service; return t === 'astrology' })) }).catch(() => toast.error('Failed to refresh')).finally(() => setAstroLoading(false)) }}
                    disabled={astroLoading}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 px-3 py-2.5 rounded-xl transition-all"
                  >
                    <FiRefreshCw size={13} className={astroLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {astroLoading ? (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {astroFiltered.length === 0 && (
                    <div className="text-center py-20 text-white/20 text-sm">No astrology bookings found</div>
                  )}
                  {astroFiltered.map((booking, i) => {
                    const details = booking.details
                    const cd      = details?.custom_data || {}
                    const isOpen  = astroExpanded === booking.id
                    return (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="glass rounded-2xl border border-white/5 overflow-hidden"
                      >
                        <div
                          className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                          onClick={() => setAstroExpanded(p => p === booking.id ? null : booking.id)}
                        >
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2 text-purple-400/70">
                              <GiCrystalBall size={14} />
                              <span className="text-white font-medium text-sm">{booking.booking_id}</span>
                            </div>
                            <div>
                              <p className="text-white/70 text-sm">{booking.full_name}</p>
                              <p className="text-white/30 text-xs">{booking.email}</p>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs capitalize ${astroStatusBadge(booking.status)}`}>
                              {booking.status?.replace('_', ' ')}
                            </span>
                            {details && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-purple-900/20 text-purple-400 border border-purple-900/20">
                                Details submitted
                              </span>
                            )}
                            {cd.appointment_date && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-900/20 text-blue-300 border border-blue-900/20 flex items-center gap-1">
                                <FiCalendar size={10} />
                                {cd.appointment_date} {cd.appointment_time}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); openEditForm1(booking) }}
                              className="px-3 py-1.5 text-xs text-blue-400/70 hover:text-blue-400 border border-blue-900/20 hover:border-blue-700/40 rounded-xl transition-all flex items-center gap-1"
                            >
                              <FiEdit2 size={11} /> Edit Details
                            </button>
                            {details && (
                              <button
                                onClick={e => { e.stopPropagation(); openEditForm2(booking) }}
                                className="px-3 py-1.5 text-xs text-purple-400/70 hover:text-purple-400 border border-purple-900/20 hover:border-purple-700/40 rounded-xl transition-all flex items-center gap-1"
                              >
                                <FiEdit2 size={11} /> Edit Astro Details
                              </button>
                            )}
                            {isOpen ? <FiChevronUp size={16} className="text-white/30" /> : <FiChevronDown size={16} className="text-white/30" />}
                            {astroConfirmDel === booking.id ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <span className="text-red-400 text-xs">Delete?</span>
                                <button onClick={() => deleteAstroBooking(booking.id)} className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg">Yes</button>
                                <button onClick={() => setAstroConfirmDel(null)} className="px-2 py-1 text-xs bg-white/5 text-white/50 rounded-lg">No</button>
                              </div>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); setAstroConfirmDel(booking.id) }}
                                disabled={astroDeleting === booking.id}
                                className="p-1.5 text-white/15 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-40"
                              >
                                <FiTrash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-6 border-t border-white/5 pt-5 space-y-6">
                                <div>
                                  <h3 className="text-white/40 text-xs uppercase tracking-wider mb-3">Booking Details (Form 1)</h3>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    <AstroInfoCell label="Booking ID"  value={booking.booking_id} mono />
                                    <AstroInfoCell label="Full Name"   value={booking.full_name} />
                                    <AstroInfoCell label="Email"       value={booking.email} />
                                    <AstroInfoCell label="Phone"       value={`${booking.phone_country_code || ''} ${booking.phone_number || ''}`} />
                                    <AstroInfoCell label="City"        value={booking.city} />
                                    <AstroInfoCell label="State"       value={booking.state} />
                                    <AstroInfoCell label="Country"     value={booking.country} />
                                    <AstroInfoCell label="Postal Code" value={booking.postal_code} />
                                  </div>
                                  {booking.address && (
                                    <div className="mt-3 rounded-xl p-3 border border-white/5 bg-white/[0.02]">
                                      <p className="text-xs uppercase tracking-wider mb-1 text-white/30 flex items-center gap-1"><FiMapPin size={10} /> Address</p>
                                      <p className="text-sm text-white/70">{booking.address}</p>
                                    </div>
                                  )}
                                  {booking.special_note && (
                                    <div className="mt-2 rounded-xl p-3 border border-white/5 bg-white/[0.02]">
                                      <p className="text-xs uppercase tracking-wider mb-1 text-white/30">Special Note</p>
                                      <p className="text-sm text-white/70">{booking.special_note}</p>
                                    </div>
                                  )}
                                  <p className="text-white/20 text-xs mt-2">
                                    Booked on: {booking.created_at ? format(new Date(booking.created_at), 'dd MMM yyyy, hh:mm a') : '—'}
                                  </p>
                                </div>
                                <div>
                                  <h3 className="text-white/40 text-xs uppercase tracking-wider mb-3">Astrology Details (Form 2)</h3>
                                  {details ? (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <AstroDetailCell icon={<FiUser size={13} />}     label="Full Name"        value={cd.full_name} />
                                        <AstroDetailCell icon={<FiCalendar size={13} />} label="Date of Birth"    value={details.birth_date} />
                                        <AstroDetailCell icon={<FiClock size={13} />}    label="Time of Birth"    value={details.birth_time || (cd.birth_time_not_sure ? 'Not sure' : '—')} />
                                        <AstroDetailCell icon={<FiMapPin size={13} />}   label="Place of Birth"   value={details.birth_place} />
                                        <AstroDetailCell icon={<FiCalendar size={13} />} label="Appointment Date" value={cd.appointment_date} />
                                        <AstroDetailCell icon={<FiClock size={13} />}    label="Appointment Time" value={cd.appointment_time} />
                                      </div>
                                      {details.additional_notes && (
                                        <div className="rounded-xl p-3 border border-white/5 bg-white/[0.02]">
                                          <p className="text-xs uppercase tracking-wider mb-1 text-white/30">Notes</p>
                                          <p className="text-sm text-white/70">{details.additional_notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="py-5 text-center text-white/20 text-sm border border-dashed border-white/5 rounded-xl">
                                      Astrology details not yet submitted by client
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Appointments ── */}
          {astroTab === 'appointments' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-white/30 text-sm">{schedules.length} scheduled appointment{schedules.length !== 1 ? 's' : ''}</p>
                <button
                  onClick={() => { setLoadingSchedules(true); astrologyAPI.listSchedules().then(({ data }) => setSchedules(data.results || [])).catch(() => toast.error('Failed to refresh')).finally(() => setLoadingSchedules(false)) }}
                  disabled={loadingSchedules}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  <FiRefreshCw size={12} className={loadingSchedules ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>
              {loadingSchedules ? (
                <div className="flex items-center justify-center py-16">
                  <FiRefreshCw size={18} className="animate-spin text-white/30" />
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-16 text-white/20 text-sm border border-dashed border-white/5 rounded-2xl">
                  No scheduled appointments yet
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.map((s, i) => {
                    const apptDate = s.appointment_start?.substring(0, 10)
                    const adminTz  = availForm.timezone || 'UTC'
                    const statusColors = {
                      confirmed: 'bg-green-900/20 text-green-400 border-green-900/20',
                      pending:   'bg-yellow-900/20 text-yellow-400 border-yellow-900/20',
                      cancelled: 'bg-red-900/20 text-red-400 border-red-900/20',
                    }
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="glass rounded-2xl border border-white/5 p-5"
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-900/30 border border-purple-800/30 flex items-center justify-center shrink-0">
                              <GiCrystalBall size={16} className="text-purple-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">{s.client_name || '—'}</p>
                              <p className="text-white/30 text-xs font-mono">{s.booking_id}</p>
                              <div className="flex items-center gap-4 mt-2 flex-wrap">
                                <span className="flex items-center gap-1 text-white/60 text-xs">
                                  <FiCalendar size={11} />
                                  {apptDate ? formatDateLabel(apptDate) : '—'}
                                </span>
                                <span className="flex items-center gap-1 text-white/60 text-xs">
                                  <FiClock size={11} />
                                  {formatTimeInTz(s.appointment_start, adminTz)} – {formatTimeInTz(s.appointment_end, adminTz)}
                                  <span className="text-white/25 ml-1">({adminTz})</span>
                                </span>
                                <span className="flex items-center gap-1 text-white/30 text-xs">
                                  <FiGlobe size={11} />
                                  Client: {s.client_timezone}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-xs capitalize border ${statusColors[s.status] || 'bg-white/5 text-white/30 border-white/5'}`}>
                              {s.status}
                            </span>
                            {s.status !== 'cancelled' && (
                              <button
                                onClick={() => handleCancelSchedule(s.id)}
                                disabled={cancellingId === s.id}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 border border-red-900/20 hover:border-red-700/40 rounded-xl transition-all disabled:opacity-40"
                              >
                                {cancellingId === s.id
                                  ? <span className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                  : <FiX size={11} />}
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Edit Booking Details Modal (Form 1) ── */}
          <AnimatePresence>
            {editForm1Modal && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass rounded-2xl border border-white/10 p-7 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-bold text-lg">Edit Booking Details</h3>
                    <button onClick={() => setEditForm1Modal(null)} className="text-white/30 hover:text-white/60 transition-colors"><FiX size={20} /></button>
                  </div>
                  <p className="text-white/40 text-sm mb-5">
                    Booking <span className="text-white/70 font-mono">{editForm1Modal.booking_id}</span> — {editForm1Modal.full_name}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <AstroModalField label="Full Name" icon={<FiUser size={13} />}>
                      <input value={form1Data.full_name || ''} onChange={e => setForm1Data(p => ({ ...p, full_name: e.target.value }))} className="modal-input" placeholder="Full name" />
                    </AstroModalField>
                    <AstroModalField label="Email" icon={<FiMail size={13} />}>
                      <input type="email" value={form1Data.email || ''} onChange={e => setForm1Data(p => ({ ...p, email: e.target.value }))} className="modal-input" placeholder="Email" />
                    </AstroModalField>
                    <div className="sm:col-span-2">
                      <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Phone Number</label>
                      <div className="flex">
                        <div className="relative shrink-0">
                          <FiPhone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                          <input value={form1Data.phone_country_code || ''} onChange={e => setForm1Data(p => ({ ...p, phone_country_code: e.target.value }))} className="modal-input !w-20 !pl-8 !rounded-r-none !border-r-0" placeholder="+1" />
                        </div>
                        <input value={form1Data.phone_number || ''} onChange={e => setForm1Data(p => ({ ...p, phone_number: e.target.value }))} className="modal-input flex-1 min-w-0 !rounded-l-none" placeholder="Phone number" />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Address</label>
                      <textarea value={form1Data.address || ''} onChange={e => setForm1Data(p => ({ ...p, address: e.target.value }))} className="modal-input resize-none" rows={2} placeholder="Street address" />
                    </div>
                    <AstroModalField label="Country" icon={<FiGlobe size={13} />}>
                      <input value={form1Data.country || ''} onChange={e => setForm1Data(p => ({ ...p, country: e.target.value }))} className="modal-input" placeholder="Country" />
                    </AstroModalField>
                    <AstroModalField label="State / Province" icon={<FiMapPin size={13} />}>
                      <input value={form1Data.state || ''} onChange={e => setForm1Data(p => ({ ...p, state: e.target.value }))} className="modal-input" placeholder="State" />
                    </AstroModalField>
                    <AstroModalField label="City" icon={<FiMapPin size={13} />}>
                      <input value={form1Data.city || ''} onChange={e => setForm1Data(p => ({ ...p, city: e.target.value }))} className="modal-input" placeholder="City" />
                    </AstroModalField>
                    <AstroModalField label="Postal Code" icon={<FiMapPin size={13} />}>
                      <input value={form1Data.postal_code || ''} onChange={e => setForm1Data(p => ({ ...p, postal_code: e.target.value }))} className="modal-input" placeholder="Postal code" />
                    </AstroModalField>
                    <div className="sm:col-span-2">
                      <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Special Note</label>
                      <textarea value={form1Data.special_note || ''} onChange={e => setForm1Data(p => ({ ...p, special_note: e.target.value }))} className="modal-input resize-none" rows={3} placeholder="Special notes…" />
                    </div>
                  </div>
                  <button onClick={handleSaveForm1} disabled={astroSaving}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50">
                    {astroSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={15} />}
                    Save Changes
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ── Edit Astrology Details Modal (Form 2) ── */}
          <AnimatePresence>
            {editForm2Modal && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass rounded-2xl border border-white/10 p-7 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      <GiCrystalBall className="text-purple-400" size={18} />
                      Edit Astrology Details
                    </h3>
                    <button onClick={() => setEditForm2Modal(null)} className="text-white/30 hover:text-white/60 transition-colors"><FiX size={20} /></button>
                  </div>
                  <p className="text-white/40 text-sm mb-5">
                    Booking <span className="text-white/70 font-mono">{editForm2Modal.booking_id}</span> — {editForm2Modal.full_name}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="sm:col-span-2">
                      <AstroModalField label="Full Name" icon={<FiUser size={13} />}>
                        <input value={form2Data.full_name || ''} onChange={e => setForm2Data(p => ({ ...p, full_name: e.target.value }))} className="modal-input" placeholder="Client's full name" />
                      </AstroModalField>
                    </div>
                    <AstroModalField label="Date of Birth" icon={<FiCalendar size={13} />}>
                      <input type="date" value={form2Data.birth_date || ''} onChange={e => setForm2Data(p => ({ ...p, birth_date: e.target.value }))} className="modal-input" />
                    </AstroModalField>
                    <AstroModalField label="Time of Birth" icon={<FiClock size={13} />}>
                      <input type="time" value={form2Data.birth_time || ''} onChange={e => setForm2Data(p => ({ ...p, birth_time: e.target.value }))} className="modal-input" />
                    </AstroModalField>
                    <div className="sm:col-span-2">
                      <AstroModalField label="Place of Birth" icon={<FiMapPin size={13} />}>
                        <input value={form2Data.birth_place || ''} onChange={e => setForm2Data(p => ({ ...p, birth_place: e.target.value }))} className="modal-input" placeholder="City, Country" />
                      </AstroModalField>
                    </div>
                    <AstroModalField label="Appointment Date" icon={<FiCalendar size={13} />}>
                      <input type="date" value={form2Data.appointment_date || ''} onChange={e => setForm2Data(p => ({ ...p, appointment_date: e.target.value }))} className="modal-input" />
                    </AstroModalField>
                    <AstroModalField label="Appointment Time" icon={<FiClock size={13} />}>
                      <input type="time" value={form2Data.appointment_time || ''} onChange={e => setForm2Data(p => ({ ...p, appointment_time: e.target.value }))} className="modal-input" />
                    </AstroModalField>
                    <div className="sm:col-span-2">
                      <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Additional Notes</label>
                      <textarea value={form2Data.additional_notes || ''} onChange={e => setForm2Data(p => ({ ...p, additional_notes: e.target.value }))} className="modal-input resize-none" rows={3} placeholder="Additional notes…" />
                    </div>
                  </div>
                  <button onClick={handleSaveForm2} disabled={astroSaving}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50">
                    {astroSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={15} />}
                    Save Astrology Details
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Availability tab ── */}
      {activeTab === 'availability' && (
        <div className="space-y-6">
          <div className="bg-purple-900/10 border border-purple-900/20 rounded-xl px-5 py-3 flex items-center gap-3">
            <FiGlobe size={14} className="text-purple-400 flex-shrink-0" />
            <p className="text-purple-300/70 text-sm">
              This availability is <strong className="text-purple-300">shared globally</strong> — slots blocked here apply to Astrology, Aura, and Family Aura bookings alike.
            </p>
          </div>

          {availLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-white/30">
              <FiRefreshCw size={18} className="animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <>
              {availError && (
                <div className="flex items-center gap-2 p-4 rounded-xl border border-red-900/30 bg-red-900/10 text-red-400 text-sm">
                  <FiAlertCircle size={15} className="shrink-0" />
                  {availError}
                </div>
              )}

              {/* Session settings */}
              <div className="glass rounded-2xl border border-white/5 p-6">
                <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
                  <FiClock size={15} className="text-purple-400" />
                  Session Settings
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="sm:col-span-1">
                    <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">
                      Your Timezone *
                    </label>
                    <select
                      value={availForm.timezone}
                      onChange={e => setAvailForm(f => ({ ...f, timezone: e.target.value }))}
                      className="modal-input"
                    >
                      <option value="">— Select timezone —</option>
                      {POPULAR_TZ.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                    <p className="text-white/20 text-xs mt-1.5">All times are in this timezone.</p>
                  </div>
                  <div>
                    <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Session Duration (min)</label>
                    <input type="number" min={10} max={180} value={availForm.session_duration}
                      onChange={e => setAvailForm(f => ({ ...f, session_duration: Math.max(10, parseInt(e.target.value) || 30) }))}
                      className="modal-input" />
                    <p className="text-white/20 text-xs mt-1.5">Default: 30 min</p>
                  </div>
                  <div>
                    <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Cooldown / Gap (min)</label>
                    <input type="number" min={0} max={60} value={availForm.cooldown_time}
                      onChange={e => setAvailForm(f => ({ ...f, cooldown_time: Math.max(0, parseInt(e.target.value) || 10) }))}
                      className="modal-input" />
                    <p className="text-white/20 text-xs mt-1.5">Gap between sessions.</p>
                  </div>
                </div>
                {availForm.session_duration > 0 && (
                  <div className="mt-4 p-3 rounded-xl bg-purple-900/10 border border-purple-900/20">
                    <p className="text-purple-300/70 text-xs">
                      <span className="font-medium text-purple-300">Slot example: </span>
                      09:00–{padTime(9, availForm.session_duration)}
                      {' → '}
                      {padTime(9, availForm.session_duration + availForm.cooldown_time)}–{padTime(9, availForm.session_duration * 2 + availForm.cooldown_time)}
                      {' ('}{availForm.session_duration} min session + {availForm.cooldown_time} min gap)
                    </p>
                  </div>
                )}
              </div>

              {/* Weekly schedule */}
              <div className="glass rounded-2xl border border-white/5 p-6">
                <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
                  <FiCalendar size={15} className="text-purple-400" />
                  Weekly Availability
                </h2>
                <p className="text-white/30 text-xs mb-5">
                  Times are in <span className="text-purple-400">{availForm.timezone || 'your timezone'}</span>. Toggle a day to enable it.
                </p>
                <div className="space-y-3">
                  {DAYS.map(day => {
                    const { enabled, ranges } = availForm.days[day]
                    return (
                      <div key={day} className={`rounded-xl border p-4 transition-colors ${enabled ? 'border-purple-900/30 bg-purple-950/10' : 'border-white/5 bg-white/[0.01]'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => toggleDay(day)}
                              className={`relative w-9 h-5 rounded-full transition-colors flex items-center ${enabled ? 'bg-purple-600' : 'bg-white/10'}`}>
                              <span className={`absolute w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </button>
                            <span className={`text-sm font-medium ${enabled ? 'text-white' : 'text-white/30'}`}>{DAY_LABEL[day]}</span>
                            {!enabled && <span className="text-xs text-white/20">OFF</span>}
                          </div>
                          {enabled && (
                            <button type="button" onClick={() => addRange(day)}
                              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                              <FiPlus size={12} /> Add Time Range
                            </button>
                          )}
                        </div>
                        {enabled && ranges.length === 0 && (
                          <p className="text-white/25 text-xs pl-12">No time range set — click "Add Time Range"</p>
                        )}
                        {enabled && ranges.map((range, idx) => {
                          const hasError = range.start && range.end && range.end <= range.start
                          return (
                            <div key={idx} className="flex items-center gap-3 pl-12 mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="flex-1">
                                  <label className="block text-white/30 text-xs mb-1">Start</label>
                                  <input type="time" value={range.start}
                                    onChange={e => updateRange(day, idx, 'start', e.target.value)}
                                    className={`modal-input text-sm ${hasError ? 'border-red-700/50' : ''}`} />
                                </div>
                                <span className="text-white/20 mt-5">–</span>
                                <div className="flex-1">
                                  <label className="block text-white/30 text-xs mb-1">End</label>
                                  <input type="time" value={range.end}
                                    onChange={e => updateRange(day, idx, 'end', e.target.value)}
                                    className={`modal-input text-sm ${hasError ? 'border-red-700/50' : ''}`} />
                                </div>
                              </div>
                              {hasError && <p className="text-red-400 text-xs mt-5 shrink-0">End must be after start</p>}
                              <button type="button" onClick={() => removeRange(day, idx)}
                                className="p-1.5 text-white/20 hover:text-red-400 transition-colors mt-5">
                                <FiTrash2 size={13} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={handleSaveAvailability}
                disabled={availSaving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white transition-all disabled:opacity-50"
              >
                {availSaving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <FiSave size={15} />}
                Save Availability
              </button>
            </>
          )}
        </div>
      )}
    </SuperAdminLayout>
  )
}

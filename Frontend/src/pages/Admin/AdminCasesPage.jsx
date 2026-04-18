import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday } from 'date-fns'
import { FiSearch, FiSliders, FiCalendar, FiChevronDown, FiX, FiUser, FiPhone, FiMail, FiMapPin, FiFileText, FiClock, FiImage, FiExternalLink } from 'react-icons/fi'
import { casesAPI, chatAPI, bookingsAPI } from '../../api'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

// ── helpers ───────────────────────────────────────────────────────────────
const FILTER_OPTS = [
  { value: 'all',       label: 'All Status'  },
  { value: 'pending',   label: 'Pending'      },
  { value: 'working',   label: 'In Progress'  },
  { value: 'completed', label: 'Completed'    },
]

const BADGE = {
  received:  { label: 'Pending',     cls: 'bg-amber-500  text-white' },
  assigned:  { label: 'Pending',     cls: 'bg-amber-500  text-white' },
  working:   { label: 'In Progress', cls: 'bg-cyan-500   text-white' },
  completed: { label: 'Completed',   cls: 'bg-green-600  text-white' },
  cancelled: { label: 'Cancelled',   cls: 'bg-red-600    text-white' },
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isToday(d) ? 'Today' : format(d, 'dd-MM-yyyy')
}

// ── Booking Detail Modal ─────────────────────────────────────────────────
function BookingModal({ caseId, bookingId, onClose }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const req = caseId
      ? casesAPI.detail(caseId).then(({ data: d }) => ({ _type: 'CASE', ...(d.data || d) }))
      : bookingsAPI.detail(bookingId).then(({ data: d }) => ({
          _type:       'BOOKING',
          case_number: null,
          booking_id:  d.booking_id,
          booking:     d,
        }))
    req
      .then(setData)
      .catch(() => toast.error('Failed to load details'))
      .finally(() => setLoading(false))
  }, [caseId, bookingId])

  const b  = data?.booking
  const f2 = b?.details

  const Row = ({ icon: Icon, label, value }) => {
    if (value === null || value === undefined || value === '') return null
    // Objects/arrays → render as key-value pairs, not raw JSX
    if (typeof value === 'object') {
      const entries = Array.isArray(value)
        ? value.map((v, i) => [i + 1, typeof v === 'object' ? JSON.stringify(v) : String(v)])
        : Object.entries(value)
      if (entries.length === 0) return null
      return (
        <div className="flex items-start gap-4">
          <Icon size={18} className="text-white/30 mt-1 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-white/40 text-sm font-medium mb-2">{label}</p>
            {entries.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-base py-1">
                <span className="text-white/50 capitalize">{String(k).replace(/_/g, ' ')}</span>
                <span className="text-white/85 font-medium">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return (
      <div className="flex items-start gap-4">
        <Icon size={18} className="text-white/30 mt-1 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-white/40 text-sm font-medium mb-1">{label}</p>
          <p className="text-white/85 text-base font-medium break-words">{String(value)}</p>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative bg-[#1c1c1c] border border-white/8 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-white/8">
            <div>
              <h2 className="text-white font-bold text-2xl">Client Details</h2>
              <p className="text-white/40 text-sm mt-1">
                {data?.case_number && <span>Case: {data.case_number}</span>}
                {data?.booking_id && <span className="ml-2 opacity-60">· Booking: {data.booking_id}</span>}
              </p>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 rounded-xl transition-all">
              <FiX size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-8 py-6 space-y-8" style={{ maxHeight: 'calc(90vh - 90px)' }}>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/10 border-t-red-500 rounded-full animate-spin" />
              </div>
            ) : !b ? (
              <p className="text-white/30 text-sm text-center py-8">No booking data found</p>
            ) : (
              <>
                {/* Form 2 */}
                {f2 && (
                  <div>
                    <p className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Form 2 — Service Details</p>
                    <div className="space-y-4">
                      <Row icon={FiCalendar} label="Birth Date"         value={f2.birth_date} />
                      <Row icon={FiClock}    label="Birth Time"         value={f2.birth_time} />
                      <Row icon={FiMapPin}   label="Birth Place"        value={f2.birth_place} />
                      <Row icon={FiUser}     label="Family Members"     value={f2.family_member_count ? String(f2.family_member_count) : null} />
                      <Row icon={FiFileText} label="Family Details"     value={f2.family_member_details} />
                      <Row icon={FiFileText} label="Additional Notes"   value={f2.additional_notes} />
                      <Row icon={FiFileText} label="Custom Fields"      value={f2.custom_data && Object.keys(f2.custom_data).length > 0 ? f2.custom_data : null} />
                    </div>
                  </div>
                )}
                {!f2 && (
                  <p className="text-white/20 text-xs text-center">Form 2 not submitted yet</p>
                )}

                {/* Uploaded Images */}
                {b?.attachments?.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FiImage size={16} /> Uploaded Images ({b.attachments.length})
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {b.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/5 hover:border-white/20 transition-all"
                        >
                          <img
                            src={att.file}
                            alt={att.description || att.file_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.parentElement.classList.add('flex', 'items-center', 'justify-center')
                              e.target.parentElement.innerHTML = `<div class="text-center p-3"><div class="text-white/20 mb-1"><svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div><p class="text-white/30 text-xs truncate">${att.file_name}</p></div>`
                            }}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <FiExternalLink className="text-white" size={20} />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                            <p className="text-white text-sm truncate">{att.description || att.file_name}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── card ─────────────────────────────────────────────────────────────────
function CaseCard({ c, onStartWork, onStartBookingWork, delay }) {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const isPending   = ['received', 'assigned'].includes(c.status)
  const isWorking   = c.status === 'working'
  const isCompleted = c.status === 'completed'
  const date = formatDate(c.started_at || c.created_at)
  const badge = BADGE[c.status] || BADGE.received

  const isBooking = c._type === 'BOOKING'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#2a2a2a] border border-white/6 rounded-2xl p-5 flex flex-col gap-3"
    >
      {/* Badge + date */}
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-semibold px-3 py-1 rounded-md ${badge.cls}`}>
          {badge.label}
        </span>
        <span className="text-white/30 text-xs flex items-center gap-1.5">
          <FiCalendar size={11} />
          {date}
        </span>
      </div>

      {/* IDs */}
      <div>
        <p className="text-white/70 text-sm font-mono font-semibold">{c.case_number || '—'}</p>
        {isBooking && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-900/30">Booking</span>
        )}
        {!isBooking && c.booking_id && <p className="text-white/30 text-xs mt-0.5">Booking: {c.booking_id}</p>}
      </div>

      {/* Client */}
      <div>
        <p className="text-white font-bold text-lg leading-tight">
          {c.client_name || 'Unknown Client'}
        </p>
        <p className="text-white/35 text-xs mt-0.5">
          Service: {c.service_name || '—'}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/10 transition-all"
        >
          View
        </button>
        {isBooking && isPending && (
          <button
            onClick={() => onStartBookingWork(c)}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-all"
          >
            Start Work
          </button>
        )}
        {isBooking && isWorking && (
          <button
            onClick={() => navigate('/admin/chat', { state: { bookingId: c.id } })}
            className="flex-1 py-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 text-sm font-semibold hover:bg-cyan-600/30 transition-all"
          >
            Continue Work
          </button>
        )}
        {isBooking && isCompleted && (
          <button
            onClick={() => navigate('/admin/chat', { state: { bookingId: c.id } })}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-semibold hover:bg-white/6 transition-all"
          >
            View Chat
          </button>
        )}
        {!isBooking && isPending && (
          <button
            onClick={() => onStartWork(c)}
            className="flex-1 py-2.5 rounded-xl border border-white/15 text-white text-sm font-semibold hover:bg-white/8 transition-all"
          >
            Start Work
          </button>
        )}
        {!isBooking && isWorking && (
          <button
            onClick={() => navigate('/admin/chat', { state: { caseId: c.id } })}
            className="flex-1 py-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 text-sm font-semibold hover:bg-cyan-600/30 transition-all"
          >
            Continue
          </button>
        )}
        {!isBooking && isCompleted && (
          <button
            onClick={() => navigate('/admin/chat', { state: { caseId: c.id } })}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-semibold hover:bg-white/6 transition-all"
          >
            Chat
          </button>
        )}
      </div>

      {showModal && (
        isBooking
          ? <BookingModal bookingId={c.id} onClose={() => setShowModal(false)} />
          : <BookingModal caseId={c.id} onClose={() => setShowModal(false)} />
      )}
    </motion.div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────
export default function AdminCasesPage() {
  const navigate = useNavigate()
  const [cases, setCases]       = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')

  useEffect(() => {
    Promise.allSettled([casesAPI.allCases(), bookingsAPI.allBookings()])
      .then(([casesRes, bookingsRes]) => {
        if (casesRes.status === 'fulfilled') {
          const d = casesRes.value.data
          setCases(Array.isArray(d) ? d : d.results || [])
        }
        if (bookingsRes.status === 'fulfilled') {
          const d = bookingsRes.value.data
          const list = Array.isArray(d) ? d : d.results || []
          // Paid bookings with no case yet
          setBookings(list.filter(b => b.status === 'completed' && !b.case_id))
        }
      })
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false))
  }, [])

  // Booking rows normalised to the same shape as cases
  const bookingRows = bookings.map(b => ({
    _type:        'BOOKING',
    id:           b.id,
    case_number:  b.booking_id || '—',
    booking_id:   null,
    client_name:  b.client_name || '—',
    service_name: b.service_name || '—',
    created_at:   b.created_at,
    started_at:   b.work_started_at || null,
    status:       b.work_completed ? 'completed' : b.work_started ? 'working' : 'received',
  }))
  const allRows = [
    ...cases.map(c => ({ _type: 'CASE', ...c })),
    ...bookingRows,
  ]

  const handleStartBookingWork = async (c) => {
    try {
      await bookingsAPI.startWork(c.id)
      // Optimistically update the row to 'working'
      setBookings(prev => prev.map(b => b.id === c.id ? { ...b, work_started: true } : b))
    } catch { /* continue even if status update fails */ }
    try {
      await chatAPI.sendMessage({
        source_type: 'BOOKING',
        booking: c.id,
        message_type: 'text',
        message: '👋 I have started working on your booking. I will keep you updated.',
      })
    } catch { /* message optional */ }
    toast.success('Work started — navigating to chat')
    navigate('/admin/chat', { state: { bookingId: c.id } })
  }

  const handleStartWork = async (c) => {
    try {
      await casesAPI.updateStatus(c.id, { status: 'working' })
      casesAPI.invalidateCases()
      setCases((prev) => prev.map((x) => x.id === c.id ? { ...x, status: 'working' } : x))
      // Auto-send a chat message so conversation appears immediately
      try {
        await chatAPI.sendMessage({
          case: c.id,
          message_type: 'text',
          message: '👋 I have started working on your case. I will keep you updated.',
        })
      } catch { /* chat message is optional */ }
      toast.success('Case started — navigating to chat')
      navigate('/admin/chat', { state: { caseId: c.id } })
    } catch {
      toast.error('Failed to update status')
    }
  }

  const filtered = allRows.filter((c) => {
    const matchStatus =
      filter === 'all' ||
      (filter === 'pending'   && ['received', 'assigned'].includes(c.status)) ||
      (filter === 'working'   && c.status === 'working') ||
      (filter === 'completed' && c.status === 'completed')

    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      c.client_name?.toLowerCase().includes(q) ||
      c.case_number?.toLowerCase().includes(q) ||
      c.service_name?.toLowerCase().includes(q)

    return matchStatus && matchSearch
  })

  const counts = {
    pending:   allRows.filter((c) => ['received', 'assigned'].includes(c.status)).length,
    working:   allRows.filter((c) => c.status === 'working').length,
    completed: allRows.filter((c) => c.status === 'completed').length,
  }

  return (
    <AdminLayout pageTitle="Assigned Tasks">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Heading */}
        <div>
          <h1 className="text-white font-bold text-2xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            Assigned Tasks
          </h1>
          <p className="text-white/35 text-sm mt-1">
            Manage and track premium service request ini real — time.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search insights, clients or reports..."
              className="w-full bg-[#1e1e1e] border border-white/8 focus:border-white/18 rounded-xl pl-10 pr-4 py-2.5 text-white/70 placeholder:text-white/25 outline-none transition-all text-sm"
            />
          </div>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none bg-[#1e1e1e] border border-white/8 rounded-xl pl-4 pr-9 py-2.5 text-white/60 text-sm outline-none cursor-pointer hover:border-white/20 transition-all"
            >
              {FILTER_OPTS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" size={14} />
          </div>
          <button className="flex items-center gap-2 bg-[#1e1e1e] border border-white/8 hover:border-white/20 rounded-xl px-4 py-2.5 text-white/50 text-sm transition-all whitespace-nowrap">
            <FiSliders size={14} />
            Filter
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
              { value: 'all',       label: 'All',         count: allRows.length,   dot: 'bg-white/40'   },
            { value: 'pending',   label: 'Pending',      count: counts.pending,   dot: 'bg-amber-400'  },
            { value: 'working',   label: 'In Progress',  count: counts.working,   dot: 'bg-cyan-400'   },
            { value: 'completed', label: 'Completed',    count: counts.completed, dot: 'bg-green-400'  },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border
                ${filter === t.value
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-white/6 text-white/40 hover:text-white/70 hover:border-white/14'
                }`}
            >
              <span className={`w-2 h-2 rounded-full ${t.dot}`} />
              {t.label}
              <span className="text-xs opacity-60 ml-0.5">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="h-52 bg-white/3 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center text-white/20 text-sm">No tasks found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c, i) => (
              <CaseCard key={c.id} c={c} onStartWork={handleStartWork} onStartBookingWork={handleStartBookingWork} delay={i * 0.04} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}


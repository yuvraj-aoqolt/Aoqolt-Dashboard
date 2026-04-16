import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday } from 'date-fns'
import { FiSearch, FiSliders, FiCalendar, FiChevronDown, FiX, FiUser, FiPhone, FiMail, FiMapPin, FiFileText, FiClock } from 'react-icons/fi'
import { casesAPI, chatAPI } from '../../api'
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
function BookingModal({ caseId, onClose }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    casesAPI.detail(caseId)
      .then(({ data: d }) => setData(d.data || d))
      .catch(() => toast.error('Failed to load booking details'))
      .finally(() => setLoading(false))
  }, [caseId])

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
        <div className="flex items-start gap-3">
          <Icon size={14} className="text-white/30 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-white/35 text-[11px] mb-1">{label}</p>
            {entries.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 text-sm py-0.5">
                <span className="text-white/40 capitalize">{String(k).replace(/_/g, ' ')}</span>
                <span className="text-white/75">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return (
      <div className="flex items-start gap-3">
        <Icon size={14} className="text-white/30 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-white/35 text-[11px] mb-0.5">{label}</p>
          <p className="text-white/80 text-sm break-words">{String(value)}</p>
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
          className="relative bg-[#1c1c1c] border border-white/8 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div>
              <h2 className="text-white font-bold text-lg">Client Details</h2>
              <p className="text-white/35 text-xs mt-0.5">
                {data?.case_number && <span>Case: {data.case_number}</span>}
                {data?.booking_id && <span className="ml-2 opacity-60">· Booking: {data.booking_id}</span>}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 rounded-xl transition-all">
              <FiX size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-6 py-5 space-y-6" style={{ maxHeight: 'calc(85vh - 80px)' }}>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/10 border-t-red-500 rounded-full animate-spin" />
              </div>
            ) : !b ? (
              <p className="text-white/30 text-sm text-center py-8">No booking data found</p>
            ) : (
              <>
                {/* Form 1 */}
                <div>
                  <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-3">Form 1 — Personal Details</p>
                  <div className="space-y-3">
                    <Row icon={FiUser}    label="Full Name"    value={b.full_name} />
                    <Row icon={FiMail}    label="Email"        value={b.email} />
                    <Row icon={FiPhone}   label="Phone"        value={`${b.phone_country_code || ''}${b.phone_number || ''}`} />
                    <Row icon={FiMapPin}  label="Address"      value={[b.address, b.city, b.state, b.country, b.postal_code].filter(Boolean).join(', ')} />
                    <Row icon={FiFileText} label="Special Note" value={b.special_note} />
                  </div>
                </div>

                {/* Form 2 */}
                {f2 && (
                  <div>
                    <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-3">Form 2 — Service Details</p>
                    <div className="space-y-3">
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
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── card ─────────────────────────────────────────────────────────────────
function CaseCard({ c, onStartWork, delay }) {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const isPending   = ['received', 'assigned'].includes(c.status)
  const isWorking   = c.status === 'working'
  const isCompleted = c.status === 'completed'
  const date = formatDate(c.started_at || c.created_at)
  const badge = BADGE[c.status] || BADGE.received

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
        {c.booking_id && <p className="text-white/30 text-xs mt-0.5">Booking: {c.booking_id}</p>}
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
        {isPending && (
          <button
            onClick={() => onStartWork(c)}
            className="flex-1 py-2.5 rounded-xl border border-white/15 text-white text-sm font-semibold hover:bg-white/8 transition-all"
          >
            Start Work
          </button>
        )}
        {isWorking && (
          <button
            onClick={() => navigate('/admin/chat', { state: { caseId: c.id } })}
            className="flex-1 py-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 text-sm font-semibold hover:bg-cyan-600/30 transition-all"
          >
            Continue
          </button>
        )}
        {isCompleted && (
          <button
            onClick={() => navigate('/admin/chat', { state: { caseId: c.id } })}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-semibold hover:bg-white/6 transition-all"
          >
            Chat
          </button>
        )}
      </div>

      {showModal && <BookingModal caseId={c.id} onClose={() => setShowModal(false)} />}
    </motion.div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────
export default function AdminCasesPage() {
  const navigate = useNavigate()
  const [cases, setCases]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')

  useEffect(() => {
    casesAPI.allCases()
      .then(({ data }) => setCases(Array.isArray(data) ? data : data.results || []))
      .catch(() => toast.error('Failed to load cases'))
      .finally(() => setLoading(false))
  }, [])

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

  const filtered = cases.filter((c) => {
    const matchStatus =
      filter === 'all' ||
      (filter === 'pending'   && ['received', 'assigned'].includes(c.status)) ||
      (filter === 'working'   && c.status === 'working') ||
      (filter === 'completed' && c.status === 'completed')

    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      c.client?.full_name?.toLowerCase().includes(q) ||
      c.case_number?.toLowerCase().includes(q) ||
      c.booking?.service?.name?.toLowerCase().includes(q)

    return matchStatus && matchSearch
  })

  const counts = {
    pending:   cases.filter((c) => ['received', 'assigned'].includes(c.status)).length,
    working:   cases.filter((c) => c.status === 'working').length,
    completed: cases.filter((c) => c.status === 'completed').length,
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
            { value: 'all',       label: 'All',         count: cases.length,     dot: 'bg-white/40'   },
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
          <div className="py-24 text-center text-white/20 text-sm">No cases found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c, i) => (
              <CaseCard key={c.id} c={c} onStartWork={handleStartWork} delay={i * 0.04} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}


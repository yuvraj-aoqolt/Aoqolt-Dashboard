import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format, isToday } from 'date-fns'
import { FiSearch, FiCalendar } from 'react-icons/fi'
import { casesAPI, bookingsAPI } from '../../api'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isToday(d) ? 'Today' : format(d, 'dd-MM-yyyy')
}

function WorkCard({ c, delay }) {
  const navigate = useNavigate()
  const isBooking = c._type === 'BOOKING'
  const date = formatDate(c.started_at || c.created_at)

  const handleContinue = () => {
    if (isBooking) {
      navigate('/admin/chat', { state: { bookingId: c.id } })
    } else {
      navigate('/admin/chat', { state: { caseId: c.id } })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#2a2a2a] border border-cyan-500/15 rounded-2xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isBooking && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Booking
            </span>
          )}
          <span className="text-[11px] font-semibold px-3 py-1 rounded-md bg-cyan-500 text-white">
            In Progress
          </span>
        </div>
        <span className="text-white/30 text-xs flex items-center gap-1.5">
          <FiCalendar size={11} />
          {date}
        </span>
      </div>

      <div>
        <p className="text-white/70 text-sm font-mono font-semibold">
          {isBooking ? (c.booking_id || '—') : (c.case_number || '—')}
        </p>
      </div>

      <div>
        <p className="text-white font-bold text-lg leading-tight">
          {c.client_name || 'Unknown Client'}
        </p>
        <p className="text-white/35 text-xs mt-0.5">
          Service: {c.service_name || '—'}
        </p>
      </div>

      <button
        onClick={handleContinue}
        className="w-full py-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 text-sm font-semibold hover:bg-cyan-600/30 transition-all"
      >
        Continue Work
      </button>
    </motion.div>
  )
}

export default function AdminWorkPage() {
  const [allRows, setAllRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    Promise.all([casesAPI.allCases(), bookingsAPI.allBookings()])
      .then(([{ data: cData }, { data: bData }]) => {
        const cases    = Array.isArray(cData) ? cData : cData.results || []
        const bookings = Array.isArray(bData) ? bData : bData.results || []

        const caseRows = cases
          .filter(c => c.status === 'working')
          .map(c => ({ ...c, _type: 'CASE' }))

        const bookingRows = bookings
          .filter(b => b.work_started === true)
          .map(b => ({
            ...b,
            _type: 'BOOKING',
            booking_id: b.booking_id,   // e.g. BOOK-00001
            client_name: b.client_name,
            service_name: b.service_name,
            started_at: b.work_started_at || b.created_at,
          }))

        setAllRows([...caseRows, ...bookingRows])
      })
      .catch(() => toast.error('Failed to load working items'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = allRows.filter(c => {
    const q = search.toLowerCase()
    return (
      !q ||
      c.client_name?.toLowerCase().includes(q) ||
      (c._type === 'BOOKING' ? c.booking_id : c.case_number)?.toLowerCase().includes(q) ||
      c.service_name?.toLowerCase().includes(q)
    )
  })

  return (
    <AdminLayout pageTitle="Working">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-white font-bold text-2xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            Working Cases
          </h1>
          <p className="text-white/35 text-sm mt-1">
            Cases currently in progress — continue your work in the chat.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={14} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cases…"
            className="w-full bg-[#1e1e1e] border border-white/8 focus:border-white/18 rounded-xl pl-10 pr-4 py-2.5 text-white/70 placeholder:text-white/25 outline-none transition-all text-sm"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-52 bg-white/3 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center text-white/20 text-sm">No items in progress</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c, i) => (
              <WorkCard key={`${c._type}-${c.id}`} c={c} delay={i * 0.04} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

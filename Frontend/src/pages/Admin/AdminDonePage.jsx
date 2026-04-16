import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format, isToday } from 'date-fns'
import { FiSearch, FiCalendar } from 'react-icons/fi'
import { casesAPI } from '../../api'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isToday(d) ? 'Today' : format(d, 'dd-MM-yyyy')
}

function DoneCard({ c, delay }) {
  const navigate = useNavigate()
  const date = formatDate(c.completed_at || c.created_at)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#2a2a2a] border border-green-600/15 rounded-2xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold px-3 py-1 rounded-md bg-green-600 text-white">
          Completed
        </span>
        <span className="text-white/30 text-xs flex items-center gap-1.5">
          <FiCalendar size={11} />
          {date}
        </span>
      </div>

      <div>
        <p className="text-white/70 text-sm font-mono font-semibold">{c.case_number || '—'}</p>
        {c.booking_id && <p className="text-white/30 text-xs mt-0.5">Booking: {c.booking_id}</p>}
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
        onClick={() => navigate('/admin/chat', { state: { caseId: c.id } })}
        className="w-full py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-semibold hover:bg-white/6 transition-all"
      >
        View Chat
      </button>
    </motion.div>
  )
}

export default function AdminDonePage() {
  const [cases, setCases]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    casesAPI.allCases()
      .then(({ data }) => {
        const all = Array.isArray(data) ? data : data.results || []
        setCases(all.filter(c => c.status === 'completed'))
      })
      .catch(() => toast.error('Failed to load completed cases'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = cases.filter(c => {
    const q = search.toLowerCase()
    return (
      !q ||
      c.client?.full_name?.toLowerCase().includes(q) ||
      c.case_number?.toLowerCase().includes(q) ||
      c.booking?.service?.name?.toLowerCase().includes(q)
    )
  })

  return (
    <AdminLayout pageTitle="Completed">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-white font-bold text-2xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
            Completed Cases
          </h1>
          <p className="text-white/35 text-sm mt-1">
            All finished cases — review results and history.
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
          <div className="py-24 text-center text-white/20 text-sm">No completed cases</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c, i) => (
              <DoneCard key={c.id} c={c} delay={i * 0.04} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

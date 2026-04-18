import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format, isToday } from 'date-fns'
import { FiChevronRight } from 'react-icons/fi'
import { casesAPI, chatAPI, bookingsAPI } from '../../api'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

// ── helpers ───────────────────────────────────────────────────────────────
const STATUS_META = {
  received:  { label: 'Pending',     cls: 'bg-[#332b00] text-[#facc15] border-[#713f12]/40' },
  assigned:  { label: 'Pending',     cls: 'bg-[#332b00] text-[#facc15] border-[#713f12]/40' },
  working:   { label: 'In Progress', cls: 'bg-[#001d3d] text-[#38bdf8] border-[#0c4a6e]/40'  },
  completed: { label: 'Completed',   cls: 'bg-[#062d1f] text-[#4ade80] border-[#064e3b]/40' },
  cancelled: { label: 'Cancelled',   cls: 'bg-red-900/20  text-red-400    border-red-900/40'   },
}

function statusMeta(status) {
  return STATUS_META[status] || { label: status, cls: 'bg-white/5 text-white/40 border-white/10' }
}

function clientInitials(name = '') {
  return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isToday(d) ? 'Today' : format(d, 'MMM d, yyyy')
}

// ── stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, count, color, borderColor, bgColor, to, delay }) {
  const navigate = useNavigate()
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={() => navigate(to)}
      className={`relative flex flex-col justify-between p-6 rounded-[28px] border-2 ${borderColor} ${bgColor} hover:brightness-125 transition-all text-left w-full cursor-pointer h-36 shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-lg font-bold tracking-tight ${color}`}>{label}</span>
        <FiChevronRight className={color} size={24} />
      </div>
      <p className={`text-5xl font-bold ${color}`}>{count}</p>
    </motion.button>
  )
}

// ── main ──────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [cases, setCases]       = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.allSettled([casesAPI.allCases(), bookingsAPI.allBookings()])
      .then(([casesRes, bookingsRes]) => {
        if (casesRes.status === 'fulfilled') {
          const d = casesRes.value.data
          setCases(Array.isArray(d) ? d : d.results || [])
        }
        if (bookingsRes.status === 'fulfilled') {
          const d = bookingsRes.value.data
          // Only show paid bookings (status=completed) that have no case yet
          const list = Array.isArray(d) ? d : d.results || []
          setBookings(list.filter(b => b.status === 'completed' && !b.case_id))
        }
      })
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false))
  }, [])

  // Normalise bookings into the same shape as cases for the table
  const bookingRows = bookings.map(b => {
    const bStatus = b.work_completed ? 'completed' : b.work_started ? 'working' : 'received'
    return {
      _type:        'BOOKING',
      id:           b.id,
      case_number:  b.booking_id || '—',
      booking_id:   null,
      client_name:  b.client_name || '—',
      service_name: b.service_name || '—',
      created_at:   b.created_at,
      status:       bStatus,
    }
  })

  const allRows   = [...cases.map(c => ({ _type: 'CASE', ...c })), ...bookingRows]
  const assigned  = allRows.filter((r) => ['received', 'assigned'].includes(r.status))
  const working   = allRows.filter((r) => r.status === 'working')
  const completed = allRows.filter((r) => r.status === 'completed')
  const recent    = [...assigned, ...working, ...completed].slice(0, 10)

  // KEEPING ORIGINAL ACTION LOGIC UNCHANGED
  const handleAction = async (c) => {
    if (c._type === 'BOOKING') {
      if (c.status === 'received') {
        // Not started yet — go to Assigned Tasks to click Start Work
        navigate('/admin/cases')
      } else {
        // In progress or completed — open booking chat
        navigate('/admin/chat', { state: { bookingId: c.id } })
      }
      return
    }
    if (['received', 'assigned'].includes(c.status)) {
      try {
        await casesAPI.updateStatus(c.id, { status: 'working' })
        casesAPI.invalidateCases()
        setCases((prev) => prev.map((x) => x.id === c.id ? { ...x, status: 'working' } : x))
        try {
          await chatAPI.sendMessage({
            case: c.id,
            message_type: 'text',
            message: '👋 I have started working on your case. I will keep you updated.',
          })
        } catch { /* chat message optional */ }
        toast.success('Case started — navigating to chat')
        navigate('/admin/chat', { state: { caseId: c.id } })
      } catch {
        toast.error('Failed to update status')
      }
    } else {
      navigate(`/admin/cases/${c.id}`)
    }
  }

  const STATS = [
    {
      label: 'Assigned', count: loading ? '–' : allRows.length,
      color: 'text-[#facc15]', borderColor: 'border-[#facc15]/20', bgColor: 'bg-[#facc15]/5',
      to: '/admin/cases', delay: 0,
    },
    {
      label: 'Working', count: loading ? '–' : working.length,
      color: 'text-[#38bdf8]', borderColor: 'border-[#38bdf8]/20', bgColor: 'bg-[#38bdf8]/5',
      to: '/admin/work', delay: 0.06,
    },
    {
      label: 'Completed', count: loading ? '–' : completed.length,
      color: 'text-[#4ade80]', borderColor: 'border-[#4ade80]/20', bgColor: 'bg-[#4ade80]/5',
      to: '/admin/done', delay: 0.12,
    },
  ]

  return (
    <AdminLayout pageTitle="Baba Dashboard">
      <div className="max-w-7xl mx-auto px-6 space-y-10 py-4">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STATS.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* ── Recent tasks table ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-[#181818] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between px-8 py-7">
            <h2 className="text-white text-2xl font-bold tracking-tight">Recent Assigned Tasks</h2>
            <button
              onClick={() => navigate('/admin/cases')}
              className="text-sm font-semibold text-white/60 hover:text-white flex items-center gap-2 bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl transition-all"
            >
              View All Cases <FiChevronRight size={18} />
            </button>
          </div>

          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/[0.03] border-y border-white/5">
                    {['Case #', 'Client Name', 'Service', 'Date', 'Status', 'Action'].map((h) => (
                      <th key={h} className="px-8 py-5 text-left text-[11px] font-bold text-white/30 uppercase tracking-[0.2em]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recent.map((c) => {
                    const { label, cls } = statusMeta(c.status)
                    const isPending = ['received', 'assigned'].includes(c.status)
                    const isBooking = c._type === 'BOOKING'
                    return (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-6 text-sm">
                          <p className="text-white/80 font-medium">{c.case_number || '—'}</p>
                          {isBooking && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-900/30">
                              Booking
                            </span>
                          )}
                          {!isBooking && c.booking_id && (
                            <p className="text-white/30 text-xs mt-0.5">Booking: {c.booking_id}</p>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-white/90 text-xs font-bold shadow-inner">
                              {clientInitials(c.client_name || '')}
                            </div>
                            <span className="text-white font-semibold text-[15px]">{c.client_name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-white/50 text-sm">
                          {c.service_name || '—'}
                        </td>
                        <td className="px-8 py-6 text-white/50 text-sm">
                          {formatDate(c.created_at)}
                        </td>
                        <td className="px-8 py-6">
                          <span className={`text-[11px] font-bold px-4 py-1.5 rounded-full border shadow-sm ${cls}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <button
                            onClick={() => handleAction(c)}
                            className={`text-xs font-bold px-6 py-2.5 rounded-xl transition-all duration-300
                              ${isPending
                                ? 'bg-[#ff0000] hover:bg-red-500 text-white shadow-[0_0_20px_rgba(255,0,0,0.3)]'
                                : 'bg-zinc-800/80 hover:bg-zinc-700 text-white/80 border border-white/10'
                              }`}
                          >
                            {isBooking
                              ? isPending ? 'Start Work' : c.status === 'working' ? 'Continue' : 'View'
                              : isPending ? 'Start Work' : 'View'
                            }
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  )
}
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { FiUsers, FiCalendar, FiClock, FiUser, FiX, FiTag, FiTrash2 } from 'react-icons/fi'
import { casesAPI, accountsAPI, bookingsAPI } from '../../api'
import SuperAdminLayout from './SuperAdminLayout'
import LoadingScreen from '../../components/LoadingScreen'

const TYPE_TABS = [
  { key: 'all',     label: 'All' },
  { key: 'BOOKING', label: 'Bookings' },
  { key: 'CASE',    label: 'Cases' },
]

const STATUS_TABS = [
  { key: 'all',       label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'working',   label: 'Working' },
  { key: 'completed', label: 'Completed' },
]

// Normalize status labels for both bookings and cases
const STATUS_META = {
  // Case statuses
  received:  { label: 'Pending',     dot: 'bg-yellow-400', badgeCls: 'bg-yellow-500/15 text-yellow-400 border border-yellow-900/30' },
  working:   { label: 'In Progress', dot: 'bg-blue-400',   badgeCls: 'bg-blue-500/15 text-blue-400 border border-blue-900/30' },
  completed: { label: 'Completed',   dot: 'bg-green-400',  badgeCls: 'bg-green-500/15 text-green-400 border border-green-900/30' },
  // Booking statuses
  pending:          { label: 'Pending',   dot: 'bg-yellow-400', badgeCls: 'bg-yellow-500/15 text-yellow-400 border border-yellow-900/30' },
  payment_pending:  { label: 'Awaiting Payment', dot: 'bg-orange-400', badgeCls: 'bg-orange-500/15 text-orange-400 border border-orange-900/30' },
  cancelled:        { label: 'Cancelled', dot: 'bg-red-400',    badgeCls: 'bg-red-500/15 text-red-400 border border-red-900/30' },
}

// Map to a common status key for the status filter tab
function normalizeStatus(item) {
  if (item.item_type === 'BOOKING') {
    if (item.status === 'completed') return 'pending' // paid booking awaiting assignment
    return item.status
  }
  // Case
  if (item.status === 'received') return 'pending'
  return item.status
}

export default function SuperAdminAuraAssignmentsPage() {
  const [items, setItems]       = useState([])   // unified list of { item_type, ...data }
  const [admins, setAdmins]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [typeTab, setTypeTab]   = useState('all')
  const [statusTab, setStatusTab] = useState('all')
  const [assignModal, setAssignModal] = useState(null)  // { type: 'BOOKING'|'CASE', id }
  const [selectedAdmin, setSelectedAdmin] = useState('')
  const [assigning, setAssigning]   = useState(false)
  const [deleting, setDeleting]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  useEffect(() => {
    Promise.allSettled([
      bookingsAPI.allBookings(),
      casesAPI.allCases(),
      accountsAPI.adminUsers(),
    ]).then(([bookingsRes, casesRes, adminsRes]) => {
      const combined = []

      if (bookingsRes.status === 'fulfilled') {
        const d = bookingsRes.value.data
        const bookingList = Array.isArray(d) ? d : d.results || []
        // Only show bookings that are paid (status=completed), Form 2 submitted, and NOT astrology
        bookingList
          .filter(b => {
            const stype = b.service_type || b.service?.service_type || b.selected_service
            return b.status === 'completed' && b.form2_submitted === true && stype !== 'astrology'
          })
          .forEach(b => combined.push({
            item_type:    'BOOKING',
            id:           b.id,
            ref:          b.booking_id || b.id,
            status:       b.status,
            client_name:  b.full_name || b.user_name || '—',
            client_email: b.email || '',
            service_name: b.service_name || '',
            admin_name:   b.admin_name || '',
            created_at:   b.created_at,
          }))
      } else {
        toast.error('Failed to load bookings')
      }

      if (casesRes.status === 'fulfilled') {
        const d = casesRes.value.data
        const caseList = Array.isArray(d) ? d : d.results || []
        caseList.forEach(c => combined.push({
          item_type:    'CASE',
          id:           c.id,
          ref:          c.case_number || '—',
          status:       c.status,
          client_name:  c.client_name || '—',
          client_email: c.client_email || '',
          service_name: c.service_name || '',
          admin_name:   c.admin_name || '',
          created_at:   c.created_at,
        }))
      } else {
        toast.error('Failed to load cases')
      }

      if (adminsRes.status === 'fulfilled') {
        const d = adminsRes.value.data
        setAdmins(Array.isArray(d) ? d : d.data || d.results || [])
      }

      setItems(combined)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = items
    .filter(i => typeTab === 'all' || i.item_type === typeTab)
    .filter(i => {
      if (statusTab === 'all') return true
      return normalizeStatus(i) === statusTab
    })

  const handleAssign = async () => {
    if (!selectedAdmin) { toast.error('Please select an admin'); return }
    if (!assignModal) return
    setAssigning(true)
    try {
      const { type, id } = assignModal
      if (type === 'BOOKING') {
        await bookingsAPI.assign(id, { admin_id: selectedAdmin })
        setItems(prev => prev.map(i =>
          i.item_type === 'BOOKING' && i.id === id
            ? { ...i, admin_name: admins.find(a => a.id === selectedAdmin)?.full_name || i.admin_name }
            : i
        ))
      } else {
        const { data } = await casesAPI.assign(id, { admin_id: selectedAdmin })
        const updatedCase = data.data || {}
        setItems(prev => prev.map(i =>
          i.item_type === 'CASE' && i.id === id
            ? { ...i, status: updatedCase.status || 'working', admin_name: updatedCase.assigned_admin?.full_name || i.admin_name }
            : i
        ))
      }
      toast.success('Assigned successfully')
      setAssignModal(null)
      setSelectedAdmin('')
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to assign'
      toast.error(msg)
    } finally {
      setAssigning(false)
    }
  }

  const deleteItem = async (item) => {
    setConfirmDel(null)
    setDeleting(item.id)
    try {
      if (item.item_type === 'CASE') {
        await casesAPI.deleteCase(item.id)
      } else {
        await bookingsAPI.deleteBooking(item.id)
      }
      setItems(prev => prev.filter(i => i.id !== item.id))
      toast.success(`${item.item_type === 'CASE' ? 'Case' : 'Booking'} deleted`)
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <SuperAdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Aura Assignments</h1>
        <p className="text-white/35 text-sm mt-1">Manage and assign bookings and cases</p>
      </div>

      {/* Type filter (Bookings / Cases / All) */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TYPE_TABS.map(({ key, label }) => {
          const count = key === 'all' ? items.length : items.filter(i => i.item_type === key).length
          return (
            <button
              key={key}
              onClick={() => setTypeTab(key)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                typeTab === key
                  ? key === 'CASE'
                    ? 'bg-purple-900/30 text-purple-400 border border-purple-900/40'
                    : key === 'BOOKING'
                      ? 'bg-red-900/30 text-red-400 border border-red-900/40'
                      : 'bg-white/10 text-white border border-white/15'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {label}
              {count > 0 && <span className="ml-1.5 opacity-50">({count})</span>}
            </button>
          )
        })}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_TABS.map(({ key, label }) => {
          const base = typeTab === 'all' ? items : items.filter(i => i.item_type === typeTab)
          const count = key === 'all' ? base.length : base.filter(i => normalizeStatus(i) === key).length
          return (
            <button
              key={key}
              onClick={() => setStatusTab(key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusTab === key
                  ? 'bg-white/10 text-white border border-white/15'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {label}
              {count > 0 && <span className="ml-1.5 opacity-50">({count})</span>}
            </button>
          )
        })}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-white/15 text-sm border border-white/5 rounded-2xl">No items found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item, i) => {
            const isCase    = item.item_type === 'CASE'
            const meta      = STATUS_META[item.status] || STATUS_META.received
            const isAssigned = !!item.admin_name
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass rounded-2xl border border-white/5 p-5 flex flex-col gap-3"
              >
                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full w-fit ${meta.badgeCls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>

                {/* ID row â€” BOOK-XXXX for bookings, CASE-XXXX for cases */}
                <div className="flex items-center gap-1.5 -mb-1">
                  <FiTag size={10} className={isCase ? 'text-purple-400' : 'text-red-400/70'} />
                  <p className={`text-xs font-semibold ${isCase ? 'text-purple-400' : 'text-red-400/70'}`}>
                    {item.ref}
                  </p>
                  <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    isCase
                      ? 'bg-purple-500/15 text-purple-400 border-purple-900/30'
                      : 'bg-red-500/15 text-red-400 border-red-900/30'
                  }`}>
                    {isCase ? 'Case' : 'Booking'}
                  </span>
                </div>

                {/* Client name */}
                <h3 className="text-white font-bold text-base leading-tight">{item.client_name}</h3>

                {/* Service */}
                {item.service_name && (
                  <div className="flex items-center gap-1.5 text-white/35 text-xs">
                    <FiUsers size={12} className="shrink-0" />
                    <span className="truncate">{item.service_name}</span>
                  </div>
                )}

                {/* Date & time */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-white/30 text-xs">
                    <FiCalendar size={11} />
                    <span>{item.created_at ? format(new Date(item.created_at), 'dd-MM-yyyy') : 'â€”'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/30 text-xs">
                    <FiClock size={11} />
                    <span>{item.created_at ? format(new Date(item.created_at), 'HH:mm') : 'â€”'}</span>
                  </div>
                </div>

                {/* Assigned admin */}
                {item.admin_name && (
                  <div className="flex items-center gap-1.5 text-white/25 text-xs">
                    <FiUser size={11} className="shrink-0" />
                    <span className="truncate">{item.admin_name}</span>
                  </div>
                )}

                {/* Action */}
                <div className="mt-auto pt-1 flex flex-col gap-2">
                  {!isAssigned && (
                    <button
                      onClick={() => { setAssignModal({ type: item.item_type, id: item.id }); setSelectedAdmin('') }}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      Assign to Baba
                    </button>
                  )}
                  {confirmDel === item.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-xs flex-1">Delete?</span>
                      <button onClick={() => deleteItem(item)} className="px-3 py-1.5 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors">Yes</button>
                      <button onClick={() => setConfirmDel(null)} className="px-3 py-1.5 text-xs bg-white/5 text-white/50 rounded-lg transition-colors">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDel(item.id)}
                      disabled={deleting === item.id}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-white/20 hover:text-red-400 hover:bg-red-900/15 rounded-xl transition-all disabled:opacity-40"
                    >
                      <FiTrash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Assign Modal */}
      <AnimatePresence>
        {assignModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl border border-white/10 p-7 max-w-sm w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">Assign to Baba</h3>
                <button
                  onClick={() => { setAssignModal(null); setSelectedAdmin('') }}
                  className="text-white/30 hover:text-white/70 transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>

              <p className="text-white/40 text-sm mb-5">
                Select an admin to assign this {assignModal.type === 'BOOKING' ? 'booking' : 'case'} to.
              </p>

              <select
                value={selectedAdmin}
                onChange={(e) => setSelectedAdmin(e.target.value)}
                className="input-field mb-5"
              >
                <option value="">Select an admin...</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>{a.full_name || a.email}</option>
                ))}
              </select>

              <div className="flex gap-3">
                <button
                  onClick={() => { setAssignModal(null); setSelectedAdmin('') }}
                  className="flex-1 py-2.5 text-sm text-white/40 hover:text-white/70 border border-white/10 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={assigning || !selectedAdmin}
                  className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50"
                >
                  {assigning ? 'Assigningâ€¦' : 'Assign'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SuperAdminLayout>
  )
}

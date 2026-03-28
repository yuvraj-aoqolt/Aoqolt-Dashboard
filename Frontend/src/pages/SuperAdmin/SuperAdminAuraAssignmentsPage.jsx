import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { FiUsers, FiCalendar, FiClock, FiUser, FiX } from 'react-icons/fi'
import { casesAPI, accountsAPI } from '../../api'
import SuperAdminLayout from './SuperAdminLayout'
import LoadingScreen from '../../components/LoadingScreen'

const TABS = [
  { key: 'all',      label: 'All' },
  { key: 'received', label: 'Pending' },
  { key: 'working',  label: 'Working' },
  { key: 'completed',label: 'Completed' },
]

const STATUS_META = {
  received:  { label: 'Pending',     dot: 'bg-yellow-400', badgeCls: 'bg-yellow-500/15 text-yellow-400 border border-yellow-900/30' },
  working:   { label: 'In Progress', dot: 'bg-blue-400',   badgeCls: 'bg-blue-500/15 text-blue-400 border border-blue-900/30' },
  completed: { label: 'Completed',   dot: 'bg-green-400',  badgeCls: 'bg-green-500/15 text-green-400 border border-green-900/30' },
}

function caseShortId(caseNumber) {
  if (!caseNumber) return 'C-???'
  const parts = caseNumber.split('-')
  return `C- ${parts[parts.length - 1]}`
}

export default function SuperAdminAuraAssignmentsPage() {
  const [cases, setCases] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [assignModal, setAssignModal] = useState(null)
  const [selectedAdmin, setSelectedAdmin] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    Promise.allSettled([casesAPI.allCases(), accountsAPI.adminUsers()])
      .then(([casesRes, adminsRes]) => {
        if (casesRes.status === 'fulfilled') {
          const d = casesRes.value.data
          setCases(Array.isArray(d) ? d : d.results || [])
        } else {
          toast.error('Failed to load cases')
        }
        if (adminsRes.status === 'fulfilled') {
          const d = adminsRes.value.data
          setAdmins(Array.isArray(d) ? d : d.data || d.results || [])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = tab === 'all' ? cases : cases.filter(c => c.status === tab)

  const handleAssign = async () => {
    if (!selectedAdmin) { toast.error('Please select an admin'); return }
    setAssigning(true)
    try {
      const { data } = await casesAPI.assign(assignModal, { admin_id: selectedAdmin })
      const updatedCase = data.data || {}
      setCases(prev => prev.map(c =>
        c.id === assignModal
          ? { ...c, status: updatedCase.status || 'working', admin_name: updatedCase.assigned_admin?.full_name || c.admin_name }
          : c
      ))
      toast.success('Case assigned successfully')
      setAssignModal(null)
      setSelectedAdmin('')
    } catch {
      toast.error('Failed to assign case')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <SuperAdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Aura Assignments</h1>
        <p className="text-white/35 text-sm mt-1">Manage and track aura scan assignments</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(({ key, label }) => {
          const count = key === 'all' ? cases.length : cases.filter(c => c.status === key).length
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                tab === key
                  ? 'bg-red-900/30 text-red-400 border border-red-900/40'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {label}
              {count > 0 && <span className="ml-1.5 opacity-60">({count})</span>}
            </button>
          )
        })}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-white/15 text-sm">No cases found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c, i) => {
            const meta = STATUS_META[c.status] || STATUS_META.received
            return (
              <motion.div
                key={c.id}
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

                {/* Case ID */}
                <p className="text-white/40 text-xs font-medium -mb-1">{caseShortId(c.case_number)}</p>

                {/* Client name */}
                <h3 className="text-white font-bold text-base leading-tight">{c.client_name || '—'}</h3>

                {/* Service */}
                <div className="flex items-center gap-1.5 text-white/35 text-xs">
                  <FiUsers size={12} className="shrink-0" />
                  <span className="truncate">{c.service_name || '—'}</span>
                </div>

                {/* Date & time */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-white/30 text-xs">
                    <FiCalendar size={11} />
                    <span>{c.created_at ? format(new Date(c.created_at), 'dd-MM-yyyy') : '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/30 text-xs">
                    <FiClock size={11} />
                    <span>{c.created_at ? format(new Date(c.created_at), 'HH:mm') : '—'}</span>
                  </div>
                </div>

                {/* Assigned admin */}
                {c.admin_name && (
                  <div className="flex items-center gap-1.5 text-white/25 text-xs">
                    <FiUser size={11} className="shrink-0" />
                    <span className="truncate">{c.admin_name}</span>
                  </div>
                )}

                {/* Action button — pushed to bottom */}
                <div className="mt-auto pt-1">
                  {c.status === 'received' ? (
                    <button
                      onClick={() => { setAssignModal(c.id); setSelectedAdmin('') }}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      Assign to Baba
                    </button>
                  ) : (
                    <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/55 hover:text-white/85 text-sm font-medium rounded-xl transition-colors">
                      View Progress
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

              <p className="text-white/40 text-sm mb-5">Select an admin to assign this case to.</p>

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
                  {assigning ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SuperAdminLayout>
  )
}

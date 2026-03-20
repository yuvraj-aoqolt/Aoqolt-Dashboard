import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { casesAPI, accountsAPI } from '../../api'
import SuperAdminLayout from './SuperAdminLayout'
import LoadingScreen from '../../components/LoadingScreen'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { FiUser } from 'react-icons/fi'

const STATUS_TABS = ['all', 'received', 'working', 'completed']

const statusBadge = (s) => {
  const m = { received: 'bg-blue-900/30 text-blue-400', working: 'bg-orange-900/30 text-orange-400', completed: 'bg-green-900/30 text-green-400' }
  return m[s] || 'bg-white/5 text-white/30'
}

export default function SuperAdminCasesPage() {
  const [cases, setCases] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [assignTarget, setAssignTarget] = useState(null) // { caseId, open }
  const [selectedAdmin, setSelectedAdmin] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [casesRes, adminsRes] = await Promise.allSettled([
          casesAPI.allCases(),
          accountsAPI.adminUsers(),
        ])
        if (casesRes.status === 'fulfilled') {
          const d = casesRes.value.data
          setCases(Array.isArray(d) ? d : d.results || [])
        }
        if (adminsRes.status === 'fulfilled') {
          const d = adminsRes.value.data
          setAdmins(Array.isArray(d) ? d : d.results || [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = tab === 'all' ? cases : cases.filter((c) => c.status === tab)

  const handleAssign = async () => {
    if (!selectedAdmin) { toast.error('Select an admin'); return }
    setAssigning(true)
    try {
      const { data } = await casesAPI.assign(assignTarget.caseId, { admin_id: selectedAdmin })
      setCases((prev) => prev.map((c) => c.id === assignTarget.caseId ? { ...c, assigned_admin: data.assigned_admin } : c))
      toast.success('Admin assigned')
      setAssignTarget(null)
      setSelectedAdmin('')
    } catch {
      toast.error('Failed to assign admin')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <SuperAdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-white">All Cases</h1>
          <p className="text-white/30 text-sm mt-1">{cases.length} total cases</p>
        </div>

        {/* tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUS_TABS.map((s) => {
            const count = s === 'all' ? cases.length : cases.filter((c) => c.status === s).length
            return (
              <button key={s} onClick={() => setTab(s)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${tab === s ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-900/30' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}>
                {s} {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
              </button>
            )
          })}
        </div>

        {/* Assign modal */}
        {assignTarget && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl border border-white/10 p-7 max-w-sm w-full">
              <h3 className="text-white font-bold mb-4">Assign Admin</h3>
              <select value={selectedAdmin} onChange={(e) => setSelectedAdmin(e.target.value)} className="input-field mb-4">
                <option value="">Select an admin...</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>{a.full_name || a.email}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button onClick={() => { setAssignTarget(null); setSelectedAdmin('') }}
                  className="flex-1 py-2.5 text-sm text-white/40 hover:text-white/70 border border-white/10 rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={handleAssign} disabled={assigning}
                  className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-60">
                  {assigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-20 text-white/20">No cases found</div>
          )}
          {filtered.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="glass rounded-2xl border border-white/5 p-5 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="text-white font-medium text-sm">{c.case_number}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs capitalize ${statusBadge(c.status)}`}>{c.status}</span>
                  {c.priority === 'high' && <span className="px-2 py-0.5 text-xs rounded-full bg-red-900/30 text-red-400">High</span>}
                </div>
                <p className="text-white/35 text-xs">{c.client?.full_name} — {c.booking?.service?.name}</p>
                {c.assigned_admin && (
                  <p className="text-white/25 text-xs mt-1 flex items-center gap-1">
                    <FiUser size={11} /> {c.assigned_admin?.full_name || 'Assigned'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setAssignTarget({ caseId: c.id })}
                  className="px-4 py-2 text-xs text-yellow-400/70 hover:text-yellow-400 border border-yellow-900/20 hover:border-yellow-900/50 rounded-xl transition-all">
                  {c.assigned_admin ? 'Reassign' : 'Assign'}
                </button>
                <Link to={`/admin/cases/${c.id}`}
                  className="px-4 py-2 text-xs bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all">
                  View
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </SuperAdminLayout>
  )
}

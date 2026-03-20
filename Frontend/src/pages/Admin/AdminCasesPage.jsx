import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight, FiFilter } from 'react-icons/fi'
import { casesAPI } from '../../api'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  received:  'bg-blue-900/30 text-blue-400 border-blue-900/40',
  working:   'bg-purple-900/30 text-purple-400 border-purple-900/40',
  completed: 'bg-green-900/30 text-green-400 border-green-900/40',
  cancelled: 'bg-red-900/30 text-red-400 border-red-900/40',
}

export default function AdminCasesPage() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    casesAPI.allCases()
      .then(({ data }) => setCases(Array.isArray(data) ? data : data.results || []))
      .catch(() => toast.error('Failed to load cases'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? cases : cases.filter((c) => c.status === filter)

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-2xl font-bold text-white mb-1">My Cases</h1>
          <p className="text-white/40 text-sm">Manage and work on assigned cases</p>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'received', 'working', 'completed'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-red-900/40 text-red-400 border border-red-900/50' : 'text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-2 text-xs opacity-60">{f === 'all' ? cases.length : cases.filter((c) => c.status === f).length}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map((i) => <div key={i} className="glass rounded-2xl border border-white/5 h-20 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl border border-white/5">
            <p className="text-white/25">No cases found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/admin/cases/${c.id}`}>
                  <div className="glass rounded-2xl border border-white/5 hover:border-red-900/25 p-5 transition-all group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-white font-semibold">{c.case_number}</p>
                          <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLORS[c.status] || ''}`}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-white/50 text-sm">{c.client?.full_name} — {c.booking?.service?.name}</p>
                        <p className="text-white/25 text-xs mt-0.5">{c.priority} priority</p>
                      </div>
                      <FiArrowRight size={16} className="text-white/25 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

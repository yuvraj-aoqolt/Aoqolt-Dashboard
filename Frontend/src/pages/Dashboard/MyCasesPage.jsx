import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight, FiMessageCircle } from 'react-icons/fi'
import { casesAPI } from '../../api'
import DashboardLayout from './DashboardLayout'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  received:  'bg-blue-900/30 text-blue-400 border-blue-900/40',
  working:   'bg-purple-900/30 text-purple-400 border-purple-900/40',
  completed: 'bg-green-900/30 text-green-400 border-green-900/40',
  cancelled: 'bg-red-900/30 text-red-400 border-red-900/40',
}

const PRIORITY_COLORS = {
  low:    'text-green-400',
  medium: 'text-yellow-400',
  high:   'text-orange-400',
  urgent: 'text-red-400',
}

export default function MyCasesPage() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    casesAPI.myCases()
      .then(({ data }) => setCases(data.data || data.results || (Array.isArray(data) ? data : [])))
      .catch(() => toast.error('Failed to load cases'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white mb-1">My Cases</h1>
          <p className="text-white/40 text-sm">Track your spiritual session cases</p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl border border-white/5 p-5 animate-pulse">
                <div className="flex justify-between mb-3">
                  <div className="h-4 bg-white/5 rounded w-36" />
                  <div className="h-6 bg-white/5 rounded-full w-20" />
                </div>
                <div className="h-3 bg-white/5 rounded w-48" />
              </div>
            ))}
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl border border-white/5">
            <p className="text-white/30 text-5xl mb-4">📁</p>
            <p className="text-white/40 font-medium">No cases yet</p>
            <p className="text-white/25 text-sm mt-1 mb-6">Book a service to get started</p>
            <Link to="/services">
              <button className="btn-primary px-6 py-2.5 text-sm">Browse Services</button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cases.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Link to={`/dashboard/cases/${c.id}`}>
                  <div className="glass rounded-2xl border border-white/5 hover:border-red-900/25 p-5 transition-all group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <p className="text-white font-semibold">{c.case_number}</p>
                          <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLORS[c.status] || ''}`}>
                            {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                          </span>
                          <span className={`text-xs font-medium ${PRIORITY_COLORS[c.priority] || 'text-white/40'}`}>
                            {c.priority} priority
                          </span>
                        </div>
                        <p className="text-white/50 text-sm">{c.booking?.service?.name}</p>
                        {c.assigned_admin && (
                          <p className="text-white/25 text-xs mt-1">
                            Assigned to: {c.assigned_admin.full_name}
                          </p>
                        )}
                        <p className="text-white/20 text-xs mt-0.5">
                          {new Date(c.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-white/25 text-xs">
                          <FiMessageCircle size={13} />
                          Chat
                        </div>
                        <FiArrowRight size={16} className="text-white/25 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-500"
                        style={{
                          width: c.status === 'received' ? '25%'
                               : c.status === 'working'   ? '65%'
                               : c.status === 'completed' ? '100%'
                               : '0%'
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      {['Received', 'In Progress', 'Completed'].map((s, j) => (
                        <span key={j} className="text-white/20 text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

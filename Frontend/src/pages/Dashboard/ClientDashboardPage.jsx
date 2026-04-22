import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight, FiClock, FiCheck, FiAlertCircle } from 'react-icons/fi'
import { MdFolder, MdCalendarToday } from 'react-icons/md'
import { dashboardAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import DashboardLayout from './DashboardLayout'

const STATUS_COLORS = {
  pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-900/40',
  payment_pending: 'bg-orange-900/30 text-orange-400 border-orange-900/40',
  completed: 'bg-green-900/30 text-green-400 border-green-900/40',
  cancelled: 'bg-red-900/30 text-red-400 border-red-900/40',
  received: 'bg-blue-900/30 text-blue-400 border-blue-900/40',
  working: 'bg-purple-900/30 text-purple-400 border-purple-900/40',
}

export default function ClientDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.client()
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold text-white mb-1">
            Welcome back, <span className="gradient-text">{user?.full_name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-white/40">Track and manage your sessions</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl border border-white/5 p-5 animate-pulse">
                <div className="h-8 bg-white/5 rounded mb-2 w-12" />
                <div className="h-3 bg-white/5 rounded w-20" />
              </div>
            ))
          ) : (
            [
              { label: 'Total Bookings', value: stats?.total_bookings ?? '–', icon: <MdCalendarToday size={20} />, color: 'text-blue-400' },
              { label: 'Active Cases', value: stats?.active_cases ?? '–', icon: <MdFolder size={20} />, color: 'text-purple-400' },
              { label: 'Completed', value: stats?.completed_cases ?? '–', icon: <FiCheck size={20} />, color: 'text-green-400' },
              { label: 'Pending', value: stats?.pending_cases ?? '–', icon: <FiClock size={20} />, color: 'text-yellow-400' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-2xl border border-white/5 p-5"
              >
                <div className={`${stat.color} mb-3`}>{stat.icon}</div>
                <p className="text-white font-bold text-2xl">{stat.value}</p>
                <p className="text-white/40 text-xs mt-0.5">{stat.label}</p>
              </motion.div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/services" className="group glass rounded-2xl border border-red-900/20 hover:border-red-700/40 p-5 flex items-center justify-between transition-all hover:shadow-lg hover:shadow-red-950/20">
              <div>
                <p className="text-white font-medium mb-1">Book a Service</p>
                <p className="text-white/35 text-sm">Start a new spiritual session</p>
              </div>
              <FiArrowRight size={20} className="text-red-500/50 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
            </Link>
            <Link to="/dashboard/cases" className="group glass rounded-2xl border border-white/5 hover:border-white/15 p-5 flex items-center justify-between transition-all">
              <div>
                <p className="text-white font-medium mb-1">View My Cases</p>
                <p className="text-white/35 text-sm">Track progress & chat</p>
              </div>
              <FiArrowRight size={20} className="text-white/25 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </motion.div>

        {/* Recent Cases */}
        {stats?.recent_cases?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Recent Cases</h2>
              <Link to="/dashboard/cases" className="text-red-400 hover:text-red-300 text-xs transition-colors">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {stats.recent_cases.slice(0, 3).map((c) => (
                <Link key={c.id} to={`/dashboard/cases/${c.id}`}>
                  <div className="glass rounded-xl border border-white/5 hover:border-red-900/30 p-4 flex items-center justify-between transition-all group">
                    <div>
                      <p className="text-white text-sm font-medium">{c.case_number}</p>
                      <p className="text-white/35 text-xs mt-0.5">{c.booking?.service?.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLORS[c.status] || ''}`}>
                        {c.status}
                      </span>
                      <FiArrowRight size={14} className="text-white/25 group-hover:text-white/60 transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}

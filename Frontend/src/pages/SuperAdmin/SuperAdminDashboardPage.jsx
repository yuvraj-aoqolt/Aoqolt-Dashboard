import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { casesAPI, dashboardAPI } from '../../api'
import SuperAdminLayout from './SuperAdminLayout'
import LoadingScreen from '../../components/LoadingScreen'
import { FiList, FiUsers, FiCheckCircle, FiClock } from 'react-icons/fi'

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await dashboardAPI.superAdmin()
        setStats(data)
      } catch {
        // fallback: compute from cases list
        try {
          const { data } = await casesAPI.allCases()
          const cases = Array.isArray(data) ? data : data.results || []
          setStats({
            total_cases: cases.length,
            received: cases.filter((c) => c.status === 'received').length,
            working: cases.filter((c) => c.status === 'working').length,
            completed: cases.filter((c) => c.status === 'completed').length,
          })
        } catch {}
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />

  const cards = [
    { label: 'Total Cases', value: stats?.total_cases ?? 0, icon: FiList, color: 'from-yellow-600 to-yellow-900' },
    { label: 'Received', value: stats?.received ?? 0, icon: FiClock, color: 'from-blue-600 to-blue-900' },
    { label: 'In Progress', value: stats?.working ?? 0, icon: FiUsers, color: 'from-orange-600 to-orange-900' },
    { label: 'Completed', value: stats?.completed ?? 0, icon: FiCheckCircle, color: 'from-green-600 to-green-900' },
  ]

  return (
    <SuperAdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white">Super Admin Dashboard</h1>
          <p className="text-white/30 text-sm mt-1">Full platform overview</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {cards.map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl border border-white/5 p-5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-3`}>
                <c.icon size={18} className="text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{c.value}</p>
              <p className="text-white/35 text-sm">{c.label}</p>
            </motion.div>
          ))}
        </div>

        {stats?.total_revenue != null && (
          <div className="glass rounded-2xl border border-yellow-900/20 p-6">
            <h3 className="text-yellow-400 text-xs uppercase tracking-wider mb-2">Total Revenue</h3>
            <p className="text-4xl font-bold text-white">${Number(stats.total_revenue).toLocaleString()}</p>
          </div>
        )}
      </motion.div>
    </SuperAdminLayout>
  )
}

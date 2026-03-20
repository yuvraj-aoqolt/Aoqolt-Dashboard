import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { casesAPI } from '../../api'
import AdminLayout from './AdminLayout'

export default function AdminDashboardPage() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    casesAPI.allCases()
      .then(({ data }) => setCases(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const myCases = cases.filter((c) => c.status !== 'completed' && c.status !== 'cancelled')
  const completed = cases.filter((c) => c.status === 'completed')

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold text-white mb-1">Admin Dashboard</h1>
          <p className="text-white/40">Manage assigned cases and client communications</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Cases', value: cases.length },
            { label: 'Active', value: myCases.length, color: 'text-purple-400' },
            { label: 'Completed', value: completed.length, color: 'text-green-400' },
            { label: 'Pending', value: cases.filter((c) => c.status === 'received').length, color: 'text-yellow-400' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl border border-white/5 p-5">
              <p className={`text-2xl font-bold mb-1 ${s.color || 'text-white'}`}>{loading ? '–' : s.value}</p>
              <p className="text-white/40 text-xs">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="glass rounded-2xl border border-white/5 p-6">
          <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Active Cases</h2>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-14 bg-white/3 rounded-xl animate-pulse" />)}</div>
          ) : myCases.length === 0 ? (
            <p className="text-white/25 text-center py-8">No active cases</p>
          ) : (
            <div className="space-y-3">
              {myCases.slice(0, 10).map((c) => (
                <a key={c.id} href={`/admin/cases/${c.id}`}
                  className="flex items-center justify-between glass rounded-xl border border-white/5 hover:border-red-900/25 p-4 transition-all group">
                  <div>
                    <p className="text-white text-sm font-medium">{c.case_number}</p>
                    <p className="text-white/35 text-xs">{c.client?.full_name} — {c.booking?.service?.name}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border capitalize
                    ${c.status === 'working' ? 'bg-purple-900/30 text-purple-400 border-purple-900/40'
                    : 'bg-blue-900/30 text-blue-400 border-blue-900/40'}`}>
                    {c.status}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

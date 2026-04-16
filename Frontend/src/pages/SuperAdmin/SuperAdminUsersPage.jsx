import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { accountsAPI } from '../../api'
import SuperAdminLayout from './SuperAdminLayout'
import LoadingScreen from '../../components/LoadingScreen'
import toast from 'react-hot-toast'
import { FiUser, FiShield, FiSearch, FiTrash2 } from 'react-icons/fi'

const ROLE_TABS = ['all', 'client', 'admin', 'superadmin']

const roleBadge = (r) => ({
  superadmin: 'bg-yellow-900/30 text-yellow-400',
  admin: 'bg-orange-900/30 text-orange-400',
  client: 'bg-blue-900/30 text-blue-400',
})[r] || 'bg-white/5 text-white/30'

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [promoting, setPromoting] = useState(null)
  const [deleting, setDeleting]   = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await accountsAPI.allUsers()
        setUsers(Array.isArray(data) ? data : data.results || [])
      } catch {
        toast.error('Failed to load users')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = users.filter((u) => {
    const matchRole = tab === 'all' || u.role === tab
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const promoteToAdmin = async (userId) => {
    setPromoting(userId)
    try {
      await accountsAPI.promoteToAdmin(userId)
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: 'admin' } : u))
      toast.success('User promoted to Admin')
    } catch {
      toast.error('Failed to promote user')
    } finally {
      setPromoting(null)
    }
  }

  const deleteUser = async (userId) => {
    setConfirmId(null)
    setDeleting(userId)
    try {
      await accountsAPI.deleteUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      toast.success('User deleted')
    } catch {
      toast.error('Failed to delete user')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <SuperAdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Users</h1>
            <p className="text-white/30 text-sm mt-1">{users.length} registered users</p>
          </div>
          <div className="relative">
            <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
              className="pl-9 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 focus:border-yellow-600/40 rounded-xl text-white placeholder:text-white/25 outline-none transition-all" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {ROLE_TABS.map((r) => {
            const count = r === 'all' ? users.length : users.filter((u) => u.role === r).length
            return (
              <button key={r} onClick={() => setTab(r)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${tab === r ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-900/30' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}>
                {r} {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
              </button>
            )
          })}
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-20 text-white/20">No users found</div>
          )}
          {filtered.map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="glass rounded-2xl border border-white/5 p-5 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white/50">
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <FiUser size={18} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-medium text-sm">{u.full_name || 'No name'}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${roleBadge(u.role)}`}>{u.role}</span>
                    {!u.is_active && <span className="px-2 py-0.5 rounded-full text-xs bg-red-900/30 text-red-400">Inactive</span>}
                  </div>
                  <p className="text-white/30 text-xs">{u.email}</p>
                </div>
              </div>
              {u.role === 'client' && (
                <button onClick={() => promoteToAdmin(u.id)} disabled={promoting === u.id}
                  className="px-4 py-2 text-xs text-yellow-400/70 hover:text-yellow-400 border border-yellow-900/20 hover:border-yellow-900/50 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50">
                  <FiShield size={12} /> {promoting === u.id ? 'Promoting...' : 'Promote to Admin'}
                </button>
              )}
              {confirmId === u.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-xs">Delete?</span>
                  <button onClick={() => deleteUser(u.id)} className="px-3 py-1.5 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors">Yes</button>
                  <button onClick={() => setConfirmId(null)} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/60 rounded-lg transition-colors">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmId(u.id)} disabled={deleting === u.id}
                  className="p-2 text-white/20 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50">
                  <FiTrash2 size={14} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </SuperAdminLayout>
  )
}

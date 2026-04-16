import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { accountsAPI } from '../../api'
import SuperAdminLayout from './SuperAdminLayout'
import LoadingScreen from '../../components/LoadingScreen'
import CreateUserModal from './CreateUserModal'
import ManageInviteModal from './ManageInviteModal'
import toast from 'react-hot-toast'
import { FiSearch, FiShield, FiUserPlus, FiLink, FiTrash2 } from 'react-icons/fi'

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [manageUser, setManageUser] = useState(null)
  const [deleting, setDeleting]     = useState(null)
  const [confirmId, setConfirmId]   = useState(null)

  useEffect(() => {
    accountsAPI.adminUsers()
      .then(({ data }) => {
        // /accounts/users/admins/ returns { success, count, data: [...] }
        const list = Array.isArray(data) ? data : (data.data || data.results || [])
        setAdmins(list)
      })
      .catch(() => toast.error('Failed to load admins'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = admins.filter((a) =>
    !search ||
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  )

  const deleteAdmin = async (id) => {
    setConfirmId(null)
    setDeleting(id)
    try {
      await accountsAPI.deleteUser(id)
      setAdmins((prev) => prev.filter((a) => a.id !== id))
      toast.success('Admin deleted')
    } catch {
      toast.error('Failed to delete admin')
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
            <h1 className="text-2xl font-bold text-white">Admins</h1>
            <p className="text-white/35 text-sm mt-1">{admins.length} admin accounts</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search admins…"
                className="pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/8 focus:border-white/20 rounded-xl text-white placeholder:text-white/25 outline-none transition-colors w-52"
              />
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black text-sm font-semibold transition-colors"
            >
              <FiUserPlus size={14} />
              Invite Admin
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/5 p-4 hover:border-orange-900/25 transition-colors glass"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-600 to-orange-700 flex items-center justify-center text-white text-sm font-bold">
                  {a.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{a.full_name}</p>
                  <p className="text-white/40 text-xs truncate">{a.email}</p>
                </div>
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium bg-orange-900/30 text-orange-400">
                  <FiShield size={10} /> Admin
                </span>
              </div>
              {a.total_cases != null && (
                <div className="mt-3 pt-3 border-t border-white/5 flex gap-4">
                  <div>
                    <p className="text-white font-semibold text-sm">{a.total_cases ?? 0}</p>
                    <p className="text-white/30 text-xs">Total Cases</p>
                  </div>
                  <div>
                    <p className="text-green-400 font-semibold text-sm">{a.completed_cases ?? 0}</p>
                    <p className="text-white/30 text-xs">Completed</p>
                  </div>
                </div>
              )}
              {/* Manage invite / reset */}
              <button
                onClick={() => setManageUser(a)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-white/35 hover:text-white/60 py-1.5 rounded-lg hover:bg-white/5 transition-all border border-transparent hover:border-white/8"
              >
                <FiLink size={11} />
                {a.is_active ? 'Reset Password Link' : 'Manage Invite'}
              </button>
              {/* Delete */}
              {confirmId === a.id ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-red-400 text-xs flex-1">Delete admin?</span>
                  <button onClick={() => deleteAdmin(a.id)} className="px-3 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors">Yes</button>
                  <button onClick={() => setConfirmId(null)} className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 text-white/60 rounded-lg transition-colors">No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(a.id)}
                  disabled={deleting === a.id}
                  className="mt-1 w-full flex items-center justify-center gap-1.5 text-xs text-white/20 hover:text-red-400 hover:bg-red-900/15 py-1.5 rounded-lg transition-all disabled:opacity-50"
                >
                  <FiTrash2 size={11} /> Delete
                </button>
              )}
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center py-16 text-white/25 text-sm">No admins found</p>
          )}
        </div>
      </motion.div>

      {/* Modals */}
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultRole="admin"
        onUserCreated={(u) => setAdmins((prev) => [u, ...prev])}
      />
      <ManageInviteModal
        open={!!manageUser}
        onClose={() => setManageUser(null)}
        user={manageUser}
      />
    </SuperAdminLayout>
  )
}

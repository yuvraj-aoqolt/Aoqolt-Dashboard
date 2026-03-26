import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { accountsAPI } from '../../api'
import SuperAdminLayout from './SuperAdminLayout'
import LoadingScreen from '../../components/LoadingScreen'
import CreateUserModal from './CreateUserModal'
import ManageInviteModal from './ManageInviteModal'
import toast from 'react-hot-toast'
import { FiSearch, FiUserPlus, FiLink } from 'react-icons/fi'

const AVATAR_COLORS = [
  'var(--color-avatar-1)',
  'var(--color-avatar-2)',
  'var(--color-avatar-3)',
  'var(--color-avatar-4)',
  'var(--color-avatar-5)',
  'var(--color-avatar-6)',
  'var(--color-avatar-7)',
  'var(--color-avatar-8)',
]

function initials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
}

const COLUMNS = ['#', 'Client', 'Email', 'Phone', 'Status', 'Actions']

export default function SuperAdminClientsPage() {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [manageUser, setManageUser] = useState(null)

  useEffect(() => {
    accountsAPI.allUsers()
      .then(({ data }) => {
        const all = Array.isArray(data) ? data : data.results || []
        setUsers(all.filter((u) => u.role === 'client'))
      })
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.phone_number?.includes(q)
    )
  })

  if (loading) return <LoadingScreen />

  return (
    <SuperAdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Clients</h1>
            <p className="text-white/35 text-sm mt-1">{users.length} registered clients</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone…"
                className="pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/8 focus:border-white/20 rounded-xl text-white placeholder:text-white/25 outline-none transition-colors w-56"
              />
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black text-sm font-semibold transition-colors"
            >
              <FiUserPlus size={14} />
              Invite Client
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-white/6">
                  {COLUMNS.map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-white/35 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
                  const phone = u.phone_number
                    ? `${u.country_code || ''} ${u.phone_number}`.trim()
                    : '—'
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/4 hover:bg-white/3 transition-colors"
                    >
                      {/* # */}
                      <td className="py-3 px-4 text-white/30 text-xs font-mono">{i + 1}</td>

                      {/* Client (avatar + full name) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {initials(u.full_name)}
                          </div>
                          <span className="text-white/85 text-sm font-medium whitespace-nowrap">{u.full_name || '—'}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 text-white/55 text-sm">{u.email || '—'}</td>

                      {/* Phone */}
                      <td className="py-3 px-4 text-white/55 text-sm whitespace-nowrap">{phone}</td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${
                          u.is_active
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setManageUser(u)}
                          className="flex items-center gap-1 text-xs text-white/35 hover:text-white/70 px-2 py-1 rounded-lg hover:bg-white/5 transition-all border border-transparent hover:border-white/8"
                        >
                          <FiLink size={11} />
                          {u.is_active ? 'Reset Link' : 'Invite Link'}
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <p className="text-center py-16 text-white/25 text-sm">No clients found</p>
          )}
        </div>

      </motion.div>

      {/* Modals */}
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultRole="client"
        onUserCreated={(u) => setUsers((prev) => [u, ...prev])}
      />
      <ManageInviteModal
        open={!!manageUser}
        onClose={() => setManageUser(null)}
        user={manageUser}
      />
    </SuperAdminLayout>
  )
}

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  FiSearch, FiShield, FiShieldOff, FiUsers, FiX,
} from 'react-icons/fi'
import { blogsAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import SuperAdminLayout from './SuperAdminLayout'
import LoadingScreen from '../../components/LoadingScreen'

function ManagerCard({ user, onRevoke, fetchProfile, currentUser }) {
  const [loading, setLoading] = useState(false)
  const handle = async () => {
    setLoading(true)
    try {
      await blogsAPI.assignRole({ user_id: user.id, can_manage: false })
      onRevoke(user.id)
      toast.success(`Blog access revoked from ${user.full_name}.`)
      if (currentUser?.id === user.id) fetchProfile()
    } catch {
      toast.error('Failed to revoke access.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-white/50 text-sm font-semibold flex-shrink-0">
          {user.full_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{user.full_name}</p>
          <p className="text-white/30 text-xs truncate">{user.email}</p>
        </div>
      </div>
      <button
        onClick={handle} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/20 hover:bg-red-900/35 text-red-400 text-xs font-medium transition-all disabled:opacity-40 flex-shrink-0"
      >
        <FiShieldOff size={12} />
        {loading ? 'Revoking…' : 'Revoke'}
      </button>
    </div>
  )
}

export default function SuperAdminBlogPermissionsPage() {
  const { fetchProfile, user: currentUser } = useAuth()
  const [managers, setManagers] = useState([])
  const [loading, setLoading]   = useState(true)

  // Live search
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [searching, setSearching] = useState(false)
  const [showDrop, setShowDrop]   = useState(false)
  const [granting, setGranting]   = useState(null)
  const debounceRef               = useRef(null)
  const wrapperRef                = useRef(null)

  useEffect(() => {
    blogsAPI
      .blogManagers()
      .then(({ data }) => setManagers(data.data || data.results || data || []))
      .catch(() => toast.error('Failed to load blog managers.'))
      .finally(() => setLoading(false))
  }, [])

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setShowDrop(false); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await blogsAPI.searchUsers(query.trim())
        const list = data.data || data.results || data || []
        setResults(list)
        setShowDrop(true)
      } catch {
        // silently ignore
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const grant = async (user) => {
    setGranting(user.id)
    try {
      await blogsAPI.assignRole({ user_id: user.id, can_manage: true })
      setManagers((prev) => {
        if (prev.find((m) => m.id === user.id)) return prev
        return [...prev, { ...user, can_manage_blogs: true }]
      })
      setResults((prev) => prev.filter((u) => u.id !== user.id))
      if (results.filter((u) => u.id !== user.id).length === 0) setShowDrop(false)
      toast.success(`Blog access granted to ${user.full_name}.`)
      // refresh session if the granted user is the currently logged-in user
      if (currentUser?.id === user.id) fetchProfile()
    } catch {
      toast.error('Failed to grant access.')
    } finally {
      setGranting(null)
    }
  }

  const revoke = (userId) => setManagers((prev) => prev.filter((m) => m.id !== userId))

  if (loading) return <SuperAdminLayout><LoadingScreen /></SuperAdminLayout>

  return (
    <SuperAdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Blog Permissions</h1>
          <p className="text-white/30 text-sm mt-1">Grant or revoke blog writing access for users.</p>
        </div>

        {/* Grant Access Panel */}
        <div className="glass border border-white/5 rounded-2xl p-5 mb-6 overflow-visible relative z-10">
          <h2 className="text-white/80 font-semibold text-sm mb-4 flex items-center gap-2">
            <FiSearch size={14} /> Search & Grant Access
          </h2>

          {/* Live search input */}
          <div ref={wrapperRef} className="relative">
            <div className="relative flex items-center">
              <FiSearch size={13} className="absolute left-3 text-white/25 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowDrop(true) }}
                onFocus={() => results.length > 0 && setShowDrop(true)}
                placeholder="Type a name or email…"
                className="w-full pl-9 pr-9 py-2.5 text-sm bg-white/5 border border-white/8 focus:border-white/25 rounded-xl text-white placeholder:text-white/25 outline-none transition-colors"
                autoComplete="off"
              />
              {searching && (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="absolute right-3 w-4 h-4 border-2 border-white/10 border-t-white/50 rounded-full"
                />
              )}
              {!searching && query && (
                <button onClick={() => { setQuery(''); setResults([]); setShowDrop(false) }}
                  className="absolute right-3 text-white/30 hover:text-white/60 transition-colors">
                  <FiX size={13} />
                </button>
              )}
            </div>

            {/* Dropdown suggestions */}
            {showDrop && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute z-50 mt-1 w-full bg-[#1a1a1a] border border-white/8 rounded-xl shadow-2xl shadow-black/60 overflow-hidden max-h-72 overflow-y-auto"
              >
                {results.length === 0 && !searching && (
                  <p className="text-white/25 text-sm text-center py-4">No users found.</p>
                )}
                {results.map((user) => {
                  const alreadyManager = managers.some((m) => m.id === user.id)
                  return (
                    <div key={user.id}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/4 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/50 text-sm font-semibold flex-shrink-0">
                          {user.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{user.full_name}</p>
                          <p className="text-white/35 text-xs truncate">{user.email}</p>
                        </div>
                      </div>
                      {alreadyManager ? (
                        <span className="text-green-400 text-xs px-2.5 py-1 bg-green-900/20 rounded-lg flex-shrink-0">
                          Already a manager
                        </span>
                      ) : (
                        <button
                          onClick={() => grant(user)} disabled={granting === user.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/14 text-white text-xs font-medium transition-all disabled:opacity-40 flex-shrink-0"
                        >
                          <FiShield size={12} />
                          {granting === user.id ? 'Granting…' : 'Grant Access'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </motion.div>
            )}
          </div>
        </div>

        {/* Current Managers */}
        <div className="glass border border-white/5 rounded-2xl p-5">
          <h2 className="text-white/80 font-semibold text-sm mb-4 flex items-center gap-2">
            <FiUsers size={14} /> Current Blog Managers
            <span className="ml-1 text-white/30 text-xs font-normal">({managers.length})</span>
          </h2>
          {managers.length === 0 ? (
            <p className="text-white/20 text-sm text-center py-6">No blog managers yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {managers.map((user) => (
                <ManagerCard key={user.id} user={user} onRevoke={revoke} fetchProfile={fetchProfile} currentUser={currentUser} />
              ))}
            </div>
          )}
        </div>

      </motion.div>
    </SuperAdminLayout>
  )
}

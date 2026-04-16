import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMessageSquare, FiSearch, FiFolder, FiChevronRight } from 'react-icons/fi'
import { chatAPI } from '../../../api'
import DashboardLayout from '../DashboardLayout'
import toast from 'react-hot-toast'

function timeAgo(d) {
  if (!d) return ''
  const diff = Math.floor((Date.now() - new Date(d)) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const CASE_STATUS_COLORS = {
  received:  'bg-yellow-900/30 text-yellow-400',
  working:   'bg-blue-900/30 text-blue-400',
  completed: 'bg-green-900/30 text-green-400',
  cancelled: 'bg-red-900/30 text-red-400',
}

const BOOKING_STATUS_COLORS = {
  pending:         'bg-yellow-900/30 text-yellow-400',
  payment_pending: 'bg-orange-900/30 text-orange-400',
  completed:       'bg-green-900/30 text-green-400',
  cancelled:       'bg-red-900/30 text-red-400',
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, count }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
      <Icon size={13} className="text-white/30" />
      <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">{label}</span>
      {count != null && (
        <span className="ml-auto text-white/20 text-xs">{count}</span>
      )}
    </div>
  )
}

// ── Chat row item ──────────────────────────────────────────────────────────
function ChatRow({ badge, badgeColor, title, subtitle, meta, lastMsg, timestamp, unread, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.035] transition-colors text-left"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-700 to-red-950 flex items-center justify-center">
          <span className="text-white font-black text-[10px] tracking-tight font-display">AOQ</span>
        </div>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${badgeColor}`}>
            {badge}
          </span>
          <span className="text-white text-sm font-medium truncate flex-1">{title}</span>
          <span className="text-white/25 text-[11px] flex-shrink-0">{timestamp}</span>
        </div>
        <p className="text-white/40 text-xs truncate">{subtitle}{meta ? ` · ${meta}` : ''}</p>
        <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-white/60 font-medium' : 'text-white/25'}`}>
          {lastMsg || 'No messages yet'}
        </p>
      </div>

      <FiChevronRight size={14} className="text-white/15 flex-shrink-0" />
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ChatListPage() {
  const navigate = useNavigate()
  const [cases, setCases]       = useState([])
  const [loadingCases, setLoadingCases] = useState(true)
  const [search, setSearch]     = useState('')

  const fetchCases = useCallback(async () => {
    setLoadingCases(true)
    try {
      const { data } = await chatAPI.getClientConversations()
      setCases(data.data || [])
    } catch {
      toast.error('Failed to load case chats')
    } finally {
      setLoadingCases(false)
    }
  }, [])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  const q = search.toLowerCase()

  const filteredCases = cases.filter(c =>
    !q ||
    c.case_number?.toLowerCase().includes(q) ||
    c.service_name?.toLowerCase().includes(q)
  )

  const loading = loadingCases

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white">Messages</h1>
        <p className="text-white/35 text-sm mt-0.5">Chat with the Aoqolt team about your cases</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search cases…"
          className="w-full bg-white/5 border border-white/8 text-white text-sm pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-red-900/40 placeholder-white/20"
        />
      </div>

      {/* List */}
      <div className="rounded-2xl overflow-hidden border border-white/5 bg-[#0d0d0d]">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-white/10 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <FiMessageSquare size={40} className="mb-3 text-white/10" />
            <p className="text-sm">No conversations found</p>
            {search && <p className="text-xs mt-1 text-white/15">Try a different search term</p>}
          </div>
        ) : (
          <>
            {/* ── Cases section ── */}
            {!loadingCases && (
              <>
                <SectionHeader icon={FiFolder} label="Cases" count={filteredCases.length} />
                {filteredCases.length === 0 ? (
                  <div className="px-4 py-6 text-white/20 text-sm text-center">No active case chats</div>
                ) : (
                  filteredCases.map(c => (
                    <ChatRow
                      key={`case-${c.case_id}`}
                      badge="Case"
                      badgeColor="bg-blue-900/40 text-blue-400"
                      title={c.case_number}
                      subtitle={c.service_name}
                      meta={c.case_status}
                      lastMsg={c.last_message}
                      timestamp={timeAgo(c.last_message_at)}
                      unread={c.unread_count || 0}
                      onClick={() => navigate(`/dashboard/chat/case/${c.case_id}`)}
                    />
                  ))
                )}
              </>
            )}

          </>
        )}
      </div>
    </DashboardLayout>
  )
}

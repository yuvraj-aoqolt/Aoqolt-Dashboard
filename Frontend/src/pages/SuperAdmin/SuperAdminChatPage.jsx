import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import SuperAdminLayout from './SuperAdminLayout'
import {
  FiMessageSquare, FiSend, FiSearch, FiPaperclip, FiSmile, FiMic, FiSquare,
  FiMoreVertical, FiEdit2, FiTrash2, FiCheck, FiX, FiCheckCircle,
  FiUser, FiChevronRight, FiBriefcase, FiCalendar,
} from 'react-icons/fi'
import { chatAPI, casesAPI, bookingsAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { compressImage, validateVideo } from '../../utils/chatMediaUtils'

// ─ helpers ────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function fmtTime(d) {
  return d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : ''
}

// ─ status configs ─────────────────────────────────────────────────────────
const CASE_STATUS = {
  received:  { label: 'Pending',  dot: 'bg-yellow-400', badge: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/25' },
  assigned:  { label: 'Active',   dot: 'bg-green-400',  badge: 'bg-green-400/15  text-green-400  border-green-400/25'  },
  working:   { label: 'Working',  dot: 'bg-blue-400',   badge: 'bg-blue-400/15   text-blue-400   border-blue-400/25'   },
  urgent:    { label: 'Urgent',   dot: 'bg-red-400',    badge: 'bg-red-400/15    text-red-400    border-red-400/25'    },
  completed: { label: 'Done',     dot: 'bg-white/25',   badge: 'bg-white/8 text-white/40 border-white/10' },
  cancelled: { label: 'Cancelled',dot: 'bg-white/20',   badge: 'bg-white/5 text-white/30 border-white/8' },
}
const BOOKING_STATUS = {
  pending:         { label: 'Pending',  dot: 'bg-yellow-400', badge: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/25' },
  payment_pending: { label: 'Payment',  dot: 'bg-orange-400', badge: 'bg-orange-400/15 text-orange-400 border-orange-400/25' },
  completed:       { label: 'Done',     dot: 'bg-green-400',  badge: 'bg-green-400/15  text-green-400  border-green-400/25'  },
  cancelled:       { label: 'Cancelled',dot: 'bg-white/20',   badge: 'bg-white/5 text-white/30 border-white/8' },
}
const getCase   = (s) => CASE_STATUS[s]    || { label: s || '—', dot: 'bg-white/20', badge: 'bg-white/5 text-white/30 border-white/8' }
const getBook   = (s) => BOOKING_STATUS[s] || { label: s || '—', dot: 'bg-white/20', badge: 'bg-white/5 text-white/30 border-white/8' }

// ─ type filters ───────────────────────────────────────────────────────────
const TYPE_FILTERS  = ['ALL', 'CASE', 'BOOKING']
const TYPE_LABELS   = { ALL: 'All', CASE: 'Cases', BOOKING: 'Bookings' }

const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘',
  '😚','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤔','😐','😶','😑','😒','🙄','😬',
  '😓','😪','😴','😷','🤒','🤕','😵','🤯','🥳','😎','🧐','👍','👎','👌','✌️','🤞',
  '🤙','👋','👏','🙌','🤝','🙏','💪','❤️','🧡','💛','💚','💙','💜','🖤','💔','💕',
  '💖','💘','💝','🎉','🎊','🎈','🎁','🔥','⭐','✨','💫','🌟','💥','❄️','🌈','☀️',
  '🌙','⚡','🌊','🌺','🌸','🍕','🍔','☕','🎵','🎶','💻','📱','🏆','🎯','🚀','💎','👑',
]

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const getFileUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE}/${url.replace(/^\//, '')}`
}
const formatRecTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

// ─ StatusBadge ────────────────────────────────────────────────────────────
function StatusBadge({ meta, size = 'sm' }) {
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full font-medium ${
      size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
    } ${meta.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

// ─ TypeBadge ──────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  if (type === 'CASE')
    return <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/20">CASE</span>
  return <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/20">BOOK</span>
}

// ─ CaseAccordion ─────────────────────────────────────────────────────────
function CaseAccordion({ conv, selectedCaseId, onSelectCase }) {
  const { case_id, case_number, case_status, service_name, client_name, admin_name,
          client_thread = {}, admin_thread = {}, last_activity } = conv
  const isSel       = selectedCaseId === case_id
  const totalUnread = (client_thread.unread_count || 0) + (admin_thread.unread_count || 0)
  const meta        = getCase(case_status)

  return (
    <div className={`border-b border-white/[0.04] ${isSel ? 'bg-sky-950/15' : ''}`}>
      <button
        onClick={() => onSelectCase(conv)}
        className={`w-full text-left px-3 pt-2.5 pb-2.5 flex items-start gap-2 transition-colors hover:bg-white/[0.04] ${
          isSel ? 'border-l-2 border-l-sky-500' : 'border-l-2 border-l-transparent'
        }`}
      >
        <div className="flex-1 min-w-0">
          {/* Row 1: badges + time */}
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <TypeBadge type="CASE" />
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                isSel ? 'bg-sky-600/30 text-sky-200' : 'bg-white/8 text-white/50'
              }`}>{case_number}</span>
              <StatusBadge meta={meta} size="xs" />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {totalUnread > 0 && (
                <span className="min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
              <span className="text-white/20 text-[10px]">{timeAgo(last_activity)}</span>
            </div>
          </div>
          {/* Row 2: service */}
          <p className={`text-xs font-medium truncate mb-0.5 ${isSel ? 'text-white/80' : 'text-white/55'}`}>
            {service_name || 'No service'}
          </p>
          {/* Row 3: client + admin names */}
          <div className="flex items-center gap-2">
            {client_name && (
              <span className="flex items-center gap-1 text-[11px] text-white/30 truncate">
                <FiUser size={10} /> {client_name}
              </span>
            )}
            {admin_name && (
              <span className="flex items-center gap-1 text-[11px] text-white/30 truncate">
                <FiBriefcase size={10} /> {admin_name}
              </span>
            )}
          </div>
          {/* Row 4: per-thread unread counts */}
          {totalUnread > 0 && (
            <div className="mt-1 flex items-center gap-3">
              {(client_thread.unread_count || 0) > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-sky-400/70">
                  <FiUser size={9} /> {client_thread.unread_count} unread
                </span>
              )}
              {(admin_thread.unread_count || 0) > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-violet-400/70">
                  <FiBriefcase size={9} /> {admin_thread.unread_count} unread
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  )
}

// ─ BookingAccordion ───────────────────────────────────────────────────────
function BookingAccordion({ conv, selected, onSelectThread }) {
  const { booking_id, booking_ref, booking_status, work_completed, service_name, client_name, admin_name, admin_thread = {}, last_activity } = conv
  const isSel  = selected?.key === `BOOK:${booking_id}`
  const unread = admin_thread.unread_count || 0
  const meta   = getBook(booking_status)

  return (
    <div className={`border-b border-white/[0.04] ${isSel ? 'bg-violet-950/15' : ''}`}>
      <button
        onClick={() => onSelectThread({ ...conv, key: `BOOK:${booking_id}`, source_type: 'BOOKING', conversation_type: 'ADMIN' })}
        className={`w-full text-left px-3 pt-2.5 pb-2 flex items-start gap-2 transition-colors hover:bg-white/[0.04] ${
          isSel ? 'border-l-2 border-l-violet-500' : 'border-l-2 border-l-transparent'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <TypeBadge type="BOOKING" />
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                isSel ? 'bg-violet-600/30 text-violet-200' : 'bg-white/8 text-white/50'
              }`}>{booking_ref}</span>
              {work_completed
                ? <span className="inline-flex items-center gap-1 border rounded-full text-[10px] px-1.5 py-0.5 font-medium bg-green-900/20 text-green-400 border-green-900/30"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Work Done</span>
                : <StatusBadge meta={meta} size="xs" />
              }
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {unread > 0 && (
                <span className="min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
              <span className="text-white/20 text-[10px]">{timeAgo(last_activity)}</span>
            </div>
          </div>
          <p className={`text-xs font-medium truncate mb-0.5 ${isSel ? 'text-white/80' : 'text-white/55'}`}>
            {service_name || 'No service'}
          </p>
          {admin_name ? (
            <span className="flex items-center gap-1 text-[11px] text-white/30">
              <FiBriefcase size={10} /> {admin_name}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-white/20 italic">
              <FiBriefcase size={10} /> Unassigned
            </span>
          )}
          {client_name && (
            <span className="flex items-center gap-1 text-[11px] text-white/30">
              <FiUser size={10} /> {client_name}
            </span>
          )}
          {admin_thread.last_message && (
            <p className="text-[11px] text-white/25 truncate mt-0.5">{admin_thread.last_message}</p>
          )}
        </div>
      </button>
    </div>
  )
}

// ─ CaseChatPanel ─────────────────────────────────────────────────────────
// Self-contained panel for a single case thread (CLIENT or ADMIN)
function CaseChatPanel({ caseId, conversationType, conv }) {
  const isClient    = conversationType === 'CLIENT'
  const label       = isClient ? 'Client' : 'Admin'
  const partnerName = isClient ? conv.client_name : conv.admin_name

  const [messages,   setMessages]   = useState([])
  const [text,       setText]       = useState('')
  const [loading,    setLoading]    = useState(true)
  const [sending,    setSending]    = useState(false)
  const [showEmoji,  setShowEmoji]  = useState(false)
  const [recording,  setRecording]  = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [activeMenu, setActiveMenu] = useState(null)
  const [editingId,  setEditingId]  = useState(null)
  const [editText,   setEditText]   = useState('')

  const bottomRef      = useRef(null)
  const inputRef       = useRef(null)
  const fileInputRef   = useRef(null)
  const mediaRecRef    = useRef(null)
  const audioChunksRef = useRef([])
  const recordTimerRef = useRef(null)
  const emojiRef       = useRef(null)
  const pollRef        = useRef(null)

  const fetchMsgs = useCallback(async () => {
    try {
      const { data } = await chatAPI.getMessages({ caseId, conversationType })
      setMessages(data.data || [])
    } catch {}
  }, [caseId, conversationType])

  useEffect(() => {
    setLoading(true)
    setMessages([])
    setText('')
    setEditingId(null)
    clearInterval(pollRef.current)
    fetchMsgs().finally(() => setLoading(false))
    chatAPI.markConversationRead({ caseId, conversationType }).catch(() => {})
    pollRef.current = setInterval(fetchMsgs, 3000)
    return () => clearInterval(pollRef.current)
  }, [caseId, conversationType, fetchMsgs])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    const body = text.trim(); setText(''); setSending(true)
    try {
      await chatAPI.sendMessage({ message_type: 'text', message: body, source_type: 'CASE', conversation_type: conversationType, case: caseId })
      await fetchMsgs()
    } catch { toast.error('Failed to send'); setText(body) }
    finally { setSending(false); inputRef.current?.focus() }
  }

  const handleKey    = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
  const insertEmoji  = (em) => { setText(t => t + em); setShowEmoji(false); inputRef.current?.focus() }

  const handleFileSelect = async (e) => {
    let file = e.target.files?.[0]; if (!file) return; e.target.value = ''
    const isImage = file.type.startsWith('image/'), isVideo = file.type.startsWith('video/')
    const type = isImage ? 'image' : 'video'
    if (isVideo) { const c = await validateVideo(file); if (!c.ok) { toast.error(c.reason); return } }
    if (isImage) { try { file = await compressImage(file) } catch {} }
    const fd = new FormData()
    fd.append('message_type', type); fd.append('file_url', file)
    fd.append('source_type', 'CASE'); fd.append('conversation_type', conversationType); fd.append('case', caseId)
    setSending(true)
    try { await chatAPI.sendFile(fd); await fetchMsgs() }
    catch { toast.error('Failed to send file') }
    finally { setSending(false) }
  }

  const startRecording = async () => {
    if (recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
        const fd = new FormData()
        fd.append('message_type', 'voice'); fd.append('file_url', file)
        fd.append('source_type', 'CASE'); fd.append('conversation_type', conversationType); fd.append('case', caseId)
        setSending(true)
        try { await chatAPI.sendFile(fd); await fetchMsgs() }
        catch { toast.error('Failed to send voice') }
        finally { setSending(false) }
      }
      mr.start(); mediaRecRef.current = mr; setRecording(true); setRecordTime(0)
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch { toast.error('Microphone access denied') }
  }

  const stopRecording = () => { clearInterval(recordTimerRef.current); setRecording(false); mediaRecRef.current?.stop() }
  const within12hrs   = (d) => Date.now() - new Date(d) < 12 * 3600 * 1000

  const handleEditSave = async (id) => {
    if (!editText.trim()) return
    try {
      const { data } = await chatAPI.editMessage(id, editText.trim())
      setMessages(prev => prev.map(m => m.id === id ? { ...m, ...data.data } : m))
      setEditingId(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const handleDelete = async (id) => {
    setActiveMenu(null)
    try { await chatAPI.deleteMessage(id); setMessages(prev => prev.filter(m => m.id !== id)) }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Thread header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-white/5 flex-shrink-0 ${isClient ? 'bg-sky-950/10' : 'bg-violet-950/10'}`}>
        {isClient
          ? <FiUser size={13} className="text-sky-400 flex-shrink-0" />
          : <FiBriefcase size={13} className="text-violet-400 flex-shrink-0" />
        }
        <span className={`text-xs font-semibold ${isClient ? 'text-sky-300' : 'text-violet-300'}`}>{label} Chat</span>
        {partnerName && <span className="text-white/40 text-xs">· {partnerName}</span>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ scrollbarWidth: 'thin' }}>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-white/20">
            {isClient ? <FiUser size={32} className="mb-3 text-white/10" /> : <FiBriefcase size={32} className="mb-3 text-white/10" />}
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine   = msg.sender_role === 'superadmin'
            const showDate = i === 0 || new Date(messages[i - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString()
            const canMod   = isMine && within12hrs(msg.created_at)
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-white/20 text-[11px]">{fmtDate(msg.created_at)}</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                )}
                <div className={`group flex items-end gap-1.5 mb-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {canMod && editingId !== msg.id && (
                    <div className="relative flex-shrink-0 order-first">
                      <button onClick={() => setActiveMenu(activeMenu === msg.id ? null : msg.id)}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/60 rounded-full hover:bg-white/10 transition-all">
                        <FiMoreVertical size={13} />
                      </button>
                      {activeMenu === msg.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                          <div className="absolute bottom-full right-0 mb-1 bg-[#1f1f1f] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[110px]">
                            {msg.message_type === 'text' && (
                              <button onClick={() => { setEditingId(msg.id); setEditText(msg.message); setActiveMenu(null) }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:bg-white/5 text-sm">
                                <FiEdit2 size={13} /> Edit
                              </button>
                            )}
                            <button onClick={() => handleDelete(msg.id)}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-400/70 hover:bg-red-900/10 text-sm">
                              <FiTrash2 size={13} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                    {!isMine && <span className="text-white/30 text-[11px] mb-1 ml-1">{msg.sender_name}</span>}
                    {editingId === msg.id ? (
                      <div className="bg-white/10 rounded-2xl rounded-br-sm px-3 py-2.5 min-w-[180px]">
                        <textarea value={editText} onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(msg.id) } if (e.key === 'Escape') setEditingId(null) }}
                          autoFocus rows={2}
                          className="w-full bg-transparent text-white text-sm resize-none focus:outline-none max-h-24"
                          style={{ scrollbarWidth: 'none' }} />
                        <div className="flex justify-end gap-1 mt-1.5">
                          <button onClick={() => setEditingId(null)} className="text-white/40 hover:text-white/70 p-1"><FiX size={14} /></button>
                          <button onClick={() => handleEditSave(msg.id)} disabled={!editText.trim()} className="text-green-400 hover:text-green-300 p-1 disabled:opacity-30"><FiCheck size={14} /></button>
                        </div>
                      </div>
                    ) : (
                      <div className={`rounded-2xl text-sm leading-relaxed overflow-hidden ${
                        isMine ? 'bg-white/[0.12] text-white rounded-br-sm' : 'bg-white/[0.05] text-white/80 rounded-bl-sm'
                      }`}>
                        {msg.message_type === 'image' && msg.file_url
                          ? <img src={getFileUrl(msg.file_url)} alt="img" className="max-w-[200px] max-h-[180px] object-cover block cursor-pointer" onClick={() => window.open(getFileUrl(msg.file_url), '_blank')} />
                          : msg.message_type === 'video' && msg.file_url
                          ? <video controls src={getFileUrl(msg.file_url)} className="max-w-[200px] max-h-[180px] block" />
                          : msg.message_type === 'voice' && msg.file_url
                          ? <div className="px-3 py-2.5"><audio controls src={getFileUrl(msg.file_url)} className="max-w-[190px] h-8" /></div>
                          : <div className="px-4 py-2.5 whitespace-pre-wrap break-words">{msg.message}</div>
                        }
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-1 mx-1">
                      <span className="text-white/20 text-[11px]">{fmtTime(msg.created_at)}</span>
                      {msg.is_edited && <span className="text-white/15 text-[10px]">edited</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-white/5 flex-shrink-0 relative bg-[#0d0d0d]">
        {showEmoji && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
            <div ref={emojiRef} className="absolute bottom-full left-3 mb-2 bg-[#1a1a1a] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 w-60">
              <div className="grid grid-cols-7 gap-0.5 max-h-40 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {EMOJIS.map(em => (
                  <button key={em} onClick={() => insertEmoji(em)} className="text-lg hover:bg-white/10 rounded-lg p-0.5 transition-colors leading-none">{em}</button>
                ))}
              </div>
            </div>
          </>
        )}
        {recording ? (
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-red-900/30">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
            <span className="text-red-400 text-xs flex-1">Recording… {formatRecTime(recordTime)}</span>
            <button onClick={stopRecording} className="flex items-center gap-1 bg-red-900/40 hover:bg-red-900/60 text-red-300 px-2 py-1 rounded-lg text-xs">
              <FiSquare size={9} /> Stop &amp; Send
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-1 bg-white/5 rounded-xl px-2 py-1.5 border border-white/5 focus-within:border-white/10 transition-colors">
            <div className="flex items-center flex-shrink-0">
              <button onClick={() => setShowEmoji(v => !v)} className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/60 rounded-lg transition-colors"><FiSmile size={14} /></button>
              <button onClick={() => fileInputRef.current?.click()} className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/60 rounded-lg transition-colors"><FiPaperclip size={13} /></button>
            </div>
            <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
              placeholder={`Message ${label}${partnerName ? ` (${partnerName})` : ''}…`}
              rows={1} className="flex-1 bg-transparent text-white text-xs placeholder-white/20 resize-none focus:outline-none py-1 max-h-20"
              style={{ scrollbarWidth: 'none' }} />
            <div className="flex items-center flex-shrink-0">
              <button onClick={startRecording} className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/60 rounded-lg transition-colors"><FiMic size={13} /></button>
              <button onClick={handleSend} disabled={!text.trim() || sending}
                className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors">
                {sending ? <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /> : <FiSend size={13} />}
              </button>
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
      </div>
    </div>
  )
}

// ─ DualCaseChatPanel ─────────────────────────────────────────────────────
// Shows Client Chat + Admin Chat side by side for a case
function DualCaseChatPanel({ conv, onMarkComplete }) {
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [completing,      setCompleting]      = useState(false)
  const meta = getCase(conv.case_status)

  const handleMarkComplete = async () => {
    if (!conv.case_id || completing) return
    setCompleting(true); setConfirmComplete(false)
    try {
      await casesAPI.updateStatus(conv.case_id, { status: 'completed', notes: 'Marked complete from chat' })
      onMarkComplete(conv.case_id)
      toast.success('Case marked as completed')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setCompleting(false) }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Case info header */}
      <div className="px-5 py-3 border-b border-white/5 flex-shrink-0 bg-[#0d0d0d] flex flex-col gap-2">
        {confirmComplete && (
          <div className="flex items-center gap-3 bg-green-900/15 border border-green-900/25 px-4 py-2 rounded-xl">
            <FiCheckCircle size={14} className="text-green-400 flex-shrink-0" />
            <p className="text-green-300 text-sm flex-1">Mark <strong>{conv.case_number}</strong> as Completed?</p>
            <button onClick={handleMarkComplete} disabled={completing}
              className="bg-green-700/50 hover:bg-green-700/70 text-green-200 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">
              {completing ? 'Saving…' : 'Confirm'}
            </button>
            <button onClick={() => setConfirmComplete(false)} className="text-white/30 hover:text-white/60 p-1 rounded-lg"><FiX size={14} /></button>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge type="CASE" />
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md text-sky-400 bg-sky-900/20 select-all">{conv.case_number}</span>
          <StatusBadge meta={meta} />
          {conv.service_name && (
            <><span className="text-white/20 text-xs">·</span>
            <span className="text-white/45 text-xs truncate">{conv.service_name}</span></>
          )}
          <div className="flex-1" />
          {conv.case_status !== 'completed' && conv.case_status !== 'cancelled' && (
            <button onClick={() => setConfirmComplete(true)}
              className="flex items-center gap-1.5 text-xs bg-green-900/20 hover:bg-green-900/35 text-green-400 border border-green-900/30 px-3 py-1.5 rounded-full transition-colors flex-shrink-0">
              <FiCheckCircle size={12} /> Complete
            </button>
          )}
        </div>
      </div>

      {/* Two chat panels side by side */}
      <div className="flex-1 flex divide-x divide-white/[0.06] min-w-0 overflow-hidden">
        <CaseChatPanel caseId={conv.case_id} conversationType="CLIENT" conv={conv} />
        {!conv.client_is_guest && (
          <CaseChatPanel caseId={conv.case_id} conversationType="ADMIN" conv={conv} />
        )}
      </div>
    </div>
  )
}

// ─ Main Component ─────────────────────────────────────────────────────────
export default function SuperAdminChatPage() {
  const { user } = useAuth()
  const location = useLocation()

  const [conversations, setConversations] = useState([])
  // selected: { ...conv, key, source_type, conversation_type }
  const [selected, setSelected]           = useState(null)
  const [messages, setMessages]           = useState([])
  const [text, setText]                   = useState('')
  const [loadingConvs, setLoadingConvs]   = useState(true)
  const [loadingMsgs, setLoadingMsgs]     = useState(false)
  const [sending, setSending]             = useState(false)
  const [search, setSearch]               = useState('')
  const [typeFilter, setTypeFilter]       = useState('ALL')
  const [convError, setConvError]         = useState(null)
  const [expandedSet, setExpandedSet]     = useState(new Set())
  const [selectedCase, setSelectedCase]   = useState(null)

  const bottomRef      = useRef(null)
  const pollRef        = useRef(null)
  const inputRef       = useRef(null)
  const fileInputRef   = useRef(null)
  const mediaRecRef    = useRef(null)
  const audioChunksRef = useRef([])
  const recordTimerRef = useRef(null)
  const emojiRef       = useRef(null)

  const [showEmoji, setShowEmoji]   = useState(false)
  const [recording, setRecording]   = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [activeMenu, setActiveMenu] = useState(null)
  const [editingId, setEditingId]   = useState(null)
  const [editText, setEditText]     = useState('')
  const [completing, setCompleting] = useState(false)
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [confirmCompleteBooking, setConfirmCompleteBooking] = useState(false)
  const [confirmDelThread, setConfirmDelThread] = useState(false)
  const [deletingThread, setDeletingThread]     = useState(false)

  // ── data fetching ────────────────────────────────────────────────────
  const fetchConvs = useCallback(async (silent = false) => {
    if (!silent) setLoadingConvs(true)
    try {
      const { data } = await chatAPI.getConversations()
      setConversations(data.data || [])
      setConvError(null)
    } catch (err) {
      if (!silent) setConvError(err.response?.data?.error || err.message || 'Failed to load')
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  const fetchMsgs = useCallback(async (sel) => {
    if (!sel) return
    try {
      const params = sel.source_type === 'BOOKING'
        ? { bookingId: sel.booking_id, sourceType: 'BOOKING' }
        : { caseId: sel.case_id, conversationType: sel.conversation_type }
      const { data } = await chatAPI.getMessages(params)
      setMessages(data.data || [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchConvs() }, [fetchConvs])

  // Auto-open from router state
  useEffect(() => {
    const openId = location.state?.openCaseId
    if (!openId || conversations.length === 0) return
    const conv = conversations.find(c => c.case_id === openId)
    if (conv) {
      setSelectedCase(conv)
      setSelected(null)
    }
  }, [location.state?.openCaseId, conversations])

  useEffect(() => {
    if (!selected) return
    clearInterval(pollRef.current)
    setLoadingMsgs(true)
    fetchMsgs(selected).finally(() => setLoadingMsgs(false))

    // Mark read
    if (selected.source_type === 'BOOKING') {
      chatAPI.markConversationRead({ bookingId: selected.booking_id, sourceType: 'BOOKING' }).catch(() => {})
      setConversations(prev =>
        prev.map(c => c.booking_id === selected.booking_id
          ? { ...c, admin_thread: { ...c.admin_thread, unread_count: 0 } }
          : c
        )
      )
    } else {
      chatAPI.markConversationRead({ caseId: selected.case_id, conversationType: selected.conversation_type }).catch(() => {})
      const threadKey = selected.conversation_type === 'CLIENT' ? 'client_thread' : 'admin_thread'
      setConversations(prev =>
        prev.map(c => c.case_id === selected.case_id
          ? { ...c, [threadKey]: { ...c[threadKey], unread_count: 0 } }
          : c
        )
      )
    }

    pollRef.current = setInterval(() => {
      fetchMsgs(selected)
      fetchConvs(true)
    }, 3000)
    return () => clearInterval(pollRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.key])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── sidebar helpers ──────────────────────────────────────────────────
  const toggleExpand = useCallback((id) => {
    setExpandedSet(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }, [])

  const handleSelectThread = useCallback((sel) => {
    setSelectedCase(null)
    setSelected(sel)
    setExpandedSet(prev => new Set([...prev, sel.booking_id]))
    setMessages([])
    setText('')
    setEditingId(null)
    setConfirmComplete(false)
    setConfirmCompleteBooking(false)
    setConfirmDelThread(false)
  }, [])

  const handleSelectCase = useCallback((conv) => {
    setSelectedCase(conv)
    setSelected(null)
    setMessages([])
  }, [])

  const handleCaseMarkComplete = useCallback((caseId) => {
    setSelectedCase(prev => prev ? { ...prev, case_status: 'completed' } : prev)
    setConversations(prev => prev.map(c => c.case_id === caseId ? { ...c, case_status: 'completed' } : c))
  }, [])

  // ── filter ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return conversations.filter(c => {
      if (typeFilter !== 'ALL' && c.item_type !== typeFilter) return false
      if (!q) return true
      return [c.case_number, c.booking_ref, c.client_name, c.admin_name, c.service_name]
        .filter(Boolean).some(v => v.toLowerCase().includes(q))
    })
  }, [conversations, search, typeFilter])

  const totalUnread = conversations.reduce((s, c) => {
    const ct = c.client_thread?.unread_count || 0
    const at = c.admin_thread?.unread_count  || 0
    return s + ct + at
  }, 0)

  const caseCount    = conversations.filter(c => c.item_type === 'CASE').length
  const bookingCount = conversations.filter(c => c.item_type === 'BOOKING').length

  // ── messaging ────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || !selected || sending) return
    const body = text.trim()
    setText('')
    setSending(true)
    try {
      const msgData = {
        message_type: 'text',
        message: body,
        source_type: selected.source_type,
        conversation_type: selected.conversation_type,
      }
      if (selected.source_type === 'BOOKING') msgData.booking = selected.booking_id
      else msgData.case = selected.case_id
      await chatAPI.sendMessage(msgData)
      await fetchMsgs(selected)
      // Update sidebar preview
      const previewKey = selected.source_type === 'BOOKING' ? 'admin_thread'
        : selected.conversation_type === 'CLIENT' ? 'client_thread' : 'admin_thread'
      const matchId = selected.source_type === 'BOOKING' ? 'booking_id' : 'case_id'
      setConversations(prev =>
        prev.map(c => c[matchId] === selected[matchId]
          ? { ...c, [previewKey]: { ...c[previewKey], last_message: body, last_message_at: new Date().toISOString() } }
          : c
        )
      )
    } catch {
      toast.error('Failed to send')
      setText(body)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
  const insertEmoji = (em) => { setText(t => t + em); setShowEmoji(false); inputRef.current?.focus() }

  const handleFileSelect = async (e) => {
    let file = e.target.files?.[0]
    if (!file || !selected) return
    e.target.value = ''
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const type = isImage ? 'image' : 'video'
    if (isVideo) { const c = await validateVideo(file); if (!c.ok) { toast.error(c.reason); return } }
    if (isImage) { try { file = await compressImage(file) } catch {} }
    const fd = new FormData()
    fd.append('message_type', type)
    fd.append('file_url', file)
    fd.append('source_type', selected.source_type)
    fd.append('conversation_type', selected.conversation_type)
    if (selected.source_type === 'BOOKING') fd.append('booking', selected.booking_id)
    else fd.append('case', selected.case_id)
    setSending(true)
    try {
      await chatAPI.sendFile(fd)
      await fetchMsgs(selected)
    } catch { toast.error('Failed to send file') }
    finally { setSending(false) }
  }

  const startRecording = async () => {
    if (!selected || recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
        const fd = new FormData()
        fd.append('message_type', 'voice')
        fd.append('file_url', file)
        fd.append('source_type', selected.source_type)
        fd.append('conversation_type', selected.conversation_type)
        if (selected.source_type === 'BOOKING') fd.append('booking', selected.booking_id)
        else fd.append('case', selected.case_id)
        setSending(true)
        try { await chatAPI.sendFile(fd); await fetchMsgs(selected) }
        catch { toast.error('Failed to send voice') }
        finally { setSending(false) }
      }
      mr.start()
      mediaRecRef.current = mr
      setRecording(true); setRecordTime(0)
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch { toast.error('Microphone access denied') }
  }

  const stopRecording = () => { clearInterval(recordTimerRef.current); setRecording(false); mediaRecRef.current?.stop() }
  const within12hrs  = (d) => Date.now() - new Date(d) < 12 * 3600 * 1000

  const handleMarkComplete = async () => {
    if (!selected?.case_id || completing) return
    setCompleting(true); setConfirmComplete(false)
    try {
      await casesAPI.updateStatus(selected.case_id, { status: 'completed', notes: 'Marked complete from chat' })
      setSelected(s => ({ ...s, case_status: 'completed' }))
      setConversations(prev => prev.map(c => c.case_id === selected.case_id ? { ...c, case_status: 'completed' } : c))
      toast.success('Case marked as completed')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setCompleting(false) }
  }

  const handleMarkBookingComplete = async () => {
    if (!selected?.booking_id || completing) return
    setCompleting(true); setConfirmCompleteBooking(false)
    try {
      await bookingsAPI.completeWork(selected.booking_id)
      setSelected(s => ({ ...s, work_completed: true }))
      setConversations(prev => prev.map(c =>
        c.booking_id === selected.booking_id ? { ...c, work_completed: true } : c
      ))
      toast.success('Booking marked as completed')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setCompleting(false) }
  }

  const handleEditSave = async (id) => {
    if (!editText.trim()) return
    try {
      const { data } = await chatAPI.editMessage(id, editText.trim())
      setMessages(prev => prev.map(m => m.id === id ? { ...m, ...data.data } : m))
      setEditingId(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const handleDelete = async (id) => {
    setActiveMenu(null)
    try {
      await chatAPI.deleteMessage(id)
      setMessages(prev => prev.filter(m => m.id !== id))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  // ── header labels ────────────────────────────────────────────────────
  const isBookingThread = selected?.source_type === 'BOOKING'
  const isClientThread  = selected?.conversation_type === 'CLIENT'
  const headerRef = selected
    ? (isBookingThread ? selected.booking_ref : selected.case_number) || '—'
    : '—'
  const headerPrefix = isBookingThread ? 'Booking' : 'Case'
  const partnerLabel = isBookingThread ? 'Admin' : (isClientThread ? 'Client' : 'Admin')
  const partnerName  = isBookingThread ? selected?.admin_name
    : (isClientThread ? selected?.client_name : selected?.admin_name)
  const accentBlue   = isClientThread && !isBookingThread
  // color: client=sky, admin=violet, booking=violet
  const threadColor  = accentBlue ? 'sky' : 'violet'

  return (
    <SuperAdminLayout>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Chat</h1>
          <p className="text-white/35 text-sm mt-0.5">
            {conversations.length} thread{conversations.length !== 1 ? 's' : ''}
            {totalUnread > 0 && <span className="ml-2 text-red-400 font-medium">{totalUnread} unread</span>}
          </p>
        </div>
      </div>

      <div className="flex rounded-2xl overflow-hidden border border-white/5 bg-[#0a0a0a]"
           style={{ height: 'calc(100vh - 178px)', minHeight: 540 }}>

        {/* ═════════════════════ LEFT SIDEBAR ═══════════════════════════ */}
        <div className="w-[320px] flex-shrink-0 border-r border-white/5 flex flex-col bg-[#0d0d0d]">

          {/* Search */}
          <div className="p-3 border-b border-white/5 flex-shrink-0">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={13} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search case, booking, name…"
                className="w-full bg-white/5 text-white text-sm pl-8 pr-3 py-2 rounded-xl border border-white/5 focus:outline-none focus:border-white/15 placeholder-white/20"
              />
            </div>
          </div>

          {/* Type filter tabs */}
          <div className="flex gap-1 px-3 py-2 border-b border-white/5 flex-shrink-0">
            {TYPE_FILTERS.map(f => {
              const cnt = f === 'ALL' ? conversations.length : f === 'CASE' ? caseCount : bookingCount
              return (
                <button key={f} onClick={() => setTypeFilter(f)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    typeFilter === f
                      ? f === 'CASE' ? 'bg-sky-900/40 text-sky-300 border border-sky-900/40'
                        : f === 'BOOKING' ? 'bg-violet-900/40 text-violet-300 border border-violet-900/40'
                        : 'bg-white/10 text-white/80 border border-white/10'
                      : 'text-white/35 hover:text-white/60 hover:bg-white/5'
                  }`}
                >
                  {TYPE_LABELS[f]}
                  {cnt > 0 && <span className="text-[10px] opacity-60">({cnt})</span>}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="px-3 py-1.5 border-b border-white/[0.03] flex items-center gap-4 flex-shrink-0">
            <span className="flex items-center gap-1 text-[10px] text-white/25"><FiUser size={10} className="text-sky-400/60" /> Client chat</span>
            <span className="flex items-center gap-1 text-[10px] text-white/25"><FiBriefcase size={10} className="text-violet-400/60" /> Admin chat</span>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {loadingConvs ? (
              <div className="flex justify-center py-12">
                <div className="w-5 h-5 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
              </div>
            ) : convError ? (
              <div className="flex flex-col items-center py-12 px-4 text-center">
                <p className="text-red-400 text-xs mb-3">{convError}</p>
                <button onClick={fetchConvs} className="text-xs text-white/40 hover:text-white/70 border border-white/10 px-3 py-1.5 rounded-lg">Retry</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-16 px-4 text-center text-white/20">
                <FiMessageSquare size={32} className="mb-3 text-white/10" />
                <p className="text-xs">No items found</p>
                {(search || typeFilter !== 'ALL') && (
                  <button onClick={() => { setSearch(''); setTypeFilter('ALL') }}
                    className="mt-2 text-xs text-white/30 hover:text-white/60">Clear filters</button>
                )}
              </div>
            ) : (
              filtered.map(conv =>
                conv.item_type === 'CASE' ? (
                  <CaseAccordion key={conv.case_id} conv={conv}
                    selectedCaseId={selectedCase?.case_id} onSelectCase={handleSelectCase} />
                ) : (
                  <BookingAccordion key={conv.booking_id} conv={conv} selected={selected}
                    onSelectThread={handleSelectThread} />
                )
              )
            )}
          </div>
        </div>

        {/* ═════════════════════ RIGHT PANEL ════════════════════════════ */}
        {selectedCase ? (
          <DualCaseChatPanel conv={selectedCase} onMarkComplete={handleCaseMarkComplete} />
        ) : selected ? (
          <div className="flex-1 flex flex-col min-w-0">

            {/* Header */}
            <div className="border-b border-white/5 flex-shrink-0 bg-[#0d0d0d]">
              {confirmComplete && selected.case_id && (
                <div className="flex items-center gap-3 bg-green-900/15 border-b border-green-900/25 px-5 py-2.5">
                  <FiCheckCircle size={14} className="text-green-400 flex-shrink-0" />
                  <p className="text-green-300 text-sm flex-1">Mark <strong>{headerRef}</strong> as Completed?</p>
                  <button onClick={handleMarkComplete} disabled={completing}
                    className="bg-green-700/50 hover:bg-green-700/70 text-green-200 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">
                    {completing ? 'Saving…' : 'Confirm'}
                  </button>
                  <button onClick={() => setConfirmComplete(false)} className="text-white/30 hover:text-white/60 p-1 rounded-lg"><FiX size={14} /></button>
                </div>
              )}
              {confirmCompleteBooking && selected.booking_id && (
                <div className="flex items-center gap-3 bg-green-900/15 border-b border-green-900/25 px-5 py-2.5">
                  <FiCheckCircle size={14} className="text-green-400 flex-shrink-0" />
                  <p className="text-green-300 text-sm flex-1">Mark <strong>{headerRef}</strong> as Completed?</p>
                  <button onClick={handleMarkBookingComplete} disabled={completing}
                    className="bg-green-700/50 hover:bg-green-700/70 text-green-200 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">
                    {completing ? 'Saving…' : 'Confirm'}
                  </button>
                  <button onClick={() => setConfirmCompleteBooking(false)} className="text-white/30 hover:text-white/60 p-1 rounded-lg"><FiX size={14} /></button>
                </div>
              )}
              <div className="px-5 py-3.5 flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Line 1: ref + type badge + status */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <TypeBadge type={selected.source_type} />
                    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md select-all ${
                      isBookingThread ? 'text-violet-400 bg-violet-900/20' : 'text-sky-400 bg-sky-900/20'
                    }`}>{headerRef}</span>
                    {selected.case_status && <StatusBadge meta={getCase(selected.case_status)} />}
                    {selected.booking_status && <StatusBadge meta={getBook(selected.booking_status)} />}
                    {isBookingThread && selected.work_completed && (
                      <span className="inline-flex items-center gap-1 border rounded-full font-medium text-xs px-2 py-0.5 bg-green-900/20 text-green-400 border-green-900/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Work Done
                      </span>
                    )}
                    {selected.service_name && (
                      <><span className="text-white/20 text-xs">·</span>
                      <span className="text-white/45 text-xs truncate">{selected.service_name}</span></>
                    )}
                  </div>
                  {/* Line 2: Chat with */}
                  <div className="flex items-center gap-2">
                    {isClientThread && !isBookingThread
                      ? <FiUser size={12} className="text-sky-400 flex-shrink-0" />
                      : <FiBriefcase size={12} className="text-violet-400 flex-shrink-0" />
                    }
                    <span className="text-white/40 text-xs">{headerPrefix} #{headerRef} — Chat with:</span>
                    <span className={`text-sm font-semibold ${accentBlue ? 'text-sky-300' : 'text-violet-300'}`}>{partnerLabel}</span>
                    {partnerName && <span className="text-white/60 text-sm font-medium">{partnerName}</span>}
                  </div>
                </div>
                {selected.case_id && selected.case_status !== 'completed' && selected.case_status !== 'cancelled' && (
                  <button onClick={() => setConfirmComplete(true)}
                    className="flex items-center gap-1.5 text-xs bg-green-900/20 hover:bg-green-900/35 text-green-400 border border-green-900/30 px-3 py-1.5 rounded-full transition-colors flex-shrink-0">
                    <FiCheckCircle size={12} /> Complete
                  </button>
                )}
                {isBookingThread && !selected.work_completed && (
                  <button onClick={() => setConfirmCompleteBooking(true)}
                    className="flex items-center gap-1.5 text-xs bg-green-900/20 hover:bg-green-900/35 text-green-400 border border-green-900/30 px-3 py-1.5 rounded-full transition-colors flex-shrink-0">
                    <FiCheckCircle size={12} /> Complete
                  </button>
                )}
                {/* Delete thread */}
                {confirmDelThread ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-red-400 text-xs">Delete all messages?</span>
                    <button
                      onClick={async () => {
                        setConfirmDelThread(false)
                        setDeletingThread(true)
                        try {
                          const params = selected.source_type === 'BOOKING'
                            ? { source_type: 'BOOKING', booking_id: selected.booking_id }
                            : { source_type: 'CASE', case_id: selected.case_id, conversation_type: selected.conversation_type }
                          await chatAPI.deleteThread(params)
                          setMessages([])
                          await fetchConvs(true)
                          toast.success('Thread deleted')
                        } catch { toast.error('Failed to delete thread') }
                        finally { setDeletingThread(false) }
                      }}
                      className="px-2.5 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >Yes</button>
                    <button onClick={() => setConfirmDelThread(false)} className="px-2.5 py-1 text-xs bg-white/5 text-white/50 rounded-lg transition-colors">No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelThread(true)}
                    disabled={deletingThread}
                    className="flex items-center gap-1 text-xs text-white/20 hover:text-red-400 hover:bg-red-900/20 border border-transparent hover:border-red-900/30 px-2.5 py-1.5 rounded-full transition-all flex-shrink-0 disabled:opacity-40"
                  >
                    <FiTrash2 size={11} /> Clear chat
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1" style={{ scrollbarWidth: 'thin' }}>
              {loadingMsgs ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* System banner */}
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className={`text-[11px] flex-shrink-0 px-3 py-1 rounded-full border ${
                      isClientThread && !isBookingThread
                        ? 'text-sky-400/60 bg-sky-900/10 border-sky-900/20'
                        : 'text-violet-400/60 bg-violet-900/10 border-violet-900/20'
                    }`}>
                      {partnerLabel} conversation · {headerPrefix} #{headerRef}
                    </span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>

                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center py-20 text-white/20">
                      {isClientThread && !isBookingThread
                        ? <FiUser size={36} className="mb-3 text-white/10" />
                        : <FiBriefcase size={36} className="mb-3 text-white/10" />
                      }
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1 text-white/15">{partnerLabel} ({partnerName || '—'}) · {headerPrefix} {headerRef}</p>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isMine  = msg.sender_role === 'superadmin'
                      const showDate = i === 0 || new Date(messages[i - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString()
                      const canMod  = isMine && within12hrs(msg.created_at)
                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex items-center gap-3 my-4">
                              <div className="flex-1 h-px bg-white/5" />
                              <span className="text-white/20 text-[11px]">{fmtDate(msg.created_at)}</span>
                              <div className="flex-1 h-px bg-white/5" />
                            </div>
                          )}
                          <div className={`group flex items-end gap-1.5 mb-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {canMod && editingId !== msg.id && (
                              <div className="relative flex-shrink-0 order-first">
                                <button onClick={() => setActiveMenu(activeMenu === msg.id ? null : msg.id)}
                                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/60 rounded-full hover:bg-white/10 transition-all">
                                  <FiMoreVertical size={13} />
                                </button>
                                {activeMenu === msg.id && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                                    <div className="absolute bottom-full right-0 mb-1 bg-[#1f1f1f] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[110px]">
                                      {msg.message_type === 'text' && (
                                        <button onClick={() => { setEditingId(msg.id); setEditText(msg.message); setActiveMenu(null) }}
                                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:bg-white/5 text-sm">
                                          <FiEdit2 size={13} /> Edit
                                        </button>
                                      )}
                                      <button onClick={() => handleDelete(msg.id)}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-400/70 hover:bg-red-900/10 text-sm">
                                        <FiTrash2 size={13} /> Delete
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            <div className={`flex flex-col max-w-[68%] ${isMine ? 'items-end' : 'items-start'}`}>
                              {!isMine && <span className="text-white/30 text-[11px] mb-1 ml-1">{msg.sender_name}</span>}
                              {editingId === msg.id ? (
                                <div className="bg-white/10 rounded-2xl rounded-br-sm px-3 py-2.5 min-w-[200px]">
                                  <textarea value={editText} onChange={e => setEditText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(msg.id) } if (e.key === 'Escape') setEditingId(null) }}
                                    autoFocus rows={2}
                                    className="w-full bg-transparent text-white text-sm resize-none focus:outline-none max-h-24"
                                    style={{ scrollbarWidth: 'none' }} />
                                  <div className="flex justify-end gap-1 mt-1.5">
                                    <button onClick={() => setEditingId(null)} className="text-white/40 hover:text-white/70 p-1"><FiX size={14} /></button>
                                    <button onClick={() => handleEditSave(msg.id)} disabled={!editText.trim()} className="text-green-400 hover:text-green-300 p-1 disabled:opacity-30"><FiCheck size={14} /></button>
                                  </div>
                                </div>
                              ) : (
                                <div className={`rounded-2xl text-sm leading-relaxed overflow-hidden ${
                                  isMine ? 'bg-white/[0.12] text-white rounded-br-sm' : 'bg-white/[0.05] text-white/80 rounded-bl-sm'
                                }`}>
                                  {msg.message_type === 'image' && msg.file_url
                                    ? <img src={getFileUrl(msg.file_url)} alt="img" className="max-w-[240px] max-h-[200px] object-cover block cursor-pointer" onClick={() => window.open(getFileUrl(msg.file_url), '_blank')} />
                                    : msg.message_type === 'video' && msg.file_url
                                    ? <video controls src={getFileUrl(msg.file_url)} className="max-w-[240px] max-h-[200px] block" />
                                    : msg.message_type === 'voice' && msg.file_url
                                    ? <div className="px-3 py-2.5"><audio controls src={getFileUrl(msg.file_url)} className="max-w-[220px] h-8" /></div>
                                    : <div className="px-4 py-2.5 whitespace-pre-wrap break-words">{msg.message}</div>
                                  }
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 mt-1 mx-1">
                                <span className="text-white/20 text-[11px]">{fmtTime(msg.created_at)}</span>
                                {msg.is_edited && <span className="text-white/15 text-[10px]">edited</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/5 flex-shrink-0 relative bg-[#0d0d0d]">
              {showEmoji && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                  <div ref={emojiRef} className="absolute bottom-full left-4 mb-2 bg-[#1a1a1a] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 w-72">
                    <div className="grid grid-cols-8 gap-0.5 max-h-52 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {EMOJIS.map(em => (
                        <button key={em} onClick={() => insertEmoji(em)} className="text-xl hover:bg-white/10 rounded-lg p-1 transition-colors leading-none">{em}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {recording ? (
                <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 border border-red-900/30">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                  <span className="text-red-400 text-sm font-medium flex-1">Recording… {formatRecTime(recordTime)}</span>
                  <button onClick={stopRecording} className="flex items-center gap-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 px-3 py-1.5 rounded-xl text-sm">
                    <FiSquare size={11} /> Stop &amp; Send
                  </button>
                </div>
              ) : (
                <div className="flex items-end gap-1 bg-white/5 rounded-2xl px-3 py-2 border border-white/5 focus-within:border-white/10 transition-colors">
                  <div className="flex items-center flex-shrink-0 pb-0.5">
                    <button onClick={() => setShowEmoji(v => !v)} className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/60 rounded-lg hover:bg-white/5 transition-colors"><FiSmile size={17} /></button>
                    <button onClick={() => fileInputRef.current?.click()} className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/60 rounded-lg hover:bg-white/5 transition-colors"><FiPaperclip size={16} /></button>
                  </div>
                  <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
                    placeholder={`Message ${partnerLabel}${partnerName ? ` (${partnerName})` : ''}…`}
                    rows={1} className="flex-1 bg-transparent text-white text-sm placeholder-white/20 resize-none focus:outline-none py-1 max-h-28"
                    style={{ scrollbarWidth: 'none' }} />
                  <div className="flex items-center flex-shrink-0 pb-0.5">
                    <button onClick={startRecording} className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/60 rounded-lg hover:bg-white/5 transition-colors"><FiMic size={16} /></button>
                    <button onClick={handleSend} disabled={!text.trim() || sending}
                      className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors">
                      {sending ? <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /> : <FiSend size={16} />}
                    </button>
                  </div>
                </div>
              )}
              {!recording && <p className="text-white/15 text-[11px] mt-1.5 px-1">Enter to send · Shift+Enter for new line</p>}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/20">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-4">
              <FiMessageSquare size={28} className="text-white/15" />
            </div>
            <p className="text-sm font-medium">Select a case or booking to start chatting</p>
            <p className="text-xs mt-1.5 text-white/15 max-w-[230px] text-center">
              Click a case to view both threads, or expand a booking
            </p>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  )
}

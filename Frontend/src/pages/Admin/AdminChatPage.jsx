import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { FiMessageSquare, FiSend, FiSearch, FiPaperclip, FiSmile, FiMic, FiSquare, FiMoreVertical, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi'
import { chatAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { compressImage, validateVideo } from '../../utils/chatMediaUtils'
import { useChatWebSocket } from '../../hooks/useWebSocket'

// ── helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function fmtTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString([], {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  })
}

const STATUS_COLORS = {
  received: 'bg-yellow-900/30 text-yellow-400 border-yellow-900/30',
  working:  'bg-blue-900/30  text-blue-400  border-blue-900/30',
  completed:'bg-green-900/30 text-green-400 border-green-900/30',
  cancelled:'bg-red-900/30   text-red-400   border-red-900/30',
}

const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘',
  '😚','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤔','😐','😶','😏','😒','🙄','😬',
  '😔','😪','😴','😷','🤒','🤕','😵','🤯','🥳','😎','🧐','👍','👎','👌','✌️','🤞',
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

// ── component ─────────────────────────────────────────────────────────────────
export default function AdminChatPage() {
  const { user } = useAuth()
  const location = useLocation()
  const pendingCaseId    = location.state?.caseId    ?? null
  const pendingBookingId  = location.state?.bookingId ?? null
  const [conversations, setConversations] = useState([])
  const [selected, setSelected]           = useState(null)
  const [messages, setMessages]           = useState([])
  const [text, setText]                   = useState('')
  const [loadingConvs, setLoadingConvs]   = useState(true)
  const [loadingMsgs, setLoadingMsgs]     = useState(false)
  const [sending, setSending]             = useState(false)
  const [search, setSearch]               = useState('')
  const [convError, setConvError]         = useState(null)

  const bottomRef      = useRef(null)
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

  // ── WebSocket connection ──────────────────────────────────────────────────
  const roomType = selected?.item_type === 'BOOKING' ? 'booking' : 'case'
  const roomId = selected?.item_type === 'BOOKING' ? selected?.booking_id : selected?.case_id

  const handleWebSocketMessage = useCallback((data) => {
    console.log('📨 WebSocket message:', data)
    
    if (data.type === 'chat_message') {
      // Add new message to the list
      setMessages(prev => {
        // Prevent duplicates
        const exists = prev.some(m => m.id === data.message.id)
        if (exists) return prev
        return [...prev, data.message]
      })
      
      // Update conversation last message
      setConversations(prev =>
        prev.map(c => {
          const key = c.item_type === 'BOOKING' ? `B-${c.booking_id}` : `C-${c.case_id}`
          const currentKey = selected?.item_type === 'BOOKING' 
            ? `B-${selected.booking_id}` 
            : `C-${selected.case_id}`
          
          if (key === currentKey) {
            return {
              ...c,
              last_message: data.message.message,
              last_message_at: data.message.created_at,
            }
          }
          return c
        })
      )
    }
    
    if (data.type === 'message_updated') {
      // Update existing message
      setMessages(prev =>
        prev.map(m => (m.id === data.message.id ? data.message : m))
      )
    }
    
    if (data.type === 'message_deleted') {
      // Remove deleted message
      setMessages(prev => prev.filter(m => m.id !== data.message_id))
    }
    
    if (data.type === 'typing') {
      // Handle typing indicator (optional)
      console.log(`User ${data.user} is typing...`)
    }
  }, [selected])

  const { isConnected: wsConnected } = useChatWebSocket(
    selected ? roomType : null,
    selected ? roomId : null,
    handleWebSocketMessage
  )

  // ── data fetchers ─────────────────────────────────────────────────────────
  const fetchConvs = useCallback(async (silent = false) => {
    if (!silent) setLoadingConvs(true)
    try {
      const { data } = await chatAPI.getConversations()
      setConversations(data.data || [])
      setConvError(null)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load chats'
      if (!silent) setConvError(msg)
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  const fetchMsgs = useCallback(async (conv) => {
    if (!conv) return
    try {
      const isBooking = conv.item_type === 'BOOKING'
      const params = isBooking
        ? { bookingId: conv.booking_id, sourceType: 'BOOKING' }
        : { caseId: conv.case_id }
      const { data } = await chatAPI.getMessages(params)
      setMessages(data.data || [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchConvs() }, [fetchConvs])

  // Auto-select conversation when navigated from Start Work
  useEffect(() => {
    if (conversations.length === 0 || selected) return
    if (pendingBookingId) {
      const conv = conversations.find(c => c.item_type === 'BOOKING' && String(c.booking_id) === String(pendingBookingId))
      if (conv) setSelected(conv)
    } else if (pendingCaseId) {
      const conv = conversations.find(c => String(c.case_id) === String(pendingCaseId))
      if (conv) setSelected(conv)
    }
  }, [conversations, pendingCaseId, pendingBookingId, selected])

  // ── conversation selection (WebSocket handles real-time updates) ─────────
  const selectedKey = selected
    ? (selected.item_type === 'BOOKING' ? `B-${selected.booking_id}` : `C-${selected.case_id}`)
    : null

  useEffect(() => {
    if (!selected) return
    const isBooking = selected.item_type === 'BOOKING'
    
    // Load initial messages
    setLoadingMsgs(true)
    fetchMsgs(selected).finally(() => setLoadingMsgs(false))
    
    // Mark conversation as read
    if (isBooking) {
      chatAPI.markConversationRead({ bookingId: selected.booking_id, sourceType: 'BOOKING' }).catch(() => {})
    } else {
      chatAPI.markConversationRead({ caseId: selected.case_id }).catch(() => {})
    }
    
    // Reset unread count locally
    setConversations(prev =>
      prev.map(c => {
        const key = c.item_type === 'BOOKING' ? `B-${c.booking_id}` : `C-${c.case_id}`
        return key === selectedKey ? { ...c, unread_count: 0 } : c
      })
    )
    
    // WebSocket now handles real-time updates - no polling needed!
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || !selected || sending) return
    const isBooking = selected.item_type === 'BOOKING'
    const body = text.trim()
    setText('')
    setSending(true)
    try {
      const payload = isBooking
        ? { source_type: 'BOOKING', booking: selected.booking_id, message_type: 'text', message: body }
        : { case: selected.case_id, message_type: 'text', message: body }
      await chatAPI.sendMessage(payload)
      await fetchMsgs(selected)
      setConversations(prev =>
        prev.map(c => {
          const key = c.item_type === 'BOOKING' ? `B-${c.booking_id}` : `C-${c.case_id}`
          return key === selectedKey ? { ...c, last_message: body, last_message_at: new Date().toISOString() } : c
        })
      )
    } catch {
      toast.error('Failed to send message')
      setText(body)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const insertEmoji = (emoji) => {
    setText(t => t + emoji)
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  const handleFileSelect = async (e) => {
    let file = e.target.files?.[0]
    if (!file || !selected) return
    e.target.value = ''
    const isBooking = selected.item_type === 'BOOKING'

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const type    = isImage ? 'image' : 'video'

    if (isVideo) {
      const check = await validateVideo(file)
      if (!check.ok) { toast.error(check.reason); return }
    }

    if (isImage) {
      try { file = await compressImage(file) } catch { /* use original on error */ }
    }

    const fd = new FormData()
    if (isBooking) {
      fd.append('source_type', 'BOOKING')
      fd.append('booking', selected.booking_id)
    } else {
      fd.append('case', selected.case_id)
    }
    fd.append('message_type', type)
    fd.append('file_url', file)
    setSending(true)
    try {
      await chatAPI.sendFile(fd)
      await fetchMsgs(selected)
      setConversations(prev =>
        prev.map(c => {
          const key = c.item_type === 'BOOKING' ? `B-${c.booking_id}` : `C-${c.case_id}`
          return key === selectedKey ? { ...c, last_message: `[${type}]`, last_message_at: new Date().toISOString() } : c
        })
      )
    } catch {
      toast.error('Failed to send file')
    } finally {
      setSending(false)
    }
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
        const isBooking = selected.item_type === 'BOOKING'
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
        const fd = new FormData()
        if (isBooking) {
          fd.append('source_type', 'BOOKING')
          fd.append('booking', selected.booking_id)
        } else {
          fd.append('case', selected.case_id)
        }
        fd.append('message_type', 'voice')
        fd.append('file_url', file)
        setSending(true)
        try {
          await chatAPI.sendFile(fd)
          await fetchMsgs(selected)
          setConversations(prev =>
            prev.map(c => {
              const key = c.item_type === 'BOOKING' ? `B-${c.booking_id}` : `C-${c.case_id}`
              return key === selectedKey ? { ...c, last_message: '[Voice note]', last_message_at: new Date().toISOString() } : c
            })
          )
        } catch {
          toast.error('Failed to send voice note')
        } finally {
          setSending(false)
        }
      }
      mr.start()
      mediaRecRef.current = mr
      setRecording(true)
      setRecordTime(0)
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch {
      toast.error('Microphone access denied')
    }
  }

  const stopRecording = () => {
    clearInterval(recordTimerRef.current)
    setRecording(false)
    mediaRecRef.current?.stop()
  }

  const within12hrs = (dateStr) => Date.now() - new Date(dateStr) < 12 * 3600 * 1000

  const handleEditSave = async (id) => {
    if (!editText.trim()) return
    try {
      const { data } = await chatAPI.editMessage(id, editText.trim())
      setMessages(prev => prev.map(m => m.id === id ? { ...m, ...data.data } : m))
      setEditingId(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to edit message')
    }
  }

  const handleDelete = async (id) => {
    setActiveMenu(null)
    try {
      await chatAPI.deleteMessage(id)
      setMessages(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete message')
    }
  }

  // Show booking threads + working/completed case threads
  const filtered = conversations.filter(c => {
    if (c.item_type === 'BOOKING') {
      const q = search.toLowerCase()
      if (!q) return true
      return (
        (c.booking_ref || '').toLowerCase().includes(q) ||
        (c.service_name || '').toLowerCase().includes(q) ||
        (c.client_name  || '').toLowerCase().includes(q)
      )
    }
    const status = c.case_status || ''
    if (!['working', 'completed'].includes(status)) return false
    const q = search.toLowerCase()
    if (!q) return true
    return (
      (c.case_number  || '').toLowerCase().includes(q) ||
      (c.service_name || '').toLowerCase().includes(q)
    )
  })

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      {/* Fixed-height wrapper that prevents page body from scrolling */}
      <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 112px)' }}>

      <div className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white">Chat</h1>
        <p className="text-white/35 text-sm mt-0.5">
          Message the Aoqolt team about your assigned cases
        </p>
      </div>

      <div
        className="flex-1 min-h-0 flex rounded-2xl overflow-hidden border border-white/5 bg-[#0d0d0d]"
      >
        {/* ── LEFT: case list ─────────────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 border-r border-white/5 flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-white/5 flex-shrink-0">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={13} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search cases"
                className="w-full bg-white/5 text-white text-sm pl-8 pr-3 py-2 rounded-xl border border-white/5 focus:outline-none focus:border-red-900/40 placeholder-white/20"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex justify-center py-12">
                <div className="w-5 h-5 border-2 border-white/10 border-t-red-500 rounded-full animate-spin" />
              </div>
            ) : convError ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <p className="text-red-400 text-xs mb-3">{convError}</p>
                <button
                  onClick={() => fetchConvs()}
                  className="text-xs text-white/40 hover:text-white/70 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-white/20">
                <FiMessageSquare size={36} className="mb-3 text-white/10" />
                <p className="text-xs">No active chats</p>
                <p className="text-xs mt-1 text-white/15">Chats appear here after you click "Start Work" on an assigned case</p>
              </div>
            ) : (
              filtered.map(conv => {
                const isBookingConv = conv.item_type === 'BOOKING'
                const convKey = isBookingConv ? `B-${conv.booking_id}` : `C-${conv.case_id}`
                const isActive = selectedKey === convKey
                const refLabel = isBookingConv
                  ? (conv.booking_ref || conv.booking_id)
                  : (conv.case_number || conv.case_id)
                return (
                  <button
                    key={convKey}
                    onClick={() => setSelected(conv)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-white/[0.04] hover:bg-white/5 transition-colors ${
                      isActive ? 'bg-white/[0.07]' : ''
                    }`}
                  >
                    {/* Aoqolt avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center select-none">
                        <span className="text-white font-black text-[10px] font-display tracking-tight">AOQ</span>
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isBookingConv && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                              BKG
                            </span>
                          )}
                          <p className="text-white text-sm font-medium truncate">Aoqolt</p>
                        </div>
                        <span className="text-white/25 text-[11px] flex-shrink-0">{timeAgo(conv.last_message_at)}</span>
                      </div>
                      <p className="text-white/30 text-xs truncate mt-0.5">
                        {refLabel}
                        {conv.service_name ? ` · ${conv.service_name}` : ''}
                      </p>
                      <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-white/60 font-medium' : 'text-white/25'}`}>
                        {conv.last_message || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: conversation view ─────────────────────────────────────── */}
        {selected ? (
          <div className="flex-1 flex flex-col min-w-0">

            {/* Header */}
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-[9px] font-display tracking-tight">AOQ</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-semibold text-sm leading-tight">Aoqolt Team</p>
                <p className="text-white/30 text-xs truncate">
                  {selected.item_type === 'BOOKING'
                    ? (selected.booking_ref || selected.booking_id)
                    : (selected.case_number || selected.case_id)}
                  {selected.service_name ? ` · ${selected.service_name}` : ''}
                </p>
              </div>
              {selected.item_type === 'BOOKING' ? (
                selected.work_completed
                  ? <span className="text-xs border px-2.5 py-1 rounded-full flex-shrink-0 bg-green-900/30 text-green-400 border-green-900/30">✓ Completed</span>
                  : selected.work_started
                  ? <span className="text-xs border px-2.5 py-1 rounded-full flex-shrink-0 bg-blue-900/30 text-blue-400 border-blue-900/30">● In Progress</span>
                  : <span className="text-xs border px-2.5 py-1 rounded-full flex-shrink-0 bg-yellow-900/30 text-yellow-400 border-yellow-900/30">Pending</span>
              ) : (
                <span className={`text-xs border px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${STATUS_COLORS[selected.case_status] || ''}`}>
                  {selected.case_status}
                </span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
              {loadingMsgs ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-white/10 border-t-red-500 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/20 py-16">
                  <FiMessageSquare size={40} className="mb-3" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1 text-white/15">Ask the Aoqolt team anything about this case</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  // From admin's POV: 'mine' = messages sent by this admin
                  const isMine = msg.sender_role === 'admin'
                  const showDate =
                    i === 0 ||
                    new Date(messages[i - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString()
                  const canModify = isMine && within12hrs(msg.created_at)
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-white/5" />
                          <span className="text-white/20 text-[11px] flex-shrink-0">{fmtDate(msg.created_at)}</span>
                          <div className="flex-1 h-px bg-white/5" />
                        </div>
                      )}
                      <div className={`group flex items-end gap-1.5 mb-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {canModify && editingId !== msg.id && (
                          <div className="relative flex-shrink-0 order-first">
                            <button
                              onClick={() => setActiveMenu(activeMenu === msg.id ? null : msg.id)}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/60 rounded-full hover:bg-white/10 transition-all"
                            >
                              <FiMoreVertical size={13} />
                            </button>
                            {activeMenu === msg.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                                <div className="absolute bottom-full right-0 mb-1 bg-[#1f1f1f] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[110px]">
                                  {msg.message_type === 'text' && (
                                    <button
                                      onClick={() => { setEditingId(msg.id); setEditText(msg.message); setActiveMenu(null) }}
                                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:bg-white/5 hover:text-white text-sm transition-colors"
                                    >
                                      <FiEdit2 size={13} /> Edit
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDelete(msg.id)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-400/70 hover:bg-red-900/10 hover:text-red-400 text-sm transition-colors"
                                  >
                                    <FiTrash2 size={13} /> Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        <div className={`flex flex-col max-w-[68%] ${isMine ? 'items-end' : 'items-start'}`}>
                          {!isMine && (
                            <span className="text-white/30 text-[11px] mb-1 ml-1">{msg.sender_name}</span>
                          )}
                          {editingId === msg.id ? (
                            <div className="bg-red-900/50 rounded-2xl rounded-br-sm px-3 py-2.5 min-w-[200px]">
                              <textarea
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(msg.id) }
                                  if (e.key === 'Escape') setEditingId(null)
                                }}
                                autoFocus
                                rows={2}
                                className="w-full bg-transparent text-white text-sm resize-none focus:outline-none max-h-24"
                                style={{ scrollbarWidth: 'none' }}
                              />
                              <div className="flex justify-end gap-1 mt-1.5">
                                <button onClick={() => setEditingId(null)} className="text-white/40 hover:text-white/70 p-1 rounded-lg transition-colors"><FiX size={14} /></button>
                                <button onClick={() => handleEditSave(msg.id)} disabled={!editText.trim()} className="text-green-400 hover:text-green-300 p-1 rounded-lg disabled:opacity-30 transition-colors"><FiCheck size={14} /></button>
                              </div>
                            </div>
                          ) : (
                            <div className={`rounded-2xl text-sm leading-relaxed overflow-hidden ${
                              isMine
                                ? 'bg-red-900/50 text-white rounded-br-sm'
                                : 'bg-white/[0.07] text-white/85 rounded-bl-sm'
                            }`}>
                              {msg.message_type === 'image' && msg.file_url
                                ? <img src={getFileUrl(msg.file_url)} alt="Image" className="max-w-[240px] max-h-[200px] object-cover block cursor-pointer" onClick={() => window.open(getFileUrl(msg.file_url), '_blank')} />
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
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/5 flex-shrink-0 relative">
              {/* Emoji picker */}
              {showEmoji && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                  <div ref={emojiRef} className="absolute bottom-full left-4 mb-2 bg-[#1a1a1a] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 w-72">
                    <div className="grid grid-cols-8 gap-0.5 max-h-52 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {EMOJIS.map(em => (
                        <button key={em} onClick={() => insertEmoji(em)}
                          className="text-xl hover:bg-white/10 rounded-lg p-1 transition-colors leading-none">
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {recording ? (
                <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 border border-red-900/30">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                  <span className="text-red-400 text-sm font-medium flex-1">Recording… {formatRecTime(recordTime)}</span>
                  <button onClick={stopRecording}
                    className="flex items-center gap-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 px-3 py-1.5 rounded-xl text-sm transition-colors">
                    <FiSquare size={11} /> Stop &amp; Send
                  </button>
                </div>
              ) : (
                <div className="flex items-end gap-1 bg-white/5 rounded-2xl px-3 py-2 border border-white/5 focus-within:border-red-900/30 transition-colors">
                  <div className="flex items-center flex-shrink-0 pb-0.5">
                    <button onClick={() => setShowEmoji(v => !v)} title="Emoji"
                      className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/60 rounded-lg hover:bg-white/5 transition-colors">
                      <FiSmile size={17} />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} title="Attach image/video"
                      className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/60 rounded-lg hover:bg-white/5 transition-colors">
                      <FiPaperclip size={16} />
                    </button>
                  </div>
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Enter your message"
                    rows={1}
                    className="flex-1 bg-transparent text-white text-sm placeholder-white/20 resize-none focus:outline-none py-1 max-h-28"
                    style={{ scrollbarWidth: 'none' }}
                  />
                  <div className="flex items-center flex-shrink-0 pb-0.5">
                    <button onClick={startRecording} title="Voice note"
                      className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/60 rounded-lg hover:bg-white/5 transition-colors">
                      <FiMic size={16} />
                    </button>
                    <button onClick={handleSend} disabled={!text.trim() || sending}
                      className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors">
                      {sending
                        ? <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                        : <FiSend size={16} />
                      }
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
            <FiMessageSquare size={48} className="mb-4 text-white/10" />
            <p className="text-sm">Select a case to view the chat</p>
          </div>
        )}
      </div>
      </div>
    </AdminLayout>
  )
}

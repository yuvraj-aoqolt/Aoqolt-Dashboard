import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { chatAPI, bookingsAPI } from '../../../api'
import { useAuth } from '../../../context/AuthContext'
import DashboardLayout from '../DashboardLayout'
import ChatThread from './ChatThread'
import toast from 'react-hot-toast'

const BOOKING_STATUS_COLORS = {
  pending:         'bg-yellow-900/30 text-yellow-400 border-yellow-900/30',
  payment_pending: 'bg-orange-900/30 text-orange-400 border-orange-900/30',
  completed:       'bg-green-900/30  text-green-400  border-green-900/30',
  cancelled:       'bg-red-900/30    text-red-400    border-red-900/30',
}

export default function BookingChatPage() {
  const { id: bookingId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [bookingInfo, setBookingInfo] = useState(null)
  const [messages, setMessages]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [sending, setSending]         = useState(false)

  const pollRef = useRef(null)

  // ── Fetch helpers ────────────────────────────────────────────────────────
  const fetchMsgs = useCallback(async () => {
    try {
      const { data } = await chatAPI.getMessages({ bookingId, sourceType: 'BOOKING' })
      setMessages(data.data || [])
    } catch { /* silent poll */ }
  }, [bookingId])

  // Initial load
  useEffect(() => {
    // Get booking info
    bookingsAPI.detail(bookingId)
      .then(({ data }) => setBookingInfo(data.data || data))
      .catch(() => {})

    chatAPI.getMessages({ bookingId, sourceType: 'BOOKING' })
      .then(({ data }) => setMessages(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))

    chatAPI.markConversationRead({ bookingId, sourceType: 'BOOKING' }).catch(() => {})

    pollRef.current = setInterval(fetchMsgs, 4000)
    return () => clearInterval(pollRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  // ── Send handlers ────────────────────────────────────────────────────────
  const handleSend = async (text) => {
    setSending(true)
    try {
      await chatAPI.sendMessage({ booking: bookingId, source_type: 'BOOKING', message_type: 'text', message: text })
      await fetchMsgs()
    } catch { toast.error('Failed to send') }
    finally { setSending(false) }
  }

  const handleSendFile = async (file) => {
    setSending(true)
    const fd = new FormData()
    fd.append('booking', bookingId)
    fd.append('source_type', 'BOOKING')
    fd.append('message_type', file.type.startsWith('video/') ? 'video' : 'image')
    fd.append('file_url', file)
    try {
      await chatAPI.sendFile(fd)
      await fetchMsgs()
    } catch { toast.error('Failed to send file') }
    finally { setSending(false) }
  }

  const handleSendVoice = async (blob) => {
    setSending(true)
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
    const fd = new FormData()
    fd.append('booking', bookingId)
    fd.append('source_type', 'BOOKING')
    fd.append('message_type', 'voice')
    fd.append('file_url', file)
    try {
      await chatAPI.sendFile(fd)
      await fetchMsgs()
    } catch { toast.error('Failed to send voice note') }
    finally { setSending(false) }
  }

  const handleEdit = async (id, newText) => {
    try {
      const { data } = await chatAPI.editMessage(id, newText)
      setMessages(prev => prev.map(m => m.id === id ? { ...m, ...data.data } : m))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to edit') }
  }

  const handleDelete = async (id) => {
    try {
      await chatAPI.deleteMessage(id)
      setMessages(prev => prev.filter(m => m.id !== id))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete') }
  }

  const svcName = bookingInfo?.service_name || bookingInfo?.service?.name || ''
  const bookingLabel = bookingInfo?.booking_id || `#${bookingId}`
  const status = bookingInfo?.status

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/dashboard/chat')}
          className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors"
        >
          <FiArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-purple-900/40 text-purple-400">
                Booking
              </span>
              <span className="text-white font-semibold text-sm">{bookingLabel}</span>
              {status && (
                <span className={`text-xs border px-2 py-0.5 rounded-full capitalize ${BOOKING_STATUS_COLORS[status] || ''}`}>
                  {status.replace('_', ' ')}
                </span>
              )}
            </div>
            {svcName && <p className="text-white/30 text-xs mt-0.5">{svcName}</p>}
          </div>
        </div>
      </div>

      {/* Single-panel admin chat */}
      <div
        className="rounded-2xl overflow-hidden border border-white/5 bg-[#0d0d0d] flex flex-col"
        style={{ height: 'calc(100vh - 210px)', minHeight: 500 }}
      >
        {/* Panel label */}
        <div className="px-4 py-2.5 flex-shrink-0 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Admin Chat</span>
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 min-h-0">
          <ChatThread
            messages={messages}
            loading={loading}
            sending={sending}
            onSend={handleSend}
            onSendFile={handleSendFile}
            onSendVoice={handleSendVoice}
            onEdit={handleEdit}
            onDelete={handleDelete}
            userId={user?.id}
            placeholder="Message the Aoqolt team about your booking…"
            emptyText="Ask about your booking"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

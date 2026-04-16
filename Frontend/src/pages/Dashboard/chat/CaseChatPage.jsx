import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { chatAPI } from '../../../api'
import { useAuth } from '../../../context/AuthContext'
import DashboardLayout from '../DashboardLayout'
import ChatThread from './ChatThread'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  received:  'bg-yellow-900/30 text-yellow-400 border-yellow-900/30',
  working:   'bg-blue-900/30  text-blue-400  border-blue-900/30',
  completed: 'bg-green-900/30 text-green-400 border-green-900/30',
  cancelled: 'bg-red-900/30   text-red-400   border-red-900/30',
}

// ── Thread panel ─────────────────────────────────────────────────────────
function ThreadPanel({
  title, avatarInitials, avatarGradient,
  messages, loading, sending,
  onSend, onSendFile, onSendVoice, onEdit, onDelete,
  userId, placeholder,
}) {
  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Panel header — avatar + name */}
      <div className="px-5 py-3.5 flex-shrink-0 flex items-center gap-3 border-b border-white/[0.06]"
        style={{ background: '#181818' }}>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
          style={{ background: avatarGradient }}
        >
          {avatarInitials}
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">{title}</p>
        </div>
      </div>

      {/* Messages + input */}
      <div className="flex-1 min-h-0" style={{ background: '#1a1a1a' }}>
        <ChatThread
          messages={messages}
          loading={loading}
          sending={sending}
          onSend={onSend}
          onSendFile={onSendFile}
          onSendVoice={onSendVoice}
          onEdit={onEdit}
          onDelete={onDelete}
          userId={userId}
          placeholder={placeholder}
          emptyText="Send a message to get started"
        />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function CaseChatPage() {
  const { id: caseId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [caseInfo, setCaseInfo]       = useState(null)
  const [clientMsgs, setClientMsgs]   = useState([])
  const [loadingClient, setLoadingClient] = useState(true)
  const [sendingClient, setSendingClient] = useState(false)

  const pollRef = useRef(null)

  // ── Fetch helpers ────────────────────────────────────────────────────────
  const fetchClientMsgs = useCallback(async () => {
    try {
      const { data } = await chatAPI.getMessages({ caseId, conversationType: 'CLIENT' })
      setClientMsgs(data.data || [])
    } catch { /* silent poll */ }
  }, [caseId])

  // Resolve case info from conversations list (lightweight)
  const fetchCaseInfo = useCallback(async () => {
    try {
      const { data } = await chatAPI.getClientConversations()
      const found = (data.data || []).find(c => String(c.case_id) === String(caseId))
      if (found) setCaseInfo(found)
    } catch { /* ignore */ }
  }, [caseId])

  // Initial load
  useEffect(() => {
    fetchCaseInfo()

    chatAPI.getMessages({ caseId, conversationType: 'CLIENT' })
      .then(res => setClientMsgs(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingClient(false))

    // Mark as read
    chatAPI.markConversationRead({ caseId, conversationType: 'CLIENT' }).catch(() => {})

    // Poll every 4s
    pollRef.current = setInterval(() => { fetchClientMsgs() }, 4000)

    return () => clearInterval(pollRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

  // ── Send handlers ────────────────────────────────────────────────────────
  const sendClientText = async (text) => {
    setSendingClient(true)
    try {
      await chatAPI.sendMessage({ case: caseId, conversation_type: 'CLIENT', message_type: 'text', message: text })
      await fetchClientMsgs()
    } catch { toast.error('Failed to send') }
    finally { setSendingClient(false) }
  }

  const sendClientFile = async (file) => {
    setSendingClient(true)
    const fd = new FormData()
    fd.append('case', caseId)
    fd.append('conversation_type', 'CLIENT')
    fd.append('message_type', file.type.startsWith('video/') ? 'video' : 'image')
    fd.append('file_url', file)
    try {
      await chatAPI.sendFile(fd)
      await fetchClientMsgs()
    } catch { toast.error('Failed to send file') }
    finally { setSendingClient(false) }
  }

  const sendClientVoice = async (blob) => {
    setSendingClient(true)
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
    const fd = new FormData()
    fd.append('case', caseId)
    fd.append('conversation_type', 'CLIENT')
    fd.append('message_type', 'voice')
    fd.append('file_url', file)
    try {
      await chatAPI.sendFile(fd)
      await fetchClientMsgs()
    } catch { toast.error('Failed to send voice note') }
    finally { setSendingClient(false) }
  }

  const sendAdminText = async (text) => {
    setSendingClient(true)
    try {
      await chatAPI.sendMessage({ case: caseId, conversation_type: 'CLIENT', message_type: 'text', message: text })
      await fetchClientMsgs()
    } catch { toast.error('Failed to send') }
    finally { setSendingClient(false) }
  }

  const sendAdminFile = async (file) => {
    setSendingClient(true)
    const fd = new FormData()
    fd.append('case', caseId)
    fd.append('conversation_type', 'admin')
    fd.append('message_type', file.type.startsWith('video/') ? 'video' : 'image')
    fd.append('file_url', file)
    try {
      await chatAPI.sendFile(fd)
      await fetchClientMsgs()
    } catch { toast.error('Failed to send file') }
    finally { setSendingClient(false) }
  }

  const sendAdminVoice = async (blob) => {
    setSendingClient(true)
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
    const fd = new FormData()
    fd.append('case', caseId)
    fd.append('conversation_type', 'admin')
    fd.append('message_type', 'voice')
    fd.append('file_url', file)
    try {
      await chatAPI.sendFile(fd)
      await fetchClientMsgs()
    } catch { toast.error('Failed to send voice note') }
    finally { setSendingClient(false) }
  }

  const handleEdit = async (id, newText) => {
    try {
      const { data } = await chatAPI.editMessage(id, newText)
      setClientMsgs(prev => prev.map(m => m.id === id ? { ...m, ...data.data } : m))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to edit') }
  }

  const handleDelete = async (id) => {
    try {
      await chatAPI.deleteMessage(id)
      setClientMsgs(prev => prev.filter(m => m.id !== id))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete') }
  }

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
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">
            {caseInfo?.case_number || `Case #${caseId}`}
          </span>
          {caseInfo?.case_status && (
            <span className={`text-xs border px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[caseInfo.case_status] || ''}`}>
              {caseInfo.case_status}
            </span>
          )}
          {caseInfo?.service_name && (
            <span className="text-white/30 text-xs">· {caseInfo.service_name}</span>
          )}
        </div>
      </div>

      {/* Single chat panel */}
      <div
        className="rounded-2xl overflow-hidden border border-white/[0.06]"
        style={{ height: 'calc(100vh - 210px)', minHeight: 500, background: '#161616' }}
      >
        <ThreadPanel
          title="Aoqolt Team"
          avatarInitials="AOQ"
          avatarGradient="linear-gradient(135deg,#991b1b,#7f1d1d)"
          messages={clientMsgs}
          loading={loadingClient}
          sending={sendingClient}
          onSend={sendClientText}
          onSendFile={sendClientFile}
          onSendVoice={sendClientVoice}
          onEdit={handleEdit}
          onDelete={handleDelete}
          userId={user?.id}
          placeholder="Enter your message"
        />
      </div>
    </DashboardLayout>
  )
}

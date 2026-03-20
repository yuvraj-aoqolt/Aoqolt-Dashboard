import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowLeft, FiSend, FiUpload, FiCheck } from 'react-icons/fi'
import { casesAPI, chatAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from './AdminLayout'
import LoadingScreen from '../../components/LoadingScreen'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function AdminCaseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [caseData, setCaseData] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [resultText, setResultText] = useState('')
  const [resultFile, setResultFile] = useState(null)
  const [uploadingResult, setUploadingResult] = useState(false)
  const [markingWorking, setMarkingWorking] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: c } = await casesAPI.detail(id)
        setCaseData(c)
        try {
          const { data: msgs } = await chatAPI.getMessages(id)
          setMessages(Array.isArray(msgs) ? msgs : msgs.results || [])
        } catch {}
      } catch {
        toast.error('Case not found')
        navigate('/admin/cases')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    const optimistic = { id: Date.now(), message: message.trim(), sender: user, created_at: new Date().toISOString(), _optimistic: true }
    setMessages((prev) => [...prev, optimistic])
    const text = message.trim()
    setMessage('')
    try {
      const { data } = await chatAPI.sendMessage({ case: id, message_type: 'text', message: text })
      setMessages((prev) => prev.map((m) => m._optimistic && m.id === optimistic.id ? data : m))
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      toast.error('Failed to send message')
      setMessage(text)
    } finally {
      setSending(false)
    }
  }

  const handleMarkWorking = async () => {
    setMarkingWorking(true)
    try {
      const { data } = await casesAPI.updateStatus(id, { status: 'working' })
      setCaseData(data)
      toast.success('Case marked as In Progress')
    } catch {
      toast.error('Failed to update status')
    } finally {
      setMarkingWorking(false)
    }
  }

  const uploadResult = async () => {
    if (!resultText && !resultFile) { toast.error('Enter result text or upload a file'); return }
    setUploadingResult(true)
    try {
      const formData = new FormData()
      if (resultText) formData.append('result_text', resultText)
      if (resultFile) formData.append('result_file', resultFile)
      const { data } = await casesAPI.uploadResult(id, formData)
      setCaseData((prev) => ({ ...prev, result: data, status: 'completed' }))
      toast.success('Result uploaded! Case marked completed.')
    } catch {
      toast.error('Failed to upload result')
    } finally {
      setUploadingResult(false)
    }
  }

  if (loading) return <LoadingScreen />
  if (!caseData) return null

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <button onClick={() => navigate('/admin/cases')}
            className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-4 transition-colors">
            <FiArrowLeft size={15} /> Back
          </button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">{caseData.case_number}</h1>
              <p className="text-white/40 text-sm">{caseData.client?.full_name} — {caseData.booking?.service?.name}</p>
            </div>
            <div className="flex gap-2">
              {caseData.status === 'received' && (
                <button onClick={handleMarkWorking} disabled={markingWorking}
                  className="btn-primary px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-60">
                  {markingWorking ? 'Updating...' : '▶ Start Working'}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat */}
          <div className="lg:col-span-2 flex flex-col glass rounded-2xl border border-white/5" style={{ height: '55vh', minHeight: 380 }}>
            <div className="px-5 py-4 border-b border-white/5">
              <p className="text-white font-medium text-sm">Chat with {caseData.client?.full_name}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-white/20 text-sm text-center">No messages yet</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMine = msg.sender?.id === user?.id || msg.sender === user?.id
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? 'bg-gradient-to-br from-red-700 to-red-900 text-white rounded-br-sm' : 'bg-white/5 text-white/80 rounded-bl-sm'} ${msg._optimistic ? 'opacity-60' : ''}`}>
                      <p>{msg.message}</p>
                      <p className={`text-xs mt-1 ${isMine ? 'text-white/40' : 'text-white/25'}`}>
                        {msg.created_at ? format(new Date(msg.created_at), 'h:mm a') : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="flex gap-3 px-4 py-4 border-t border-white/5">
              <input value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..." className="flex-1 bg-white/5 border border-white/10 focus:border-red-600/40 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/25 outline-none transition-all" />
              <motion.button type="submit" disabled={!message.trim() || sending} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center text-white disabled:opacity-40">
                <FiSend size={16} />
              </motion.button>
            </form>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Case Info */}
            <div className="glass rounded-2xl border border-white/5 p-5">
              <h3 className="text-white/50 text-xs uppercase tracking-wider mb-4">Case Info</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-white/35">Client</dt><dd className="text-white/70">{caseData.client?.full_name}</dd></div>
                <div className="flex justify-between"><dt className="text-white/35">Service</dt><dd className="text-white/70">{caseData.booking?.service?.name}</dd></div>
                <div className="flex justify-between"><dt className="text-white/35">Status</dt><dd className="text-white/70 capitalize">{caseData.status}</dd></div>
                <div className="flex justify-between"><dt className="text-white/35">Priority</dt><dd className="text-white/70 capitalize">{caseData.priority}</dd></div>
              </dl>
            </div>

            {/* Upload Result */}
            {(['working', 'received'].includes(caseData.status)) && (
              <div className="glass rounded-2xl border border-orange-900/20 p-5">
                <h3 className="text-orange-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FiUpload size={13} /> Upload Result
                </h3>
                <textarea
                  value={resultText}
                  onChange={(e) => setResultText(e.target.value)}
                  rows={4}
                  placeholder="Enter result analysis..."
                  className="input-field resize-none text-sm mb-3"
                />
                <label className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm cursor-pointer mb-4 transition-colors">
                  <FiUpload size={14} />
                  {resultFile ? resultFile.name : 'Attach file (optional)'}
                  <input type="file" className="hidden" onChange={(e) => setResultFile(e.target.files?.[0])} />
                </label>
                <button onClick={uploadResult} disabled={uploadingResult}
                  className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {uploadingResult ? 'Uploading...' : <><FiCheck size={14} /> Complete Case</>}
                </button>
              </div>
            )}

            {caseData.status === 'completed' && (
              <div className="glass rounded-2xl border border-green-900/20 p-5">
                <p className="text-green-400 flex items-center gap-2 text-sm">
                  <FiCheck size={16} /> Case Completed
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

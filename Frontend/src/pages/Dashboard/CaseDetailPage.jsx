import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowLeft, FiSend, FiPaperclip, FiStar, FiDownload, FiCheck } from 'react-icons/fi'
import { casesAPI, chatAPI, bookingsAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import DashboardLayout from './DashboardLayout'
import toast from 'react-hot-toast'
import LoadingScreen from '../../components/LoadingScreen'
import { format } from 'date-fns'

const STATUS_LABELS = {
  received: { label: 'Received', color: 'bg-blue-900/30 text-blue-400 border-blue-900/40' },
  working:  { label: 'In Progress', color: 'bg-purple-900/30 text-purple-400 border-purple-900/40' },
  completed:{ label: 'Completed', color: 'bg-green-900/30 text-green-400 border-green-900/40' },
  cancelled:{ label: 'Cancelled', color: 'bg-red-900/30 text-red-400 border-red-900/40' },
}

export default function CaseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [caseData, setCaseData] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [detailsForm, setDetailsForm] = useState({ birth_date: '', birth_time: '', birth_place: '', additional_notes: '' })
  const [detailsSubmitting, setDetailsSubmitting] = useState(false)
  const [detailsSubmitted, setDetailsSubmitted] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: c }] = await Promise.all([casesAPI.detail(id)])
        setCaseData(c)
        // Pre-populate additional details form if already submitted
        if (c.booking?.details) {
          const d = c.booking.details
          setDetailsForm({
            birth_date: d.birth_date || '',
            birth_time: d.birth_time || '',
            birth_place: d.birth_place || '',
            additional_notes: d.additional_notes || '',
          })
          if (d.birth_date || d.birth_place || d.additional_notes) {
            setDetailsSubmitted(true)
          }
        }
        // Try to load chat messages
        try {
          const { data: msgs } = await chatAPI.getMessages(id)
          setMessages(Array.isArray(msgs) ? msgs : msgs.results || [])
        } catch {
          // Chat endpoint might not be set up
        }
      } catch {
        toast.error('Case not found')
        navigate('/dashboard/cases')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    const optimistic = {
      id: Date.now(),
      case: id,
      message_type: 'text',
      message: message.trim(),
      sender: user,
      created_at: new Date().toISOString(),
      _optimistic: true,
    }
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

  const submitRating = async () => {
    if (!rating) { toast.error('Please select a rating'); return }
    setSubmittingRating(true)
    try {
      await casesAPI.submitRating(id, { client_rating: rating, client_feedback: feedbackText })
      toast.success('Rating submitted. Thank you!')
      setCaseData((prev) => ({ ...prev, result: { ...prev.result, client_rating: rating, client_feedback: feedbackText } }))
    } catch {
      toast.error('Failed to submit rating')
    } finally {
      setSubmittingRating(false)
    }
  }

  const submitDetails = async () => {
    if (!caseData?.booking?.id) return
    setDetailsSubmitting(true)
    try {
      const payload = {}
      if (detailsForm.birth_date) payload.birth_date = detailsForm.birth_date
      if (detailsForm.birth_time) payload.birth_time = detailsForm.birth_time
      if (detailsForm.birth_place) payload.birth_place = detailsForm.birth_place
      if (detailsForm.additional_notes) payload.additional_notes = detailsForm.additional_notes
      await bookingsAPI.addDetails(caseData.booking.id, payload)
      toast.success('Details saved successfully!')
      setDetailsSubmitted(true)
    } catch {
      toast.error('Failed to save details')
    } finally {
      setDetailsSubmitting(false)
    }
  }

  if (loading) return <LoadingScreen />
  if (!caseData) return null

  const statusCfg = STATUS_LABELS[caseData.status] || STATUS_LABELS.received

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <button
            onClick={() => navigate('/dashboard/cases')}
            className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-4 transition-colors"
          >
            <FiArrowLeft size={15} /> Back to Cases
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">{caseData.case_number}</h1>
              <p className="text-white/40 text-sm mt-1">{caseData.booking?.service?.name}</p>
            </div>
            <span className={`self-start sm:self-auto text-xs px-3 py-1.5 rounded-full border ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat — 2/3 */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="lg:col-span-2 flex flex-col glass rounded-2xl border border-white/5"
            style={{ height: '60vh', minHeight: 400 }}>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
              <div className="w-8 h-8 bg-red-900/40 rounded-full flex items-center justify-center">
                <span className="text-red-400 text-xs">👤</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">
                  {caseData.assigned_admin?.full_name || 'Awaiting Assignment'}
                </p>
                <p className="text-white/30 text-xs">Practitioner</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-white/20 text-sm text-center">
                    No messages yet.<br />Start a conversation with your practitioner.
                  </p>
                </div>
              )}
              {messages.map((msg) => {
                const isMine = msg.sender?.id === user?.id || msg.sender === user?.id
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMine
                        ? 'bg-gradient-to-br from-red-700 to-red-900 text-white rounded-br-sm'
                        : 'bg-white/5 text-white/80 rounded-bl-sm'
                    } ${msg._optimistic ? 'opacity-60' : ''}`}>
                      <p className="leading-relaxed">{msg.message}</p>
                      <p className={`text-xs mt-1 ${isMine ? 'text-white/40' : 'text-white/25'}`}>
                        {msg.created_at ? format(new Date(msg.created_at), 'h:mm a') : ''}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={sendMessage} className="flex gap-3 px-4 py-4 border-t border-white/5">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border border-white/10 focus:border-red-600/40 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/25 outline-none transition-all"
              />
              <motion.button
                type="submit"
                disabled={!message.trim() || sending}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiSend size={16} />
              </motion.button>
            </form>
          </motion.div>

          {/* Info Panel — 1/3 */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="lg:col-span-1 space-y-4">
            {/* Case Info */}
            <div className="glass rounded-2xl border border-white/5 p-5">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Case Details</h3>
              <dl className="space-y-3">
                {[
                  { label: 'Case #', value: caseData.case_number },
                  { label: 'Service', value: caseData.booking?.service?.name },
                  { label: 'Priority', value: caseData.priority },
                  { label: 'Created', value: caseData.created_at ? format(new Date(caseData.created_at), 'MMM d, yyyy') : '–' },
                  caseData.expected_completion_date && { label: 'Expected', value: format(new Date(caseData.expected_completion_date), 'MMM d, yyyy') },
                ].filter(Boolean).map((item, i) => (
                  <div key={i} className="flex justify-between items-start gap-2">
                    <dt className="text-white/35 text-xs">{item.label}</dt>
                    <dd className="text-white/70 text-xs text-right capitalize">{item.value || '–'}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Additional Details form */}
            <div className="glass rounded-2xl border border-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Case Information</h3>
                {detailsSubmitted && (
                  <span className="flex items-center gap-1 text-green-400/70 text-xs">
                    <FiCheck size={11} /> Saved
                  </span>
                )}
              </div>
              <p className="text-white/30 text-xs mb-4 leading-relaxed">
                Provide your spiritual details to help the practitioner serve you better.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-white/40 text-xs mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={detailsForm.birth_date}
                    onChange={(e) => setDetailsForm((p) => ({ ...p, birth_date: e.target.value }))}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-white/40 text-xs mb-1">Time of Birth</label>
                  <input
                    type="time"
                    value={detailsForm.birth_time}
                    onChange={(e) => setDetailsForm((p) => ({ ...p, birth_time: e.target.value }))}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-white/40 text-xs mb-1">Place of Birth</label>
                  <input
                    type="text"
                    value={detailsForm.birth_place}
                    onChange={(e) => setDetailsForm((p) => ({ ...p, birth_place: e.target.value }))}
                    placeholder="City, Country"
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-white/40 text-xs mb-1">Additional Notes</label>
                  <textarea
                    value={detailsForm.additional_notes}
                    onChange={(e) => setDetailsForm((p) => ({ ...p, additional_notes: e.target.value }))}
                    placeholder="Any extra information for your practitioner..."
                    rows={3}
                    className="input-field text-sm resize-none"
                  />
                </div>
                <button
                  onClick={submitDetails}
                  disabled={detailsSubmitting}
                  className="w-full btn-primary py-2.5 text-sm disabled:opacity-50"
                >
                  {detailsSubmitting ? 'Saving...' : detailsSubmitted ? 'Update Details' : 'Submit Details'}
                </button>
              </div>
            </div>

            {/* Result (if completed) */}
            {caseData.result && (
              <div className="glass rounded-2xl border border-green-900/20 p-5">
                <h3 className="text-green-400 font-semibold text-sm uppercase tracking-wider mb-3">Result Ready</h3>
                {caseData.result.result_text && (
                  <p className="text-white/60 text-sm leading-relaxed mb-4">{caseData.result.result_text}</p>
                )}
                {caseData.result.result_file && (
                  <a
                    href={caseData.result.result_file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm transition-colors"
                  >
                    <FiDownload size={14} />
                    Download Result File
                  </a>
                )}

                {/* Rating */}
                {!caseData.result.client_rating && (
                  <div className="mt-5 pt-5 border-t border-white/5">
                    <p className="text-white/50 text-sm mb-3">Rate your experience</p>
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(0)}
                          onClick={() => setRating(star)}
                          className={`transition-colors ${
                            star <= (hoveredStar || rating) ? 'text-red-400' : 'text-white/20'
                          }`}
                        >
                          <FiStar size={24} className={star <= (hoveredStar || rating) ? 'fill-red-400' : ''} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Leave feedback (optional)"
                      rows={2}
                      className="input-field text-sm resize-none mb-3"
                    />
                    <button
                      onClick={submitRating}
                      disabled={!rating || submittingRating}
                      className="w-full btn-primary py-2.5 text-sm disabled:opacity-50"
                    >
                      {submittingRating ? 'Submitting...' : 'Submit Rating'}
                    </button>
                  </div>
                )}
                {caseData.result.client_rating && (
                  <div className="mt-3 flex gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <FiStar key={s} size={16} className={s <= caseData.result.client_rating ? 'text-red-400 fill-red-400' : 'text-white/15'} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Status progress */}
            <div className="glass rounded-2xl border border-white/5 p-5">
              <h3 className="text-white/50 text-xs uppercase tracking-wider mb-4">Progress</h3>
              {['received', 'working', 'completed'].map((s, i) => {
                const statusMap = { received: 0, working: 1, completed: 2, cancelled: -1 }
                const current = statusMap[caseData.status] ?? 0
                const done = i <= current
                return (
                  <div key={s} className="flex items-center gap-3 mb-3 last:mb-0">
                    <div className={`w-3 h-3 rounded-full border-2 ${done ? 'bg-red-600 border-red-600' : 'bg-transparent border-white/20'}`} />
                    <p className={`text-sm capitalize ${done ? 'text-white/70' : 'text-white/25'}`}>
                      {s === 'working' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </p>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}

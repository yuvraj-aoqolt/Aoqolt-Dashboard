/**
 * ChatThread — a self-contained, reusable message thread.
 *
 * Props:
 *  messages       array     Messages to display
 *  loading        bool      Show loading spinner instead of messages
 *  sending        bool      Input is busy
 *  onSend         fn(text)  Send plain text message
 *  onSendFile     fn(File)  Send image/video file
 *  onSendVoice    fn(Blob)  Send voice note
 *  onEdit         fn(id, newText)
 *  onDelete       fn(id)
 *  userId         number|str  Current user id (to determine own messages)
 *  placeholder    string    Input placeholder
 *  emptyText      string    Empty state line 2
 *  readonly       bool      Hide input (view-only thread)
 */

import { useState, useRef, useEffect } from 'react'
import {
  FiSend, FiPaperclip, FiSmile, FiMic, FiSquare,
  FiMoreVertical, FiEdit2, FiTrash2, FiCheck, FiX, FiMessageSquare,
} from 'react-icons/fi'
import { compressImage, validateVideo } from '../../../utils/chatMediaUtils'
import toast from 'react-hot-toast'

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}
const within12hrs = (d) => Date.now() - new Date(d) < 12 * 3600 * 1000
const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const fileUrl = (url) => {
  if (!url) return ''
  return url.startsWith('http') ? url : `${API_BASE}/${url.replace(/^\//, '')}`
}

const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘',
  '😚','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤔','😐','😶','😏','😒','🙄','😬',
  '😔','😪','😴','😷','🤒','🤕','😵','🤯','🥳','😎','🧐','👍','👎','👌','✌️','🤞',
  '🤙','👋','👏','🙌','🤝','🙏','💪','❤️','🧡','💛','💚','💙','💜','🖤','💔','💕',
  '💖','💘','💝','🎉','🎊','🎈','🎁','🔥','⭐','✨','💫','🌟','💥','❄️','🌈','☀️',
  '🌙','⚡','🌊','🌺','🌸','🍕','🍔','☕','🎵','🎶','💻','📱','🏆','🎯','🚀','💎','👑',
]

// ── Bubble ────────────────────────────────────────────────────────────────────
function Bubble({ msg, isMine, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing]  = useState(false)
  const [draft, setDraft]      = useState(msg.message || '')
  const canModify = isMine && within12hrs(msg.created_at)

  const saveEdit = () => {
    if (!draft.trim()) return
    onEdit(msg.id, draft.trim())
    setEditing(false)
  }

  return (
    <div className={`group flex items-end gap-2 mb-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {/* action menu — only for own messages */}
      {canModify && !editing && (
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/60 rounded-full hover:bg-white/10 transition-all"
          >
            <FiMoreVertical size={13} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute bottom-full right-0 mb-1 bg-[#1f1f1f] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[110px]">
                {msg.message_type === 'text' && (
                  <button
                    onClick={() => { setEditing(true); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:bg-white/5 hover:text-white text-sm transition-colors"
                  >
                    <FiEdit2 size={13} /> Edit
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onDelete(msg.id) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-400/70 hover:bg-red-900/10 hover:text-red-400 text-sm transition-colors"
                >
                  <FiTrash2 size={13} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && (
          <span className="text-white/30 text-[11px] mb-1 ml-1">{msg.sender_name || 'Aoqolt Team'}</span>
        )}

        {editing ? (
          <div className="bg-red-900/50 rounded-2xl rounded-br-sm px-3 py-2.5 min-w-[200px]">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                if (e.key === 'Escape') setEditing(false)
              }}
              autoFocus rows={2}
              className="w-full bg-transparent text-white text-sm resize-none focus:outline-none max-h-24"
              style={{ scrollbarWidth: 'none' }}
            />
            <div className="flex justify-end gap-1 mt-1.5">
              <button onClick={() => setEditing(false)} className="text-white/40 hover:text-white/70 p-1 rounded-lg"><FiX size={14} /></button>
              <button onClick={saveEdit} disabled={!draft.trim()} className="text-green-400 hover:text-green-300 p-1 rounded-lg disabled:opacity-30"><FiCheck size={14} /></button>
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl text-sm leading-relaxed overflow-hidden ${
            isMine
              ? 'bg-[#3a3a3a] text-white rounded-br-sm'
              : 'bg-[#2a2a2a] text-white/85 rounded-bl-sm'
          }`}>
            {msg.message_type === 'image' && msg.file_url
              ? <img src={fileUrl(msg.file_url)} alt="" className="max-w-[220px] max-h-[180px] object-cover block cursor-pointer" onClick={() => window.open(fileUrl(msg.file_url), '_blank')} />
              : msg.message_type === 'video' && msg.file_url
              ? <video controls src={fileUrl(msg.file_url)} className="max-w-[220px] max-h-[180px] block" />
              : msg.message_type === 'voice' && msg.file_url
              ? <div className="px-3 py-2.5"><audio controls src={fileUrl(msg.file_url)} className="max-w-[200px] h-8" /></div>
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
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatThread({
  messages = [],
  loading = false,
  sending = false,
  onSend,
  onSendFile,
  onSendVoice,
  onEdit,
  onDelete,
  userId,
  placeholder = 'Type a message',
  emptyText = 'Start the conversation',
  readonly = false,
}) {
  const [text, setText]           = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recTime, setRecTime]     = useState(0)

  const bottomRef      = useRef(null)
  const inputRef       = useRef(null)
  const fileInputRef   = useRef(null)
  const mediaRecRef    = useRef(null)
  const chunksRef      = useRef([])
  const timerRef       = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = () => {
    if (!text.trim() || sending) return
    onSend?.(text.trim())
    setText('')
    inputRef.current?.focus()
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  const handleFile = async (e) => {
    let file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const isVideo = file.type.startsWith('video/')
    if (isVideo) {
      const check = await validateVideo(file)
      if (!check.ok) { toast.error(check.reason); return }
    }
    if (file.type.startsWith('image/')) {
      try { file = await compressImage(file) } catch { /* use original */ }
    }
    onSendFile?.(file)
  }

  const startRec = async () => {
    if (recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onSendVoice?.(blob)
      }
      mr.start()
      mediaRecRef.current = mr
      setRecording(true)
      setRecTime(0)
      timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000)
    } catch {
      toast.error('Microphone access denied')
    }
  }

  const stopRec = () => {
    clearInterval(timerRef.current)
    setRecording(false)
    mediaRecRef.current?.stop()
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ scrollbarWidth: 'thin' }}>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-white/10 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-white/20">
            <FiMessageSquare size={36} className="mb-3 text-white/10" />
            <p className="text-sm">No messages yet</p>
            {!readonly && <p className="text-xs mt-1 text-white/15">{emptyText}</p>}
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = String(msg.sender?.id) === String(userId) || msg.sender_role === 'client'
            const showDate =
              i === 0 ||
              new Date(messages[i - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString()
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-white/20 text-[11px] flex-shrink-0">{fmtDate(msg.created_at)}</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                )}
                <Bubble
                  msg={msg}
                  isMine={isMine}
                  onEdit={onEdit || (() => {})}
                  onDelete={onDelete || (() => {})}
                />
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!readonly && (
        <div className="px-3 py-2.5 border-t border-white/5 flex-shrink-0 relative">
          {showEmoji && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
              <div className="absolute bottom-full left-3 mb-2 bg-[#1a1a1a] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 w-64">
                <div className="grid grid-cols-8 gap-0.5 max-h-44 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  {EMOJIS.map(em => (
                    <button key={em} onClick={() => { setText(t => t + em); setShowEmoji(false); inputRef.current?.focus() }}
                      className="text-lg hover:bg-white/10 rounded-md p-1 transition-colors leading-none">
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {recording ? (
            <div className="flex items-center gap-3 bg-[#2a2a2a] rounded-xl px-3 py-2.5 border border-red-900/30">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
              <span className="text-red-400 text-sm flex-1">Recording… {fmt(recTime)}</span>
              <button onClick={stopRec}
                className="flex items-center gap-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 px-2.5 py-1 rounded-lg text-xs transition-colors">
                <FiSquare size={10} /> Stop &amp; Send
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#1e1e1e] rounded-xl px-3 py-2 border border-white/[0.06]">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={onKey}
                placeholder={placeholder}
                rows={1}
                className="flex-1 bg-transparent text-white/90 text-sm placeholder-white/30 resize-none focus:outline-none py-0.5 max-h-24"
                style={{ scrollbarWidth: 'none' }}
              />
              {/* Right icons: mic, emoji, image */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={startRec} title="Voice note"
                  className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/70 rounded-lg hover:bg-white/5 transition-colors">
                  <FiMic size={15} />
                </button>
                <button onClick={() => setShowEmoji(v => !v)} title="Emoji"
                  className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/70 rounded-lg hover:bg-white/5 transition-colors">
                  <FiSmile size={15} />
                </button>
                <button onClick={() => fileInputRef.current?.click()} title="Attach image/video"
                  className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/70 rounded-lg hover:bg-white/5 transition-colors">
                  <FiPaperclip size={15} />
                </button>
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
        </div>
      )}
    </div>
  )
}

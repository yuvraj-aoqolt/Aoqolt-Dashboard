/**
 * ManageInviteModal
 *
 * Shown when SuperAdmin clicks "Manage Invite" or "Reset Password" for an
 * existing user. Lets the admin:
 *  - Generate / regenerate an invitation link (inactive accounts)
 *  - Generate / regenerate an admin password-reset link (any account)
 *
 * Props:
 *  open    {boolean}
 *  onClose {function}
 *  user    {{ id, full_name, email, role, is_active }}
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  FiX, FiLink, FiCopy, FiCheck, FiRefreshCw, FiUserCheck, FiKey,
} from 'react-icons/fi'
import { inviteAPI } from '../../api'

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }
  return { copied, copy }
}

function LinkRow({ link }) {
  const { copied, copy } = useCopy()
  if (!link) return null
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 overflow-hidden">
        <p className="text-white/60 text-xs font-mono truncate">{link}</p>
      </div>
      <button
        type="button"
        onClick={() => copy(link)}
        title="Copy"
        className="w-9 h-9 rounded-lg bg-white/8 hover:bg-white/12 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
      >
        {copied ? <FiCheck size={15} className="text-green-400" /> : <FiCopy size={15} />}
      </button>
    </div>
  )
}

export default function ManageInviteModal({ open, onClose, user }) {
  const [inviteLink, setInviteLink] = useState('')
  const [resetLink, setResetLink]   = useState('')
  const [genInvite, setGenInvite]   = useState(false)
  const [genReset, setGenReset]     = useState(false)

  const handleClose = () => {
    setInviteLink('')
    setResetLink('')
    onClose()
  }

  const generateInvite = async () => {
    setGenInvite(true)
    try {
      const { data } = await inviteAPI.generateInvite({ user_id: user.id })
      setInviteLink(data.invite_link)
      toast.success('Invite link generated.')
    } catch {
      toast.error('Failed to generate invite link.')
    } finally {
      setGenInvite(false)
    }
  }

  const generateReset = async () => {
    setGenReset(true)
    try {
      const { data } = await inviteAPI.generateReset({ user_id: user.id })
      setResetLink(data.reset_link)
      toast.success('Reset link generated.')
    } catch {
      toast.error('Failed to generate reset link.')
    } finally {
      setGenReset(false)
    }
  }

  if (!open || !user) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md glass rounded-2xl border border-white/8 shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-600 to-orange-700 flex items-center justify-center text-black font-bold text-sm">
                    {user.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{user.full_name}</p>
                    <p className="text-white/35 text-xs">{user.email}</p>
                  </div>
                </div>
                <button onClick={handleClose}
                  className="w-7 h-7 rounded-lg hover:bg-white/8 flex items-center justify-center text-white/40 hover:text-white/70 transition-all">
                  <FiX size={15} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-5">

                {/* ── Invite link section (for inactive users) ── */}
                {!user.is_active && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <FiUserCheck className="text-yellow-400" size={14} />
                      <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                        Invitation Link
                      </span>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-500">
                        Activates account
                      </span>
                    </div>
                    <p className="text-white/30 text-[11px] leading-relaxed">
                      The user has not yet activated their account. Generate an invite link
                      to let them set their password.
                    </p>
                    {inviteLink && <LinkRow link={inviteLink} />}
                    <button
                      type="button"
                      onClick={generateInvite}
                      disabled={genInvite}
                      className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-yellow-600/15 hover:bg-yellow-600/25 text-yellow-400 border border-yellow-900/30 transition-all disabled:opacity-50"
                    >
                      <FiRefreshCw size={12} className={genInvite ? 'animate-spin' : ''} />
                      {genInvite ? 'Generating…' : inviteLink ? 'Regenerate Invite' : 'Generate Invite Link'}
                    </button>
                  </div>
                )}

                {/* ── Password reset section ── */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <FiKey className="text-blue-400" size={14} />
                    <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                      Password Reset Link
                    </span>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">
                      Admin controlled
                    </span>
                  </div>
                  <p className="text-white/30 text-[11px] leading-relaxed">
                    Generate a secure reset link. Any previously issued reset links will be
                    automatically invalidated.
                  </p>
                  {resetLink && <LinkRow link={resetLink} />}
                  <button
                    type="button"
                    onClick={generateReset}
                    disabled={genReset}
                    className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-900/25 transition-all disabled:opacity-50"
                  >
                    <FiRefreshCw size={12} className={genReset ? 'animate-spin' : ''} />
                    {genReset ? 'Generating…' : resetLink ? 'Regenerate Reset Link' : 'Generate Reset Link'}
                  </button>
                </div>

                <p className="text-white/20 text-[10px] pt-1 border-t border-white/5">
                  All links expire after 24 hours and are single-use for security.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

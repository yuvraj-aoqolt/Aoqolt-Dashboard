/**
 * CreateUserModal
 *
 * SuperAdmin modal to:
 *  1. Create a new Admin or Client account (no password required)
 *  2. Display the generated invitation link with copy-to-clipboard
 *  3. Optionally regenerate an invite/reset link for an existing user
 *
 * Props:
 *  open          {boolean}   — controls visibility
 *  onClose       {function}  — called when modal should close
 *  defaultRole   {string}    — 'admin' | 'client' (pre-selects the role dropdown)
 *  onUserCreated {function}  — called with the new user object after creation
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  FiX, FiUser, FiMail, FiShield, FiLink, FiCopy, FiCheck,
  FiRefreshCw, FiUserPlus,
} from 'react-icons/fi'
import { inviteAPI } from '../../api'

// ── Copy-to-clipboard mini-hook ──────────────────────────────────────────
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

// ── Invite-link display card ─────────────────────────────────────────────
function InviteLinkCard({ label, link, onRegenerate, regenerating }) {
  const { copied, copy } = useCopy()

  return (
    <div className="rounded-xl border border-yellow-900/30 bg-yellow-500/5 p-4 space-y-3">
      <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
        <FiLink size={12} /> {label}
      </p>

      {/* Link row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 overflow-hidden">
          <p className="text-white/70 text-xs font-mono truncate">{link}</p>
        </div>
        <button
          type="button"
          onClick={() => copy(link)}
          title="Copy link"
          className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/8 hover:bg-white/12 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
        >
          {copied ? <FiCheck size={15} className="text-green-400" /> : <FiCopy size={15} />}
        </button>
      </div>

      <p className="text-white/30 text-[11px]">
        Share this link with the user. It expires in 24 hours and can only be used once.
      </p>

      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
        >
          <FiRefreshCw size={11} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Regenerating…' : 'Regenerate link'}
        </button>
      )}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────
export default function CreateUserModal({
  open,
  onClose,
  defaultRole = 'client',
  onUserCreated,
}) {
  const [step, setStep]               = useState('form')   // 'form' | 'done'
  const [loading, setLoading]         = useState(false)
  const [inviteLink, setInviteLink]   = useState('')
  const [createdUser, setCreatedUser] = useState(null)
  const [regenerating, setRegenerating] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { role: defaultRole } })

  // ── Reset modal when closed ─────────────────────────────────────────
  const handleClose = () => {
    reset()
    setStep('form')
    setInviteLink('')
    setCreatedUser(null)
    onClose()
  }

  // ── Create user ──────────────────────────────────────────────────────
  const onSubmit = async ({ full_name, email, role }) => {
    setLoading(true)
    try {
      const { data } = await inviteAPI.createUser({ full_name, email, role })
      setCreatedUser(data.user)
      setInviteLink(data.invite_link)
      setStep('done')
      onUserCreated?.(data.user)
      toast.success('User created! Share the invite link.')
    } catch (err) {
      const serverErrors = err.response?.data
      if (serverErrors?.email) {
        toast.error(serverErrors.email[0] || serverErrors.email)
      } else {
        toast.error(serverErrors?.detail || 'Failed to create user.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Regenerate invite link ───────────────────────────────────────────
  const regenerateInvite = async () => {
    if (!createdUser) return
    setRegenerating(true)
    try {
      const { data } = await inviteAPI.generateInvite({ user_id: createdUser.id })
      setInviteLink(data.invite_link)
      toast.success('New invite link generated.')
    } catch {
      toast.error('Failed to regenerate link.')
    } finally {
      setRegenerating(false)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md glass rounded-2xl border border-white/8 shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <FiUserPlus className="text-yellow-400" size={16} />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold text-sm">
                      {step === 'form' ? 'Invite New User' : 'User Created'}
                    </h2>
                    <p className="text-white/30 text-xs">
                      {step === 'form'
                        ? 'Account will be activated via the invite link'
                        : 'Share the link below to complete account setup'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-7 h-7 rounded-lg hover:bg-white/8 flex items-center justify-center text-white/40 hover:text-white/70 transition-all"
                >
                  <FiX size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {step === 'form' ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Full name */}
                    <div>
                      <label className="block text-white/55 text-xs uppercase tracking-wider mb-1.5">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                        <input
                          {...register('full_name', { required: 'Name is required' })}
                          placeholder="e.g. John Smith"
                          className="w-full bg-white/5 border border-white/10 focus:border-yellow-600/40 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition-all"
                        />
                      </div>
                      {errors.full_name && (
                        <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-white/55 text-xs uppercase tracking-wider mb-1.5">
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                        <input
                          {...register('email', {
                            required: 'Email is required',
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: 'Enter a valid email address',
                            },
                          })}
                          type="email"
                          placeholder="[email protected]"
                          className="w-full bg-white/5 border border-white/10 focus:border-yellow-600/40 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition-all"
                        />
                      </div>
                      {errors.email && (
                        <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                      )}
                    </div>

                    {/* Role */}
                    <div>
                      <label className="block text-white/55 text-xs uppercase tracking-wider mb-1.5">
                        Role <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <FiShield className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                        <select
                          {...register('role', { required: 'Role is required' })}
                          className="w-full bg-white/5 border border-white/10 focus:border-yellow-600/40 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option value="client" className="bg-gray-900">Client</option>
                          <option value="admin" className="bg-gray-900">Admin</option>
                        </select>
                      </div>
                    </div>

                    {/* Info note */}
                    <p className="text-white/25 text-[11px] leading-relaxed">
                      No password is set at this stage. The user will receive an
                      invitation link valid for <strong className="text-white/40">24 hours</strong> to
                      activate their account.
                    </p>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full"
                          />
                          Creating…
                        </>
                      ) : (
                        <>
                          <FiUserPlus size={15} />
                          Create & Get Invite Link
                        </>
                      )}
                    </motion.button>
                  </form>
                ) : (
                  /* ── Success state ── */
                  <div className="space-y-4">
                    {/* Created user info */}
                    {createdUser && (
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/8">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-600 to-orange-700 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                          {createdUser.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {createdUser.full_name}
                          </p>
                          <p className="text-white/40 text-xs truncate">{createdUser.email}</p>
                        </div>
                        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-lg font-medium ${
                          createdUser.role === 'admin'
                            ? 'bg-orange-900/30 text-orange-400'
                            : 'bg-blue-900/30 text-blue-400'
                        }`}>
                          {createdUser.role}
                        </span>
                      </div>
                    )}

                    {/* Invite link */}
                    <InviteLinkCard
                      label="Invitation Link"
                      link={inviteLink}
                      onRegenerate={regenerateInvite}
                      regenerating={regenerating}
                    />

                    <motion.button
                      type="button"
                      onClick={handleClose}
                      whileTap={{ scale: 0.97 }}
                      className="w-full py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-all"
                    >
                      Done
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

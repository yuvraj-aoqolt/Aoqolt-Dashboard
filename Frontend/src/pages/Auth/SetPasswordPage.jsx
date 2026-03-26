/**
 * SetPasswordPage
 *
 * Handles the invitation link flow: /invite/:token
 * - Validates the token with the backend before showing the form
 * - On submit, sets the password and activates the account
 * - Redirects to /login on success
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiLock, FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi'
import { inviteAPI } from '../../api'
import AuthLayout from './AuthLayout'

const PASSWORD_RULES = [
  { id: 'length',  label: 'At least 8 characters',           test: (v) => v.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter',             test: (v) => /[A-Z]/.test(v) },
  { id: 'lower',   label: 'One lowercase letter',             test: (v) => /[a-z]/.test(v) },
  { id: 'digit',   label: 'One number',                       test: (v) => /\d/.test(v) },
  { id: 'special', label: 'One special character (!@#$…)',    test: (v) => /[^A-Za-z0-9]/.test(v) },
]

function PasswordStrengthBar({ password }) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length
  const pct    = (passed / PASSWORD_RULES.length) * 100
  const color  = pct <= 40 ? 'bg-red-500' : pct <= 70 ? 'bg-yellow-500' : 'bg-green-500'

  if (!password) return null
  return (
    <div className="mt-2 space-y-1">
      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password)
          return (
            <li
              key={r.id}
              className={`flex items-center gap-1 text-[11px] transition-colors ${ok ? 'text-green-400' : 'text-white/30'}`}
            >
              {ok ? <FiCheckCircle size={10} /> : <FiAlertCircle size={10} />}
              {r.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SetPasswordPage() {
  const { token } = useParams()
  const navigate  = useNavigate()

  const [validating, setValidating] = useState(true)
  const [tokenInfo, setTokenInfo]   = useState(null)   // { user_name, user_email, token_type }
  const [tokenError, setTokenError] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [showPw, setShowPw]         = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()

  const passwordValue = watch('password', '')

  // ── Validate the token on mount ───────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setTokenError('No invitation token found in the URL.')
      setValidating(false)
      return
    }

    inviteAPI
      .validateToken(token)
      .then(({ data }) => {
        setTokenInfo(data)
      })
      .catch((err) => {
        setTokenError(
          err.response?.data?.error ||
          'This invitation link is invalid or has expired.'
        )
      })
      .finally(() => setValidating(false))
  }, [token])

  // ── Submit handler ────────────────────────────────────────────────────
  const onSubmit = async ({ password, confirm_password }) => {
    const failed = PASSWORD_RULES.filter((r) => !r.test(password))
    if (failed.length) {
      toast.error('Password does not meet all requirements.')
      return
    }

    setLoading(true)
    try {
      await inviteAPI.setPassword({ token, password, confirm_password })
      toast.success('Account activated! You can now log in.')
      navigate('/login')
    } catch (err) {
      const msg =
        err.response?.data?.token?.[0] ||
        err.response?.data?.password?.[0] ||
        err.response?.data?.detail ||
        'Failed to set password. The link may have expired.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Render states ─────────────────────────────────────────────────────

  if (validating) {
    return (
      <AuthLayout title="Activating…" subtitle="Validating your invitation link">
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-white/20 border-t-yellow-500 rounded-full"
          />
        </div>
      </AuthLayout>
    )
  }

  if (tokenError) {
    return (
      <AuthLayout title="Link Invalid" subtitle="This invitation link cannot be used">
        <div className="text-center py-8 space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <FiAlertCircle className="text-red-400" size={28} />
          </div>
          <p className="text-white/50 text-sm leading-relaxed">{tokenError}</p>
          <p className="text-white/30 text-xs">
            Please ask your administrator to generate a new invitation link.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={tokenInfo?.token_type === 'reset' ? 'Reset Password' : 'Set Up Account'}
      subtitle={`Welcome${tokenInfo?.user_name ? ', ' + tokenInfo.user_name.split(' ')[0] : ''}! Choose a strong password to activate your account.`}
    >
      {/* User info pill */}
      {tokenInfo?.user_email && (
        <div className="mb-5 px-3 py-2 bg-white/5 border border-white/8 rounded-xl flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-yellow-600/30 flex items-center justify-center text-yellow-400 text-xs font-bold flex-shrink-0">
            {tokenInfo.user_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{tokenInfo.user_name}</p>
            <p className="text-white/40 text-[11px] truncate">{tokenInfo.user_email}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Password */}
        <div>
          <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">
            New Password
          </label>
          <div className="relative">
            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Minimum 8 characters' },
              })}
              type={showPw ? 'text' : 'password'}
              placeholder="Create a strong password"
              autoComplete="new-password"
              className="input-field pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
          )}
          <PasswordStrengthBar password={passwordValue} />
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              {...register('confirm_password', {
                required: 'Please confirm your password',
                validate: (v) =>
                  v === watch('password') || 'Passwords do not match',
              })}
              type={showPw ? 'text' : 'password'}
              placeholder="Repeat your password"
              autoComplete="new-password"
              className="input-field pl-10"
            />
          </div>
          {errors.confirm_password && (
            <p className="text-red-400 text-xs mt-1">{errors.confirm_password.message}</p>
          )}
        </div>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              Activating…
            </>
          ) : (
            tokenInfo?.token_type === 'reset' ? 'Set New Password' : 'Activate Account'
          )}
        </motion.button>
      </form>
    </AuthLayout>
  )
}

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { authAPI } from '../../api'
import AuthLayout from './AuthLayout'

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const password = watch('password')

  const onSubmit = async ({ password, confirm_password }) => {
    if (!token) { toast.error('Invalid or missing reset link. Please request a new one.'); return }
    setLoading(true)
    try {
      await authAPI.selfResetPassword({ token, new_password: password, confirm_password })
      toast.success('Password reset successful! You can now log in.')
      navigate('/login')
    } catch (err) {
      const errData = err.response?.data
      const msg =
        (Array.isArray(errData?.error) ? errData.error.join(' ') : null) ||
        errData?.error ||
        errData?.detail ||
        'Reset failed. The link may have expired.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="New Password" subtitle="Choose a strong new password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">New Password</label>
          <div className="relative">
            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })}
              type={showPw ? 'text' : 'password'}
              placeholder="New password"
              className="input-field pl-10 pr-10"
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
              {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">Confirm Password</label>
          <div className="relative">
            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              {...register('confirm_password', { required: 'Required', validate: (v) => v === password || 'Passwords do not match' })}
              type={showPw ? 'text' : 'password'}
              placeholder="Confirm password"
              className="input-field pl-10"
            />
          </div>
          {errors.confirm_password && <p className="text-red-400 text-xs mt-1">{errors.confirm_password.message}</p>}
        </div>

        <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? (
            <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Resetting...</>
          ) : 'Reset Password'}
        </motion.button>
      </form>
    </AuthLayout>
  )
}

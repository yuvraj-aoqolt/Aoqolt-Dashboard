import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiMail, FiArrowLeft } from 'react-icons/fi'
import { authAPI } from '../../api'
import AuthLayout from './AuthLayout'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email }) => {
    setLoading(true)
    try {
      await authAPI.forgotPassword({ email })
      setSent(true)
      toast.success('Password reset instructions sent!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Reset Password" subtitle="Enter your email to receive reset instructions">
      {sent ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 glass rounded-2xl">
          <div className="text-5xl mb-4">📧</div>
          <h3 className="text-white font-semibold text-xl mb-2">Check Your Email</h3>
          <p className="text-white/40 text-sm mb-6">
            We've sent password reset instructions to your email.
          </p>
          <Link to="/login" className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors flex items-center gap-1 justify-center">
            <FiArrowLeft size={14} /> Back to Sign In
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
              <input
                {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/, message: 'Invalid email' } })}
                type="email"
                placeholder="you@example.com"
                className="input-field pl-10"
              />
            </div>
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? (
              <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Sending...</>
            ) : 'Send Reset Link'}
          </motion.button>

          <Link to="/login" className="flex items-center justify-center gap-1 text-white/40 hover:text-white/70 text-sm transition-colors">
            <FiArrowLeft size={14} /> Back to Sign In
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}

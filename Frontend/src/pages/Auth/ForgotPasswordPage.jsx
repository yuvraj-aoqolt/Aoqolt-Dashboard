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
      await authAPI.selfForgotPassword({ email })
      setSent(true)
    } catch (err) {
      // Show generic message to avoid email enumeration
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Forgot Password" subtitle="Enter your email and we'll send a reset link">
      {sent ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 glass rounded-2xl">
          <div className="text-5xl mb-4">📧</div>
          <h3 className="text-white font-semibold text-xl mb-2">Check Your Email</h3>
          <p className="text-white text-sm mb-2">
            If this email belongs to a self-registered account, a reset link has been sent.
          </p>
          <p className="text-white text-xs mb-6">
            The link is valid for <span className="text-white font-medium">15 minutes</span>. Check your spam folder if needed.
          </p>
          <Link to="/login" className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors flex items-center gap-1 justify-center">
            <FiArrowLeft size={14} /> Back to Sign In
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-white text-xs uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white" size={16} />
              <input
                {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/, message: 'Invalid email' } })}
                type="email"
                placeholder="you@example.com"
                className="input-field pl-10"
              />
            </div>
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <p className="text-white text-xs">
            Only accounts created via self-registration (manual or Gmail) can reset here.
            If your account was set up by an administrator, contact them for a reset link.
          </p>

          <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? (
              <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Sending...</>
            ) : 'Send Reset Link'}
          </motion.button>

          <Link to="/login" className="flex items-center justify-center gap-1 text-white hover:text-white text-sm transition-colors">
            <FiArrowLeft size={14} /> Back to Sign In
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}

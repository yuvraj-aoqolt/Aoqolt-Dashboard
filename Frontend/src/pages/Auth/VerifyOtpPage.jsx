import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from './AuthLayout'

export default function VerifyOtpPage() {
  const { verifyOtp, resendOtp, pendingEmail } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const email = pendingEmail || location.state?.email || ''
  const from  = location.state?.from  || '/services'

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const refs = useRef([])

  useEffect(() => {
    if (!email) { navigate('/register'); return }
    refs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 5) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text) {
      const next = text.split('').concat(Array(6).fill('')).slice(0, 6)
      setOtp(next)
      refs.current[Math.min(text.length, 5)]?.focus()
    }
    e.preventDefault()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter all 6 digits'); return }
    setLoading(true)
    try {
      await verifyOtp(email, code)
      toast.success('Email verified! Welcome to Aoqolt 🎉')
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Invalid OTP. Please try again.'
      toast.error(msg)
      setOtp(['', '', '', '', '', ''])
      refs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setResending(true)
    try {
      await resendOtp(email)
      toast.success('A new code has been sent to your email.')
      setCountdown(60)
    } catch {
      toast.error('Failed to resend OTP')
    } finally {
      setResending(false)
    }
  }

  // Mask the email for display: show first 2 chars + *** + domain
  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + b.replace(/./g, '*') + c)
    : ''

  return (
    <AuthLayout title="Verify Your Email" subtitle={`Enter the 6-digit code sent to ${maskedEmail}`}>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* OTP Boxes */}
        <div className="flex gap-3 justify-center" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <motion.input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all outline-none ${
                digit
                  ? 'border-red-500 bg-red-950/20 text-white shadow-lg shadow-red-900/20'
                  : 'border-white/10 bg-white/5 text-white focus:border-red-600 focus:bg-red-950/10'
              }`}
            />
          ))}
        </div>

        <motion.button
          type="submit"
          disabled={loading || otp.join('').length < 6}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              Verifying...
            </>
          ) : (
            'Verify OTP'
          )}
        </motion.button>

        <div className="text-center">
          <p className="text-white/40 text-sm">
            Didn't receive the code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || resending}
              className="text-red-400 hover:text-red-300 disabled:text-white/25 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {countdown > 0
                ? `Resend in ${countdown}s`
                : resending ? 'Sending...' : 'Resend OTP'}
            </button>
          </p>
          <p className="text-white/30 text-xs mt-2">Check your spam folder if you don't see it.</p>
        </div>
      </form>
    </AuthLayout>
  )
}

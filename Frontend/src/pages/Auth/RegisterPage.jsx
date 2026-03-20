import { useState } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiGlobe } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from './AuthLayout'

// ── PKCE helpers ────────────────────────────────────────────────────────────
function randomBase64(len) {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
async function sha256Base64url(plain) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain))
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export default function RegisterPage() {
  const { register: authRegister, socialLogin, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading]   = useState(false)
  const [yahooLoading, setYahooLoading]   = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const password = watch('password')

  // `from` can be a string (from ServicesPage via LoginPage) or a Location object
  const fromState = location.state?.from
  const from = typeof fromState === 'string'
    ? fromState
    : (fromState?.pathname || '/services')

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (values) => {
    setLoading(true)
    try {
      await authRegister({
        full_name: values.full_name,
        email: values.email,
        country_code: values.country_code || '+1',
        phone_number: values.phone_number,
        password: values.password,
        confirm_password: values.confirm_password,
      })
      toast.success('Account created! Please verify your phone number.')
      navigate('/verify-otp', { state: { phone: values.phone_number, from } })
    } catch (err) {
      const data = err.response?.data
      if (typeof data === 'object') {
        const first = Object.values(data)[0]
        toast.error(Array.isArray(first) ? first[0] : String(first))
      } else {
        toast.error('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true)
      try {
        await socialLogin('google', tokenResponse)
        toast.success('Welcome to Aoqolt.')
        navigate(from, { replace: true })
      } catch (err) {
        const msg = err.response?.data?.detail || err.response?.data?.error || 'Google sign-up failed.'
        toast.error(msg)
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => toast.error('Google sign-up was cancelled.'),
  })

  const handleAppleSignUp = async () => {
    setAppleLoading(true)
    try {
      window.AppleID.auth.init({
        clientId:    import.meta.env.VITE_APPLE_CLIENT_ID,
        redirectURI: `${window.location.origin}/register`,
        scope:       'name email',
        usePopup:    true,
      })
      const result = await window.AppleID.auth.signIn()
      await socialLogin('apple', result)
      toast.success('Welcome to Aoqolt.')
      navigate(from, { replace: true })
    } catch (err) {
      if (err?.error !== 'popup_closed_by_user') {
        const msg = err.response?.data?.error || 'Apple sign-up failed.'
        toast.error(msg)
      }
    } finally {
      setAppleLoading(false)
    }
  }

  const handleYahooSignUp = async () => {
    setYahooLoading(true)
    try {
      const state        = randomBase64(16)
      const codeVerifier = randomBase64(43)
      const codeChallenge = await sha256Base64url(codeVerifier)

      sessionStorage.setItem('yahoo_oauth_state',    state)
      sessionStorage.setItem('yahoo_code_verifier',  codeVerifier)
      sessionStorage.setItem('yahoo_redirect_to', from)

      const params = new URLSearchParams({
        client_id:             import.meta.env.VITE_YAHOO_CLIENT_ID,
        redirect_uri:          `${window.location.origin}/oauth/yahoo/callback`,
        response_type:         'code',
        scope:                 'openid email profile',
        state,
        code_challenge:        codeChallenge,
        code_challenge_method: 'S256',
      })
      window.location.href = `https://api.login.yahoo.com/oauth2/request_auth?${params}`
    } catch {
      toast.error('Yahoo sign-up failed.')
      setYahooLoading(false)
    }
  }

  return (
    <AuthLayout title="Create Account" subtitle="Join Aoqolt and begin your spiritual journey">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
        {/* Full Name */}
        <div>
          <label className="block text-white/60 text-xs uppercase tracking-wider mb-1">Full Name</label>
          <div className="relative">
            <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              {...register('full_name', { required: 'Full name is required', minLength: { value: 2, message: 'At least 2 chars' } })}
              placeholder="Your full name"
              className="input-field pl-10"
            />
          </div>
          {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-white/60 text-xs uppercase tracking-wider mb-1">Email</label>
          <div className="relative">
            <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              {...register('email', { required: 'Email required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })}
              type="email"
              placeholder="you@example.com"
              className="input-field pl-10"
            />
          </div>
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-white/60 text-xs uppercase tracking-wider mb-1">Phone Number</label>
          <div className="flex gap-2">
            <div className="relative w-28">
              <FiGlobe className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <input
                {...register('country_code')}
                defaultValue="+1"
                placeholder="+1"
                className="input-field pl-8 text-sm"
              />
            </div>
            <div className="relative flex-1">
              <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
              <input
                {...register('phone_number', { required: 'Phone is required', pattern: { value: /^\d{7,15}$/, message: 'Invalid phone' } })}
                placeholder="1234567890"
                className="input-field pl-10"
              />
            </div>
          </div>
          {errors.phone_number && <p className="text-red-400 text-xs mt-1">{errors.phone_number.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-white/60 text-xs uppercase tracking-wider mb-1">Password</label>
          <div className="relative">
            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              {...register('password', {
                required: 'Password required',
                minLength: { value: 8, message: 'Min 8 characters' },
                pattern: { value: /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, message: 'Must contain uppercase, number and special char' },
              })}
              type={showPw ? 'text' : 'password'}
              placeholder="Min 8 chars, uppercase, number, symbol"
              className="input-field pl-10 pr-10"
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
              {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-white/60 text-xs uppercase tracking-wider mb-1">Confirm Password</label>
          <div className="relative">
            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              {...register('confirm_password', {
                required: 'Please confirm password',
                validate: (v) => v === password || 'Passwords do not match',
              })}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat password"
              className="input-field pl-10 pr-10"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
              {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          </div>
          {errors.confirm_password && <p className="text-red-400 text-xs mt-1">{errors.confirm_password.message}</p>}
        </div>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={!loading ? { scale: 1.02 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
          className="w-full btn-primary py-2.5 mt-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </motion.button>

        <p className="text-center text-white/40 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-red-400 hover:text-red-300 font-medium transition-colors">Sign in</Link>
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 !mt-2 !mb-0">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Social sign-up — icon-only row */}
        <div className="flex items-center justify-center gap-4">
          {/* Google */}
          <motion.button
            type="button"
            onClick={() => handleGoogleSignUp()}
            disabled={googleLoading || loading}
            whileHover={!googleLoading && !loading ? { scale: 1.08 } : {}}
            whileTap={!googleLoading && !loading ? { scale: 0.94 } : {}}
            title="Continue with Google"
            className="flex items-center justify-center w-12 h-12 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              : <FcGoogle size={22} />}
          </motion.button>

          {/* Apple */}
          <motion.button
            type="button"
            onClick={handleAppleSignUp}
            disabled={appleLoading || loading}
            whileHover={!appleLoading && !loading ? { scale: 1.08 } : {}}
            whileTap={!appleLoading && !loading ? { scale: 0.94 } : {}}
            title="Continue with Apple"
            className="flex items-center justify-center w-12 h-12 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {appleLoading
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              : <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>}
          </motion.button>

          {/* Yahoo */}
          <motion.button
            type="button"
            onClick={handleYahooSignUp}
            disabled={yahooLoading || loading}
            whileHover={!yahooLoading && !loading ? { scale: 1.08 } : {}}
            whileTap={!yahooLoading && !loading ? { scale: 0.94 } : {}}
            title="Continue with Yahoo"
            className="flex items-center justify-center w-12 h-12 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {yahooLoading
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              : <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#6001D2]" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M3 2l5.5 8.5L3 18h3.5l3.25-5.25L13 18h3.5l-5.5-7.5L16.5 2H13l-3.25 5.25L6.5 2zm13.5 11c0 2.21 1.79 4 4 4s4-1.79 4-4-1.79-4-4-4-4 1.79-4 4z"/></svg>}
          </motion.button>
        </div>
      </form>
    </AuthLayout>
  )
}

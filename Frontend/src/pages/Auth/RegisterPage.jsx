import { useState } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { useGoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
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

function RegisterPageInner() {
  const { register: authRegister, socialLogin, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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
      toast.success('Account created! Please check your email for the verification code.')
      navigate('/verify-otp', { state: { email: values.email, from } })
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
        toast.success('Welcome to Aoqolt! 🎉')
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
    <AuthLayout title="Sign up" subtitle="Create your account to get started">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Full Name */}
        <div>
          <input
            {...register('full_name', { required: 'Full name is required', minLength: { value: 2, message: 'At least 2 chars' } })}
            placeholder="Name*"
            className="input-field"
            style={{ paddingLeft: '1rem' }}
          />
          {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <div className="flex gap-2">
            <div className="relative">
              <select
                {...register('country_code')}
                defaultValue="+1"
                className="input-field appearance-none pr-7 text-sm"
                style={{ paddingLeft: '0.75rem', width: '90px' }}
              >
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+91">+91</option>
                <option value="+61">+61</option>
                <option value="+49">+49</option>
                <option value="+33">+33</option>
                <option value="+55">+55</option>
                <option value="+86">+86</option>
                <option value="+81">+81</option>
                <option value="+82">+82</option>
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <input
              {...register('phone_number', { required: 'Phone is required', pattern: { value: /^\d{7,15}$/, message: 'Invalid phone' } })}
              placeholder="Phone*"
              className="input-field flex-1"
              style={{ paddingLeft: '1rem' }}
            />
          </div>
          {errors.phone_number && <p className="text-red-400 text-xs mt-1">{errors.phone_number.message}</p>}
        </div>

        {/* Email */}
        <div>
          <input
            {...register('email', { required: 'Email required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })}
            type="email"
            placeholder="Email*"
            className="input-field"
            style={{ paddingLeft: '1rem' }}
          />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <div className="relative">
            <input
              {...register('password', {
                required: 'Password required',
                minLength: { value: 8, message: 'Min 8 characters' },
                pattern: { value: /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, message: 'Must contain uppercase, number and special char' },
              })}
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              className="input-field pr-10"
              style={{ paddingLeft: '1rem' }}
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
              {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-red-400 text-xs mt-1 text-right">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <div className="relative">
            <input
              {...register('confirm_password', {
                required: 'Please confirm password',
                validate: (v) => v === password || 'Passwords do not match',
              })}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm password"
              className="input-field pr-10"
              style={{ paddingLeft: '1rem' }}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
              {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          </div>
          {errors.confirm_password && <p className="text-red-400 text-xs mt-1 text-right">{errors.confirm_password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 mt-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</>
          ) : (
            'Create account'
          )}
        </button>

        <button
          type="button"
          className="w-full py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-all flex items-center justify-center gap-2"
        >
          Continue as Guest
        </button>

        <p className="text-center text-white/50 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-red-400 hover:text-red-300 font-medium transition-colors">Log in</Link>
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Social sign-up — icon-only row */}
        <div className="flex items-center justify-center gap-4">
          {/* Google */}
          <button
            type="button"
            onClick={() => handleGoogleSignUp()}
            disabled={googleLoading || loading}
            title="Continue with Google"
            className="flex items-center justify-center w-12 h-12 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <FcGoogle size={22} />}
          </button>

          {/* Microsoft */}
          {/* <button
            type="button"
            title="Continue with Microsoft"
            className="flex items-center justify-center w-12 h-12 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
          >
            <svg viewBox="0 0 21 21" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
          </button> */}
        </div>
      </form>
    </AuthLayout>
  )
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function RegisterPage() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <RegisterPageInner />
    </GoogleOAuthProvider>
  )
}

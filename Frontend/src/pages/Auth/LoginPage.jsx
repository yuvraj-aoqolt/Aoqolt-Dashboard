import { useState, useRef } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { useGoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { useAuth } from '../../context/AuthContext'
import { bookingsAPI } from '../../api'
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

function LoginPageInner() {
  const { login, socialLogin, guestLogin, isAuthenticated, isAdmin, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [yahooLoading, setYahooLoading]   = useState(false)
  const [guestLoading, setGuestLoading]   = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm()
  // Prevents the auth guard below from firing mid-login while navigateAfterLogin
  // is still awaiting the initiate API call. Without this, React re-renders
  // LoginPage with isAuthenticated=true during the await, which triggers <Navigate
  // to={from}> and causes an intermediate route flash (black screen) before /booking/:token.
  const isLoggingIn = useRef(false)

  // Compute `from` FIRST — before the auth guard.
  // `from` can be a string (ServicesPage/HomePage) or a Location object (ProtectedRoute).
  const fromState = location.state?.from
  const from = typeof fromState === 'string'
    ? fromState
    : (fromState?.pathname || '/services')
  const serviceId = location.state?.serviceId || null

  // Determine where to send the user based on their role after login
  // API envelope: { success, message, data: { user: { role }, tokens } }
  const getDestination = (responseData) => {
    const role =
      responseData?.data?.user?.role ||
      responseData?.user?.role ||
      responseData?.role
    if (role === 'superadmin') return '/superadmin'
    if (role === 'admin') return '/admin'
    return from
  }

  // After login: if a serviceId was passed in state, skip the detail page and
  // go straight to the booking form; otherwise use the normal destination.
  const navigateAfterLogin = async (responseData) => {
    const dest = getDestination(responseData)
    if (dest !== from) {
      // admin / superadmin — always go to their dashboard
      navigate(dest, { replace: true })
      return
    }
    if (serviceId) {
      try {
        const { data } = await bookingsAPI.initiate(serviceId)
        const bookingToken = data.data?.token || data.token
        navigate(`/booking/${bookingToken}`, { replace: true })
      } catch {
        // fallback to the service page if initiation fails
        navigate(from, { replace: true })
      }
    } else {
      navigate(dest, { replace: true })
    }
  }

  const onSubmit = async ({ email, password }) => {
    isLoggingIn.current = true
    setLoading(true)
    try {
      const data = await login(email, password)
      toast.success('Welcome back!')
      await navigateAfterLogin(data)
    } catch (err) {
      isLoggingIn.current = false
      const raw = err.response?.data
      // Backend shape: { success, error: { error: ["msg"] } } or { detail: "msg" }
      const errObj = raw?.error
      const msg =
        raw?.detail ||
        (typeof errObj === 'string' ? errObj : null) ||
        (Array.isArray(errObj) ? errObj[0] : null) ||
        (typeof errObj?.error === 'string' ? errObj.error : null) ||
        (Array.isArray(errObj?.error) ? errObj.error[0] : null) ||
        'Invalid email or password.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Guard: already logged in ────────────────────────────────────────────
  // Placed HERE — after all hook calls — so the hook count never changes
  // between renders regardless of auth state (Rules of Hooks).
  // useGoogleLogin below MUST be called before any early return.
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      isLoggingIn.current = true
      setGoogleLoading(true)
      try {
        const data = await socialLogin('google', tokenResponse)
        toast.success('Welcome back!')
        await navigateAfterLogin(data)
      } catch (err) {
        isLoggingIn.current = false
        const msg = err.response?.data?.detail || err.response?.data?.error || 'Google sign-in failed.'
        toast.error(msg)
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => toast.error('Google sign-in was cancelled.'),
  })

  const handleGuestLogin = async () => {
    isLoggingIn.current = true
    setGuestLoading(true)
    try {
      await guestLogin()
      toast.success('Continuing as guest')
      if (serviceId) {
        const { data } = await bookingsAPI.initiate(serviceId)
        const token = data.data?.token || data.token
        navigate(`/booking/${token}`, { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      isLoggingIn.current = false
      const msg = err.response?.data?.error || 'Could not start guest session.'
      toast.error(msg)
    } finally {
      setGuestLoading(false)
    }
  }

  // const handleYahooLogin = async () => {
  //   setYahooLoading(true)
  //   try {
  //     const state        = randomBase64(16)
  //     const codeVerifier = randomBase64(43)
  //     const codeChallenge = await sha256Base64url(codeVerifier)

  //     sessionStorage.setItem('yahoo_oauth_state',    state)
  //     sessionStorage.setItem('yahoo_code_verifier',  codeVerifier)
  //     sessionStorage.setItem('yahoo_redirect_to', from)
  //     if (serviceId) sessionStorage.setItem('yahoo_service_id', serviceId)

  //     const params = new URLSearchParams({
  //       client_id:             import.meta.env.VITE_YAHOO_CLIENT_ID,
  //       redirect_uri:          `${window.location.origin}/oauth/yahoo/callback`,
  //       response_type:         'code',
  //       scope:                 'openid email profile',
  //       state,
  //       code_challenge:        codeChallenge,
  //       code_challenge_method: 'S256',
  //     })
  //     window.location.href = `https://api.login.yahoo.com/oauth2/request_auth?${params}`
  //   } catch {
  //     toast.error('Yahoo sign-in failed.')
  //     setYahooLoading(false)
  //   }
  // }

  // All hooks have been called above — now safe to do an early redirect.
  if (!isLoggingIn.current && isAuthenticated) {
    const dest = isSuperAdmin ? '/superadmin' : isAdmin ? '/admin' : from
    return <Navigate to={dest} replace />
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to access your account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Email */}
        <div>
          <input
            {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/, message: 'Invalid email' } })}
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
              {...register('password', { required: 'Password is required' })}
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="input-field pr-10"
              style={{ paddingLeft: '1rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
            >
              {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-white/50 hover:text-white/80 text-xs transition-colors">
            Forgot password ?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
          ) : (
            'Sign in'
          )}
        </button>

        <p className="text-center text-white/50 text-sm">
          Don't have an account?{' '}
          <Link to="/register" state={{ from: fromState }} className="text-red-400 hover:text-red-300 font-medium transition-colors">
            Create one
          </Link>
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Social sign-in — icon-only row */}
        <div className="flex items-center justify-center gap-4">
          {/* Google */}
          <button
            type="button"
            onClick={() => handleGoogleLogin()}
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

        {/* Guest access */}
        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={guestLoading || loading}
          className="w-full py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {guestLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Continue as Guest'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function LoginPage() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginPageInner />
    </GoogleOAuthProvider>
  )
}

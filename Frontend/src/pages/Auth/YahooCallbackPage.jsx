import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

/**
 * Yahoo OAuth2 PKCE callback handler.
 * Yahoo redirects here after the user authorises. This page:
 *   1. Validates the `state` param against sessionStorage
 *   2. Exchanges the `code` + `code_verifier` for an access token
 *   3. Calls socialLogin('yahoo', { access_token })
 *   4. Redirects the user to their destination
 */
export default function YahooCallbackPage() {
  const { socialLogin } = useAuth()
  const navigate = useNavigate()
  const { search } = useLocation()
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    const params   = new URLSearchParams(search)
    const code     = params.get('code')
    const state    = params.get('state')
    const error    = params.get('error')

    if (error) {
      toast.error('Yahoo sign-in was cancelled.')
      navigate('/login', { replace: true })
      return
    }

    if (!code || !state) {
      toast.error('Invalid Yahoo callback.')
      navigate('/login', { replace: true })
      return
    }

    const storedState    = sessionStorage.getItem('yahoo_oauth_state')
    const codeVerifier   = sessionStorage.getItem('yahoo_code_verifier')
    const redirectTo     = sessionStorage.getItem('yahoo_redirect_to') || '/dashboard'

    sessionStorage.removeItem('yahoo_oauth_state')
    sessionStorage.removeItem('yahoo_code_verifier')
    sessionStorage.removeItem('yahoo_redirect_to')

    if (state !== storedState) {
      toast.error('OAuth state mismatch. Please try again.')
      navigate('/login', { replace: true })
      return
    }

    const clientId    = import.meta.env.VITE_YAHOO_CLIENT_ID
    const redirectUri = `${window.location.origin}/oauth/yahoo/callback`

    // Exchange code for access token (PKCE — no client_secret required)
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     clientId,
      redirect_uri:  redirectUri,
      code,
      code_verifier: codeVerifier,
    })

    fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Token exchange failed')
        return res.json()
      })
      .then(async (tokens) => {
        await socialLogin('yahoo', { access_token: tokens.access_token })
        toast.success('Welcome!')
        navigate(redirectTo, { replace: true })
      })
      .catch((err) => {
        console.error('Yahoo OAuth error:', err)
        toast.error('Yahoo sign-in failed. Please try again.')
        navigate('/login', { replace: true })
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-white/20 border-t-red-500 rounded-full mx-auto mb-4"
        />
        <p className="text-white/60 text-sm">Completing Yahoo sign-in…</p>
      </div>
    </div>
  )
}

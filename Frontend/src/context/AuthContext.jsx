import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI, accountsAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingPhone, setPendingPhone] = useState(null)   // used during OTP flow

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchProfile = useCallback(async () => {
    try {
      // /accounts/users/me/ returns full UserSerializer (email, role, full_name, etc.)
      const { data } = await accountsAPI.me()
      setUser(data.data || data)
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    // Backend envelope: { success, message, data: { user, tokens } }
    const payload = data.data || data
    localStorage.setItem('access_token', payload.tokens?.access || payload.access)
    localStorage.setItem('refresh_token', payload.tokens?.refresh || payload.refresh)
    await fetchProfile()
    return data
  }

  const register = async (payload) => {
    const { data } = await authAPI.register(payload)
    setPendingPhone(payload.phone_number)
    return data
  }

  const verifyOtp = async (phone_number, otp_code) => {
    const { data } = await authAPI.verifyOtp({ phone_number, otp_code })
    // Backend envelope: { success, message, data: { user, tokens } }
    const payload = data.data || data
    if (payload.tokens) {
      localStorage.setItem('access_token', payload.tokens.access)
      localStorage.setItem('refresh_token', payload.tokens.refresh)
      await fetchProfile()
    }
    setPendingPhone(null)
    return data
  }

  const resendOtp = async (phone_number) => {
    const { data } = await authAPI.resendOtp({ phone_number })
    return data
  }

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) await authAPI.logout({ refresh })
    } catch { /* ok */ }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  const socialLogin = async (provider, tokenResponse) => {
    let email, full_name, social_id, access_token

    if (provider === 'google') {
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      })
      if (!infoRes.ok) throw new Error('Failed to fetch Google user info')
      const userInfo = await infoRes.json()
      email      = userInfo.email
      full_name  = userInfo.name
      social_id  = userInfo.sub
      access_token = tokenResponse.access_token

    } else if (provider === 'apple') {
      // Apple returns a signed id_token JWT — decode the payload to get sub & email
      const idToken = tokenResponse.authorization?.id_token
      if (!idToken) throw new Error('Apple id_token missing')
      const jwtPayload = JSON.parse(
        atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      )
      social_id    = jwtPayload.sub
      email        = jwtPayload.email || tokenResponse.user?.email
      // Apple only sends name on first sign-in
      const nameObj = tokenResponse.user?.name
      full_name    = nameObj
        ? `${nameObj.firstName || ''} ${nameObj.lastName || ''}`.trim()
        : (email || social_id)
      access_token = idToken

    } else if (provider === 'yahoo') {
      // tokenResponse = { access_token } from the PKCE exchange performed in YahooCallbackPage
      const infoRes = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      })
      if (!infoRes.ok) throw new Error('Failed to fetch Yahoo user info')
      const userInfo = await infoRes.json()
      email        = userInfo.email
      full_name    = userInfo.name
      social_id    = userInfo.sub
      access_token = tokenResponse.access_token

    } else {
      throw new Error(`Unsupported provider: ${provider}`)
    }

    const { data } = await authAPI.socialLogin({
      provider,
      access_token,
      email,
      full_name,
      social_id,
    })
    const payload = data.data || data
    localStorage.setItem('access_token', payload.tokens?.access || payload.access)
    localStorage.setItem('refresh_token', payload.tokens?.refresh || payload.refresh)
    await fetchProfile()
    return data
  }

  const updateProfile = async (payload) => {
    const { data } = await accountsAPI.updateProfile(payload)
    setUser(data)
    return data
  }

  const isAuthenticated = !!user
  const isClient     = user?.role === 'client'
  const isAdmin      = user?.role === 'admin'
  const isSuperAdmin = user?.role === 'superadmin'

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        pendingPhone,
        isAuthenticated,
        isClient,
        isAdmin,
        isSuperAdmin,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        socialLogin,
        updateProfile,
        fetchProfile,
        setPendingPhone,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

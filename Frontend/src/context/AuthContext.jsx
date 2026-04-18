import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authAPI, accountsAPI } from '../api'

const AuthContext = createContext(null)

export const PROFILE_QUERY_KEY = ['auth', 'profile']

export function AuthProvider({ children }) {
  const [pendingPhone, setPendingPhone] = useState(null)
  const [pendingEmail, setPendingEmail] = useState(null)
  const queryClient = useQueryClient()

  // ── Profile query: runs on mount, skips network if no token ───────────────
  const { data: user, isLoading: loading } = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const token = localStorage.getItem('access_token')
      if (!token) return null
      try {
        const { data } = await accountsAPI.me()
        return data.data || data
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        return null
      }
    },
    retry: false,
    staleTime: Infinity,  // We manage profile invalidation manually
    gcTime: Infinity,
  })

  // ── Internal: fetch profile and push it into the query cache ──────────────
  const setProfile = useCallback(async () => {
    const { data } = await accountsAPI.me()
    const profile = data.data || data
    queryClient.setQueryData(PROFILE_QUERY_KEY, profile)
    return profile
  }, [queryClient])

  // ── Login ─────────────────────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const { data } = await authAPI.login({ email, password })
      const payload = data.data || data
      localStorage.setItem('access_token', payload.tokens?.access || payload.access)
      localStorage.setItem('refresh_token', payload.tokens?.refresh || payload.refresh)
      await setProfile()
      return data
    },
  })
  const login = (email, password) => loginMutation.mutateAsync({ email, password })

  // ── Register ──────────────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await authAPI.register(payload)
      // Track the email for the OTP verify page (email OTP, not phone)
      setPendingEmail(payload.email)
      setPendingPhone(payload.phone_number)
      return data
    },
  })
  const register = (payload) => registerMutation.mutateAsync(payload)

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, otp_code }) => {
      const { data } = await authAPI.verifyOtp({ email, otp_code })
      const payload = data.data || data
      if (payload.tokens) {
        localStorage.setItem('access_token', payload.tokens.access)
        localStorage.setItem('refresh_token', payload.tokens.refresh)
        await setProfile()
      }
      setPendingEmail(null)
      setPendingPhone(null)
      return data
    },
  })
  const verifyOtp = (email, otp_code) =>
    verifyOtpMutation.mutateAsync({ email, otp_code })

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const resendOtpMutation = useMutation({
    mutationFn: async (email) => {
      const { data } = await authAPI.resendOtp({ email })
      return data
    },
  })
  const resendOtp = (email) => resendOtpMutation.mutateAsync(email)

  // ── Logout ────────────────────────────────────────────────────────────────
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        const refresh = localStorage.getItem('refresh_token')
        if (refresh) await authAPI.logout({ refresh })
      } catch { /* ok */ }
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      // Clear user from cache; other protected queries are unmounted by the router redirect
      queryClient.setQueryData(PROFILE_QUERY_KEY, null)
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'services' })
    },
  })
  const logout = () => logoutMutation.mutateAsync()

  // ── Social Login ──────────────────────────────────────────────────────────
  const socialLoginMutation = useMutation({
    mutationFn: async ({ provider, tokenResponse }) => {
      let email, full_name, social_id, access_token

      if (provider === 'google') {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        if (!infoRes.ok) throw new Error('Failed to fetch Google user info')
        const userInfo = await infoRes.json()
        email        = userInfo.email
        full_name    = userInfo.name
        social_id    = userInfo.sub
        access_token = tokenResponse.access_token
      } else if (provider === 'yahoo') {
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
        provider, access_token, email, full_name, social_id,
      })
      const payload = data.data || data
      localStorage.setItem('access_token', payload.tokens?.access || payload.access)
      localStorage.setItem('refresh_token', payload.tokens?.refresh || payload.refresh)
      await setProfile()
      return data
    },
  })
  const socialLogin = (provider, tokenResponse) =>
    socialLoginMutation.mutateAsync({ provider, tokenResponse })

  // ── Update Profile ────────────────────────────────────────────────────────
  const updateProfileMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await accountsAPI.updateProfile(payload)
      queryClient.setQueryData(PROFILE_QUERY_KEY, data)
      return data
    },
  })
  const updateProfile = (payload) => updateProfileMutation.mutateAsync(payload)

  // ── Guest Login ───────────────────────────────────────────────────────────
  const guestLoginMutation = useMutation({
    mutationFn: async () => {
      const { data } = await authAPI.guestLogin()
      const payload = data.data || data
      localStorage.setItem('access_token', payload.tokens?.access || payload.access)
      localStorage.setItem('refresh_token', payload.tokens?.refresh || payload.refresh)
      await setProfile()
      return data
    },
  })
  const guestLogin = () => guestLoginMutation.mutateAsync()

  // ── Manual profile refresh (used by some pages) ───────────────────────────
  const fetchProfile = useCallback(() =>
    queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
  [queryClient])

  const isAuthenticated = !!user
  const isGuest      = !!user?.is_guest
  const isClient     = user?.role === 'client'
  const isAdmin      = user?.role === 'admin'
  const isSuperAdmin = user?.role === 'superadmin'

  const val = useMemo(() => ({
    user,
    loading,
    pendingPhone,
    pendingEmail,
    isAuthenticated,
    isGuest,
    isClient,
    isAdmin,
    isSuperAdmin,
    login,
    guestLogin,
    register,
    verifyOtp,
    resendOtp,
    logout,
    socialLogin,
    updateProfile,
    fetchProfile,
    setPendingPhone,
    setPendingEmail,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, loading, pendingPhone, pendingEmail, fetchProfile])

  return (
    <AuthContext.Provider value={val}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { servicesAPI } from '../api'

const ServicesContext = createContext(null)

const CACHE_KEY = 'aoqolt_services_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(CACHE_KEY); return null }
    return data
  } catch { return null }
}

function setCache(data) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

// Routes that never need the services list — skip the fetch there
const SKIP_FETCH_PREFIXES = [
  '/login', '/register', '/verify-otp', '/forgot-password',
  '/reset-password', '/invite', '/admin-reset', '/oauth',
  '/admin', '/superadmin',
]

// Module-level guard: prevents a second concurrent request during React Strict
// Mode's double-effect invocation. dedupGet in api/index.js is the primary
// dedup, but this stops setLoading/setServices being called twice as well.
let _fetchInProgress = false

export function ServicesProvider({ children }) {
  const [services, setServices] = useState(() => getCached() || [])
  const [loading, setLoading] = useState(() => !getCached())
  const [error, setError] = useState(null)

  const doFetch = useCallback(async () => {
    if (_fetchInProgress) return
    _fetchInProgress = true
    setLoading(true)
    try {
      const { data } = await servicesAPI.list()
      const list = Array.isArray(data) ? data : data.data || data.results || []
      setServices(list)
      setCache(list)
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || err.message
      setError(msg)
    } finally {
      setLoading(false)
      _fetchInProgress = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Re-evaluate cache inside the effect — not captured from outer scope —
    // so the second Strict Mode mount correctly sees data cached by the first.
    if (getCached()) { setLoading(false); return }
    const path = window.location.pathname
    const skip = SKIP_FETCH_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))
    if (skip) { setLoading(false); return }
    doFetch()
  }, [doFetch])

  // Exposed for manual refresh (e.g. retry on error). Busts cache then re-fetches.
  const fetchServices = useCallback(async () => {
    sessionStorage.removeItem(CACHE_KEY)
    _fetchInProgress = false
    await doFetch()
  }, [doFetch])

  const getServiceById = (id) => services.find((s) => s.id === id)

  return (
    <ServicesContext.Provider value={{ services, loading, error, fetchServices, getServiceById }}>
      {children}
    </ServicesContext.Provider>
  )
}

export function useServices() {
  const ctx = useContext(ServicesContext)
  if (!ctx) throw new Error('useServices must be used inside ServicesProvider')
  return ctx
}

import { createContext, useContext, useState, useEffect } from 'react'
import { servicesAPI } from '../api'

const ServicesContext = createContext(null)

export function ServicesProvider({ children }) {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const { data } = await servicesAPI.list()
      // Backend returns { success, count, data: [...] } envelope
      setServices(Array.isArray(data) ? data : data.data || data.results || [])
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || err.message
      console.error('[ServicesContext] fetch failed:', err.response?.status, msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

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

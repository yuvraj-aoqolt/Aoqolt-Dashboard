import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight, FiClock, FiCheck, FiLoader } from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'
import { FiEye, FiUsers } from 'react-icons/fi'
import { useServices } from '../../context/ServicesContext'
import { useAuth } from '../../context/AuthContext'
import { bookingsAPI } from '../../api'
import toast from 'react-hot-toast'

const SERVICE_ICONS = {
  single_aura: <FiEye size={32} />,
  family_aura: <FiUsers size={32} />,
  astrology: <GiCrystalBall size={32} />,
}

const SERVICE_COLORS = {
  single_aura: 'from-red-900/50 to-rose-950/30',
  family_aura: 'from-red-900/40 to-orange-950/30',
  astrology:   'from-red-900/40 to-purple-950/30',
}

const SERVICE_BORDER = {
  single_aura: 'border-red-900/40 hover:border-red-600/50',
  family_aura: 'border-red-900/40 hover:border-orange-600/30',
  astrology:   'border-red-900/40 hover:border-purple-600/30',
}

export default function ServicesPage() {
  const { services, loading, error, fetchServices } = useServices()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [bookingLoadingId, setBookingLoadingId] = useState(null)

  const handleSelectService = async (service) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/services/${service.id}`, serviceId: service.id } })
      return
    }
    setBookingLoadingId(service.id)
    try {
      const { data } = await bookingsAPI.initiate(service.id)
      const payload = data.data || data
      if (!payload.token) {
        toast.error('Failed to generate booking link. Please try again.')
        return
      }
      navigate(`/booking/${payload.token}`)
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.error || 'Failed to start booking. Please try again.'
      toast.error(typeof msg === 'string' ? msg : 'Failed to start booking.')
    } finally {
      setBookingLoadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-dark pt-24 pb-20">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          {/* <span className="relative inline-flex items-center gap-2 text-sm text-red-500 uppercase tracking-widest font-medium bg-red-950/30 border border-red-900/40 rounded-full px-4 py-1.5 mb-6">
            ✦ Our Services
          </span> */}
          <h1 className="font-display text-6xl sm:text-7xl font-bold text-white mb-5">
            Our <span className="gradient-text">Services</span>
          </h1>
          <p className="text-white text-xl max-w-xl mx-auto leading-relaxed">
            Each reading is performed by experienced
            practitioners dedicated to your growth and healing.
          </p>
        </motion.div>
      </div>

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <ServicesLoading />
        ) : error ? (
          <ErrorServices error={error} />
        ) : services.length === 0 ? (
          <EmptyServices />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, i) => (
              <ServiceCard
                key={service.id}
                service={service}
                index={i}
                onBook={() => handleSelectService(service)}
                isLoading={bookingLoadingId === service.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="max-w-5xl mx-auto px-4 mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center"
        >
          {[
            { icon: '🔒', label: 'Secure Payments', desc: 'All transactions are fully encrypted and protected' },
            { icon: '✨', label: 'Expert Readers', desc: 'Vetted practitioners with years of experience' },
            { icon: '💬', label: 'Direct Chat', desc: 'Communicate directly with your assigned reader' },
          ].map((item, i) => (
            <div key={i}>
              <div className="text-4xl mb-2">{item.icon}</div>
              <p className="text-white font-medium text-lg mb-1">{item.label}</p>
              <p className="text-white text-md">{item.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

function ServiceCard({ service, index, onBook, isLoading }) {
  const colorClass = SERVICE_COLORS[service.service_type] || 'from-red-900/40 to-red-950/20'
  const borderClass = SERVICE_BORDER[service.service_type] || 'border-red-900/40 hover:border-red-600/50'
  const icon = SERVICE_ICONS[service.service_type] || <GiCrystalBall size={32} />

  const rawPrice = service.price_display
    ? service.price_display.replace(/\.00$/, '')
    : `$${Math.round(service.price / 100)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.6 }}
      whileHover={{ y: -6 }}
      className={`relative glass rounded-2xl border ${borderClass} overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-red-950/30`}
    >
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

      <div className="relative z-10 p-8">
        {/* Icon */}
        <div className="w-16 h-16 bg-red-950/50 border border-red-900/40 rounded-2xl flex items-center justify-center text-red-500 mb-6 group-hover:shadow-lg group-hover:shadow-red-900/30 group-hover:bg-red-900/40 transition-all duration-300">
          {icon}
        </div>

        {/* Content */}
        <h3 className="font-display text-2xl font-semibold text-white mb-2">{service.name}</h3>
        <p className="text-white text-lg leading-relaxed mb-6 line-clamp-3">
          {service.short_description || service.description}
        </p>

        {/* Features */}
        {service.features && service.features.length > 0 && (
          <ul className="space-y-2 mb-6">
            {service.features.slice(0, 4).map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-white text-sm">
                <FiCheck size={12} className="text-red-500 mt-0.5 shrink-0" />
                {f.feature_text}
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div>
            <p className="text-white font-bold text-3xl">{rawPrice}</p>
            <p className="text-white/60 text-xs mt-0.5">US Dollar + 5% GST</p>
            {service.duration_days && (
              <p className="text-white text-sm flex items-center gap-1 mt-0.5">
                <FiClock size={11} />
                {service.duration_days} day delivery
              </p>
            )}
          </div>

          <motion.button
            onClick={onBook}
            disabled={isLoading}
            whileHover={!isLoading ? { scale: 1.05 } : {}}
            whileTap={!isLoading ? { scale: 0.95 } : {}}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white text-base font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-red-900/40 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <><FiLoader size={14} className="animate-spin" /> Preparing...</>
            ) : (
              <>Book Now <FiArrowRight size={14} /></>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

function ServicesLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass rounded-2xl border border-red-900/20 p-8 animate-pulse">
          <div className="w-16 h-16 bg-red-900/20 rounded-2xl mb-6" />
          <div className="h-5 bg-white/5 rounded mb-3 w-3/4" />
          <div className="h-3 bg-white/5 rounded mb-2" />
          <div className="h-3 bg-white/5 rounded mb-2 w-5/6" />
          <div className="h-3 bg-white/5 rounded w-4/6 mb-8" />
          <div className="flex justify-between items-center pt-4 border-t border-white/5">
            <div className="h-7 bg-white/5 rounded w-20" />
            <div className="h-9 bg-red-900/20 rounded-xl w-28" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyServices() {
  return (
    <div className="text-center py-20">
      <GiCrystalBall size={64} className="text-red-900/40 mx-auto mb-6" />
      <p className="text-white text-xl">No services available at this time.</p>
      <p className="text-white text-base mt-2">Please check back soon.</p>
    </div>
  )
}

function ErrorServices({ error }) {
  const { fetchServices } = useServices()
  return (
    <div className="text-center py-20">
      <GiCrystalBall size={64} className="text-red-900/40 mx-auto mb-6" />
      <p className="text-white text-xl">Could not load services.</p>
      <p className="text-red-500/60 text-sm mt-2 mb-6 font-mono">{error}</p>
      <button onClick={fetchServices}
        className="btn-primary px-6 py-2.5 text-base">
        Retry
      </button>
    </div>
  )
}

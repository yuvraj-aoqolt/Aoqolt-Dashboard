import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowLeft, FiArrowRight, FiCheck, FiClock } from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'
import { servicesAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import LoadingScreen from '../../components/LoadingScreen'

export default function ServiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    servicesAPI.detail(id)
      .then(({ data }) => setService(data.data || data))
      .catch(() => navigate('/services'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingScreen />
  if (!service) return null

  const priceDisplay = service.price_display || `$${(service.price / 100).toFixed(2)}`

  const handleBook = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/booking/${service.id}` } })
    } else {
      navigate(`/booking/${service.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.button
          onClick={() => navigate('/services')}
          whileHover={{ x: -4 }}
          className="flex items-center gap-2 text-white/40 hover:text-white/80 text-sm mb-8 transition-colors"
        >
          <FiArrowLeft size={16} />
          Back to Services
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl border border-red-900/30 p-8 sm:p-12"
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-8">
            <div className="w-20 h-20 bg-red-950/50 border border-red-900/40 rounded-2xl flex items-center justify-center text-red-400 shrink-0">
              <GiCrystalBall size={36} />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">{service.name}</h1>
              <p className="text-white/40 text-sm flex items-center gap-2">
                <FiClock size={13} />
                {service.duration_days} day delivery
              </p>
            </div>
          </div>

          <p className="text-white/60 leading-relaxed mb-8 text-base">{service.description}</p>

          {service.features?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-white font-semibold mb-4 uppercase tracking-wider text-xs">What's Included</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {service.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-white/55 text-sm">
                    <FiCheck size={14} className="text-red-500 mt-0.5 shrink-0" />
                    {f.feature_text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {service.requirements?.length > 0 && (
            <div className="mb-8 p-5 bg-red-950/20 border border-red-900/20 rounded-xl">
              <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Requirements</h3>
              <ul className="space-y-2">
                {service.requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-white/50 text-sm">
                    <span className="text-red-500 mt-0.5">•</span>
                    {r.requirement_text}
                    {r.is_mandatory && <span className="text-red-500 text-xs">(required)</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Price</p>
              <p className="text-white font-bold text-3xl">{priceDisplay}</p>
            </div>
            <motion.button
              onClick={handleBook}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-semibold px-10 py-4 rounded-xl shadow-lg shadow-red-900/40 transition-all duration-300 text-base"
            >
              Book This Service
              <FiArrowRight size={18} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

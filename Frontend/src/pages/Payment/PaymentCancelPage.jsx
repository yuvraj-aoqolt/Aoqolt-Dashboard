import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiX, FiArrowRight } from 'react-icons/fi'
import Navbar from '../../components/Navbar'

export default function PaymentCancelPage() {
  const [params] = useSearchParams()
  const bookingId = params.get('booking')

  return (
    <div className="min-h-screen bg-dark">
      <Navbar />
      <div className="pt-24 flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 bg-red-950/30 border border-red-900/40 rounded-full flex items-center justify-center mx-auto mb-8">
            <FiX size={40} className="text-red-500" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-3">Payment Cancelled</h1>
          <p className="text-white/50 mb-8 leading-relaxed">
            Your payment was cancelled. Your booking is saved — you can complete payment from your bookings.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard/bookings">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                className="btn-primary flex items-center gap-2 px-8 py-3.5">
                My Bookings <FiArrowRight size={16} />
              </motion.button>
            </Link>
            <Link to="/services">
              <button className="text-white/50 hover:text-white/80 text-sm transition-colors px-8 py-3.5 border border-white/10 hover:border-white/20 rounded-xl">
                Browse Services
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

import { useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCheck, FiMail, FiArrowRight } from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

export default function BookingSuccessPage() {
  const { state } = useLocation()
  const bookingRef = state?.bookingRef

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-24">
        <div className="w-full max-w-lg">

          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-red-900/10 rounded-full blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 160, damping: 18 }}
            className="relative text-center"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
              className="w-28 h-28 bg-gradient-to-br from-red-900/40 to-red-950/20 border border-red-700/40 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-red-900/30"
            >
              <FiCheck size={48} className="text-red-400" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-3">
                You're All Set!
              </h1>

              <p className="text-white/50 text-base mb-2 leading-relaxed">
                Your booking and details have been submitted successfully.
              </p>

              {bookingRef && (
                <p className="text-white/30 text-sm font-mono mb-8">
                  Booking ID:{' '}
                  <span className="text-white/60 bg-white/5 px-2 py-0.5 rounded-lg">
                    {bookingRef}
                  </span>
                </p>
              )}

              {/* Email notice */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="glass rounded-2xl border border-white/5 p-6 mb-8 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-950/50 border border-red-900/30 rounded-xl flex items-center justify-center shrink-0">
                    <FiMail size={18} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm mb-1.5">
                      Confirmation Email Sent
                    </p>
                    <p className="text-white/45 text-sm leading-relaxed">
                      Your payment receipt and booking confirmation have been sent to your
                      registered email address. Please check your inbox (and spam folder).
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* What happens next */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="glass rounded-2xl border border-white/5 p-6 mb-10 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-950/50 border border-red-900/30 rounded-xl flex items-center justify-center shrink-0">
                    <GiCrystalBall size={18} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm mb-1.5">What Happens Next?</p>
                    <ul className="text-white/45 text-sm leading-relaxed space-y-1.5">
                      <li>• Our practitioners will review your submitted details.</li>
                      <li>• If any information needs clarification, we will reach out to you.</li>
                      <li>• Your session will be processed within the committed timeframe.</li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* CTA */}
              <Link to="/">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary inline-flex items-center gap-2 px-10 py-4"
                >
                  Back to Home <FiArrowRight size={16} />
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

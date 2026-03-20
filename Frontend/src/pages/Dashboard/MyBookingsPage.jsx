import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight, FiCheckCircle, FiClock, FiXCircle, FiCreditCard } from 'react-icons/fi'
import { bookingsAPI, paymentsAPI } from '../../api'
import DashboardLayout from './DashboardLayout'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  pending:         { label: 'Pending',         color: 'bg-yellow-900/30 text-yellow-400 border-yellow-900/40',  icon: <FiClock size={12} /> },
  payment_pending: { label: 'Payment Pending', color: 'bg-orange-900/30 text-orange-400 border-orange-900/40', icon: <FiCreditCard size={12} /> },
  completed:       { label: 'Completed',       color: 'bg-green-900/30 text-green-400 border-green-900/40',    icon: <FiCheckCircle size={12} /> },
  cancelled:       { label: 'Cancelled',       color: 'bg-red-900/30 text-red-400 border-red-900/40',          icon: <FiXCircle size={12} /> },
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(null)

  useEffect(() => {
    bookingsAPI.myBookings()
      .then(({ data }) => setBookings(data.data || data.results || (Array.isArray(data) ? data : [])))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false))
  }, [])

  const handlePay = async (booking) => {
    setPaying(booking.id)
    try {
      const { data } = await paymentsAPI.createCheckout({
        booking_id: booking.id,
        success_url: `${window.location.origin}/payment/success?booking=${booking.id}`,
        cancel_url: `${window.location.origin}/payment/cancel?booking=${booking.id}`,
      })
      const url = data.checkout_url || data.url || data.redirect_url || data.session_url
      if (url) window.location.href = url
    } catch {
      toast.error('Failed to initiate payment')
    } finally {
      setPaying(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white mb-1">My Bookings</h1>
          <p className="text-white/40 text-sm">All your service bookings</p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl border border-white/5 p-5 animate-pulse">
                <div className="flex justify-between mb-3">
                  <div className="h-4 bg-white/5 rounded w-32" />
                  <div className="h-6 bg-white/5 rounded w-24 rounded-full" />
                </div>
                <div className="h-3 bg-white/5 rounded w-48" />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl border border-white/5">
            <p className="text-white/30 text-5xl mb-4">📋</p>
            <p className="text-white/40 font-medium">No bookings yet</p>
            <p className="text-white/25 text-sm mt-1 mb-6">Start by booking a service</p>
            <Link to="/services">
              <button className="btn-primary px-6 py-2.5 text-sm">Browse Services</button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking, i) => {
              const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="glass rounded-2xl border border-white/5 hover:border-red-900/20 p-5 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-white font-semibold">{booking.booking_id}</p>
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      <p className="text-white/50 text-sm">{booking.service_name || booking.service?.name}</p>
                      <p className="text-white/25 text-xs mt-1">
                        {new Date(booking.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {booking.status === 'payment_pending' && (
                        <button
                          onClick={() => handlePay(booking)}
                          disabled={paying === booking.id}
                          className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60"
                        >
                          <FiCreditCard size={14} />
                          {paying === booking.id ? 'Loading...' : 'Pay Now'}
                        </button>
                      )}
                      {booking.case_id && (
                        <Link to={`/dashboard/cases/${booking.case_id}`}>
                          <button className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-sm border border-white/10 hover:border-white/20 px-3 py-2 rounded-lg transition-all">
                            View Case <FiArrowRight size={13} />
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

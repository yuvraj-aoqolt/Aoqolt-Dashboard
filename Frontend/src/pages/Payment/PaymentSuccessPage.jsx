import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCheck, FiLoader } from 'react-icons/fi'
import Navbar from '../../components/Navbar'
import { bookingsAPI } from '../../api'

export default function PaymentSuccessPage() {
  const [params] = useSearchParams()
  const bookingId = params.get('booking')
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying | confirmed | error

  useEffect(() => {
    if (!bookingId) { navigate('/'); return }
    const isCancelled = { value: false }

    const tryFetch = async () => {
      if (isCancelled.value) return false
      try {
        const { data } = await bookingsAPI.detail(bookingId)
        const booking = data.data || data
        // Payment is confirmed once status is no longer 'payment_pending'
        if (booking.status && booking.status !== 'payment_pending') {
          if (!isCancelled.value) {
            setStatus('confirmed')
            // Navigate using the form2 token so the URL is single-use and secure
            const form2Token = booking.form2_token
            const destination = form2Token
              ? `/booking-form/${form2Token}`
              : `/booking-form/${bookingId}`
            setTimeout(() => {
              if (!isCancelled.value) {
                navigate(destination, { replace: true })
              }
            }, 2000)
          }
          return true
        }
      } catch {}
      return false
    }

    ;(async () => {
      for (let i = 0; i < 6; i++) {
        if (isCancelled.value) break
        if (i > 0) await new Promise((r) => setTimeout(r, 2000))
        if (await tryFetch()) break
        if (i === 5 && !isCancelled.value) {
          // After all retries, fall back to services so the user can try again
          setStatus('confirmed')
          setTimeout(() => {
            if (!isCancelled.value) navigate('/services', { replace: true })
          }, 1500)
        }
      }
    })()

    return () => { isCancelled.value = true }
  }, [bookingId, navigate])

  return (
    <div className="min-h-screen bg-dark">
      <Navbar />
      <div className="pt-24 flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 bg-green-900/30 border border-green-700/40 rounded-full flex items-center justify-center mx-auto mb-8"
          >
            {status === 'confirmed' ? (
              <FiCheck size={40} className="text-green-400" />
            ) : (
              <FiLoader size={36} className="text-green-400 animate-spin" />
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            {status === 'confirmed' ? (
              <>
                <h1 className="font-display text-4xl font-bold text-white mb-3">Payment Confirmed!</h1>
                <p className="text-white/50 mb-6">Redirecting you to fill in your session details…</p>
              </>
            ) : (
              <>
                <h1 className="font-display text-3xl font-bold text-white mb-3">Verifying Payment…</h1>
                <p className="text-white/50">Please wait a moment while we confirm your payment.</p>
              </>
            )}
            {bookingId && (
              <p className="text-white/25 text-sm mt-4">Booking ID: {bookingId}</p>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

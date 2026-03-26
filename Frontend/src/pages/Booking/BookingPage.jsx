import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  FiUser, FiMail, FiPhone, FiMapPin, FiGlobe, FiFileText,
  FiArrowRight, FiArrowLeft, FiCheck, FiClock
} from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'
import { bookingsAPI, paymentsAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import LoadingScreen from '../../components/LoadingScreen'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

export default function BookingPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tokenError, setTokenError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm()

  // Validate token and load service details
  useEffect(() => {
    if (!token) {
      navigate('/services')
      return
    }
    bookingsAPI.validateBookingToken(token)
      .then(({ data }) => {
        if (data.success) {
          setService(data.service)
        } else {
          const code = data.code
          if (code === 'USED') {
            setTokenError('This booking link has already been used.')
          } else if (code === 'EXPIRED') {
            setTokenError('This booking link has expired. Please start a new booking.')
          } else {
            setTokenError('This booking link is invalid.')
          }
        }
      })
      .catch((err) => {
        const code = err.response?.data?.code
        if (code === 'USED') {
          setTokenError('This booking link has already been used.')
        } else if (code === 'EXPIRED') {
          setTokenError('This booking link has expired. Please start a new booking.')
        } else {
          setTokenError('This booking link is invalid.')
        }
      })
      .finally(() => setLoading(false))
  }, [token])

  // Pre-fill from user profile
  useEffect(() => {
    if (user) {
      setValue('full_name', user.full_name || '')
      setValue('email', user.email || '')
      setValue('phone_country_code', user.country_code || '+1')
      setValue('phone_number', user.phone_number || '')
      setValue('address', user.address || '')
      setValue('city', user.city || '')
      setValue('state', user.state || '')
      setValue('country', user.country || '')
      setValue('postal_code', user.postal_code || '')
    }
  }, [user, setValue])

  if (loading) return <LoadingScreen />

  // Show a clear, user-friendly message for invalid/used/expired tokens
  if (tokenError) {
    return (
      <div className="min-h-screen bg-dark">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-950/40 border border-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiArrowLeft size={28} className="text-red-400" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-3">Booking Link Unavailable</h2>
            <p className="text-white/50 mb-8">{tokenError}</p>
            <button
              onClick={() => navigate('/services')}
              className="btn-primary px-8 py-3"
            >
              Browse Services
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const onSubmit = async (values) => {
    setSubmitting(true)
    try {
      // 1. Create booking — token is consumed server-side on success
      const { data: bookingRes } = await bookingsAPI.create({
        booking_token: token,
        full_name: values.full_name,
        email: values.email,
        phone_country_code: values.phone_country_code || '+1',
        phone_number: values.phone_number,
        address: values.address,
        city: values.city,
        state: values.state || '',
        country: values.country,
        postal_code: values.postal_code,
        special_note: values.special_note || '',
      })

      // Backend wraps response: { success, message, data: { id, ... } }
      const booking = bookingRes.data || bookingRes

      toast.success('Booking created! Redirecting to payment...')

      // 2. Create payment checkout session
      const { data: paymentRes } = await paymentsAPI.createCheckout({
        booking_id: booking.id,
        success_url: `${window.location.origin}/payment/success?booking=${booking.id}`,
        cancel_url: `${window.location.origin}/payment/cancel?booking=${booking.id}`,
      })

      // Backend may also wrap payment response
      const payment = paymentRes.data || paymentRes

      // Redirect to checkout
      if (payment.checkout_url || payment.url || payment.redirect_url) {
        window.location.href = payment.checkout_url || payment.url || payment.redirect_url
      } else if (payment.session_url) {
        window.location.href = payment.session_url
      } else {
        // Fallback: go to dashboard
        toast.success('Booking confirmed!')
        navigate('/dashboard/bookings')
      }
    } catch (err) {
      const data = err.response?.data
      // Backend error envelope: { success: false, error: { field: [...] } }
      const errObj = data?.error || data
      if (errObj && typeof errObj === 'object') {
        const msgs = Object.entries(errObj)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
          .join('\n')
        toast.error(msgs || 'Booking failed')
      } else {
        toast.error('Booking failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const priceDisplay = service?.price_display || `$${((service?.price || 0) / 100).toFixed(2)}`

  return (
    <div className="min-h-screen bg-dark">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <button onClick={() => navigate('/services')}
              className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
              <FiArrowLeft size={15} /> Back to Services
            </button>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
              Book Your Session
            </h1>
            <p className="text-white/40">Fill in your details to confirm your booking</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form — 2/3 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <form onSubmit={handleSubmit(onSubmit)} className="glass rounded-2xl border border-red-900/20 p-8 space-y-6">
                <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                  <FiUser size={18} className="text-red-500" />
                  Personal Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Full Name" error={errors.full_name?.message} icon={<FiUser size={15} />}>
                    <input {...register('full_name', { required: 'Required' })} placeholder="Your full name" className="input-field pl-9" />
                  </Field>

                  <Field label="Email" error={errors.email?.message} icon={<FiMail size={15} />}>
                    <input {...register('email', { required: 'Required', pattern: { value: /^\S+@\S+$/, message: 'Invalid email' } })} type="email" placeholder="you@example.com" className="input-field pl-9" />
                  </Field>

                  <div>
                    <label className="block text-white/60 text-xs uppercase tracking-wider mb-1.5">Phone Number</label>
                    <div className="flex">
                      <div className="relative shrink-0">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"><FiPhone size={15} /></span>
                        <input
                          {...register('phone_country_code', { required: 'Required' })}
                          placeholder="+1"
                          className="input-field pl-9 !w-20 !rounded-r-none !border-r-0"
                        />
                      </div>
                      <input
                        {...register('phone_number', { required: 'Required' })}
                        placeholder="Phone number"
                        className="input-field flex-1 min-w-0 !rounded-l-none"
                      />
                    </div>
                    {(errors.phone_country_code || errors.phone_number) && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.phone_country_code?.message || errors.phone_number?.message}
                      </p>
                    )}
                  </div>

                  <Field label="Country" error={errors.country?.message} icon={<FiGlobe size={15} />}>
                    <input {...register('country', { required: 'Required' })} placeholder="Your country" className="input-field pl-9" />
                  </Field>

                  <Field label="City" error={errors.city?.message} icon={<FiMapPin size={15} />}>
                    <input {...register('city', { required: 'Required' })} placeholder="Your city" className="input-field pl-9" />
                  </Field>

                  <Field label="State / Province" error={errors.state?.message} icon={<FiMapPin size={15} />}>
                    <input {...register('state')} placeholder="State or province" className="input-field pl-9" />
                  </Field>

                  <Field label="Postal Code" error={errors.postal_code?.message} icon={<FiMapPin size={15} />}>
                    <input {...register('postal_code', { required: 'Required' })} placeholder="Postal code" className="input-field pl-9" />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-white/60 text-xs uppercase tracking-wider mb-1.5">Street Address</label>
                  <div className="relative">
                    <FiMapPin className="absolute left-3.5 top-3.5 text-white/30" size={15} />
                    <textarea
                      {...register('address', { required: 'Address is required' })}
                      rows={2}
                      placeholder="Full street address"
                      className="input-field pl-9 resize-none"
                    />
                  </div>
                  {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address.message}</p>}
                </div>

                <div>
                  <label className="block text-white/60 text-xs uppercase tracking-wider mb-1.5">
                    Special Notes <span className="text-white/25 font-normal normal-case">(optional)</span>
                  </label>
                  <div className="relative">
                    <FiFileText className="absolute left-3.5 top-3.5 text-white/30" size={15} />
                    <textarea
                      {...register('special_note')}
                      rows={3}
                      maxLength={900}
                      placeholder="Any specific requests or information you'd like us to know..."
                      className="input-field pl-9 resize-none"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={!submitting ? { scale: 1.02 } : {}}
                  whileTap={!submitting ? { scale: 0.98 } : {}}
                  className="w-full btn-primary py-4 flex items-center justify-center gap-2 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Proceed to Payment
                      <FiArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>

            {/* Summary — 1/3 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="glass rounded-2xl border border-red-900/20 p-6 sticky top-24">
                <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Order Summary</h3>

                <div className="flex items-start gap-4 mb-6 pb-6 border-b border-white/5">
                  <div className="w-12 h-12 bg-red-950/40 border border-red-900/30 rounded-xl flex items-center justify-center text-red-400 shrink-0">
                    <GiCrystalBall size={22} />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{service?.name}</p>
                    <p className="text-white/40 text-xs mt-1 flex items-center gap-1">
                      <FiClock size={11} />
                      {service?.duration_days} day delivery
                    </p>
                  </div>
                </div>

                {service?.features?.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <FiCheck size={13} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-white/40 text-xs">{f.feature_text}</p>
                  </div>
                ))}

                <div className="mt-6 pt-5 border-t border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white/40 text-sm">Service</span>
                    <span className="text-white text-sm">{priceDisplay}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 text-sm">Processing</span>
                    <span className="text-white/40 text-sm">$0.00</span>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                    <span className="text-white font-semibold">Total</span>
                    <span className="text-red-400 font-bold text-xl">{priceDisplay}</span>
                  </div>
                </div>

                <div className="mt-5 p-3 bg-green-950/20 border border-green-900/20 rounded-lg">
                  <p className="text-green-400/70 text-xs flex items-center gap-2">
                    <FiCheck size={12} />
                    Secure encrypted payment
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function Field({ label, error, icon, children }) {
  return (
    <div>
      <label className="block text-white/60 text-xs uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">{icon}</span>
        {children}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

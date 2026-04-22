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

const COUNTRY_CODES = [
  { code: '+1', label: '+1 United States' },
  { code: '+7', label: '+7 Russia' },
  { code: '+20', label: '+20 Egypt' },
  { code: '+27', label: '+27 South Africa' },
  { code: '+30', label: '+30 Greece' },
  { code: '+31', label: '+31 Netherlands' },
  { code: '+32', label: '+32 Belgium' },
  { code: '+33', label: '+33 France' },
  { code: '+34', label: '+34 Spain' },
  { code: '+36', label: '+36 Hungary' },
  { code: '+39', label: '+39 Italy' },
  { code: '+40', label: '+40 Romania' },
  { code: '+41', label: '+41 Switzerland' },
  { code: '+43', label: '+43 Austria' },
  { code: '+44', label: '+44 United Kingdom' },
  { code: '+45', label: '+45 Denmark' },
  { code: '+46', label: '+46 Sweden' },
  { code: '+47', label: '+47 Norway' },
  { code: '+48', label: '+48 Poland' },
  { code: '+49', label: '+49 Germany' },
  { code: '+51', label: '+51 Peru' },
  { code: '+52', label: '+52 Mexico' },
  { code: '+53', label: '+53 Cuba' },
  { code: '+54', label: '+54 Argentina' },
  { code: '+55', label: '+55 Brazil' },
  { code: '+56', label: '+56 Chile' },
  { code: '+57', label: '+57 Colombia' },
  { code: '+58', label: '+58 Venezuela' },
  { code: '+60', label: '+60 Malaysia' },
  { code: '+61', label: '+61 Australia' },
  { code: '+62', label: '+62 Indonesia' },
  { code: '+63', label: '+63 Philippines' },
  { code: '+64', label: '+64 New Zealand' },
  { code: '+65', label: '+65 Singapore' },
  { code: '+66', label: '+66 Thailand' },
  { code: '+81', label: '+81 Japan' },
  { code: '+82', label: '+82 South Korea' },
  { code: '+84', label: '+84 Vietnam' },
  { code: '+86', label: '+86 China' },
  { code: '+90', label: '+90 Turkey' },
  { code: '+91', label: '+91 India' },
  { code: '+92', label: '+92 Pakistan' },
  { code: '+93', label: '+93 Afghanistan' },
  { code: '+94', label: '+94 Sri Lanka' },
  { code: '+95', label: '+95 Myanmar' },
  { code: '+98', label: '+98 Iran' },
  { code: '+212', label: '+212 Morocco' },
  { code: '+213', label: '+213 Algeria' },
  { code: '+216', label: '+216 Tunisia' },
  { code: '+218', label: '+218 Libya' },
  { code: '+220', label: '+220 Gambia' },
  { code: '+221', label: '+221 Senegal' },
  { code: '+224', label: '+224 Guinea' },
  { code: '+225', label: '+225 Ivory Coast' },
  { code: '+233', label: '+233 Ghana' },
  { code: '+234', label: '+234 Nigeria' },
  { code: '+237', label: '+237 Cameroon' },
  { code: '+251', label: '+251 Ethiopia' },
  { code: '+254', label: '+254 Kenya' },
  { code: '+255', label: '+255 Tanzania' },
  { code: '+256', label: '+256 Uganda' },
  { code: '+260', label: '+260 Zambia' },
  { code: '+263', label: '+263 Zimbabwe' },
  { code: '+351', label: '+351 Portugal' },
  { code: '+352', label: '+352 Luxembourg' },
  { code: '+353', label: '+353 Ireland' },
  { code: '+354', label: '+354 Iceland' },
  { code: '+358', label: '+358 Finland' },
  { code: '+380', label: '+380 Ukraine' },
  { code: '+381', label: '+381 Serbia' },
  { code: '+385', label: '+385 Croatia' },
  { code: '+386', label: '+386 Slovenia' },
  { code: '+389', label: '+389 North Macedonia' },
  { code: '+420', label: '+420 Czech Republic' },
  { code: '+421', label: '+421 Slovakia' },
  { code: '+880', label: '+880 Bangladesh' },
  { code: '+961', label: '+961 Lebanon' },
  { code: '+962', label: '+962 Jordan' },
  { code: '+963', label: '+963 Syria' },
  { code: '+964', label: '+964 Iraq' },
  { code: '+965', label: '+965 Kuwait' },
  { code: '+966', label: '+966 Saudi Arabia' },
  { code: '+967', label: '+967 Yemen' },
  { code: '+968', label: '+968 Oman' },
  { code: '+970', label: '+970 Palestine' },
  { code: '+971', label: '+971 UAE' },
  { code: '+972', label: '+972 Israel' },
  { code: '+973', label: '+973 Bahrain' },
  { code: '+974', label: '+974 Qatar' },
  { code: '+975', label: '+975 Bhutan' },
  { code: '+976', label: '+976 Mongolia' },
  { code: '+977', label: '+977 Nepal' },
  { code: '+992', label: '+992 Tajikistan' },
  { code: '+994', label: '+994 Azerbaijan' },
  { code: '+995', label: '+995 Georgia' },
  { code: '+996', label: '+996 Kyrgyzstan' },
  { code: '+998', label: '+998 Uzbekistan' },
]
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
            <p className="text-white mb-8">{tokenError}</p>
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
      // Backend custom exception handler wraps errors as:
      // { success: false, error: { message: string, details: { field: [...] } } }
      const errEnvelope = data?.error
      if (errEnvelope) {
        const details = errEnvelope.details
        if (details && typeof details === 'object' && Object.keys(details).length > 0) {
          const msgs = Object.entries(details)
            .map(([, v]) => Array.isArray(v) ? v[0] : v)
            .join('\n')
          toast.error(msgs || errEnvelope.message || 'Booking failed')
        } else {
          toast.error(errEnvelope.message || 'Booking failed')
        }
      } else {
        toast.error('Booking failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const rawPrice = service?.price_display
    ? service.price_display.replace(/\.00$/, '')
    : `$${Math.round((service?.price || 0) / 100)}`

  return (
    <div className="min-h-screen bg-dark">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <button onClick={() => navigate('/services')}
              className="flex items-center gap-2 text-white hover:text-white text-sm mb-6 transition-colors">
              <FiArrowLeft size={15} /> Back to Services
            </button>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
              Book Your Session
            </h1>
            <p className="text-white">Fill in your details to confirm your booking</p>
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
                    <input {...register('full_name', { required: 'Required' })} placeholder="Your full name" className="input-field pl-10" />
                  </Field>

                  <Field label="Email" error={errors.email?.message} icon={<FiMail size={15} />}>
                    <input {...register('email', { required: 'Required', pattern: { value: /^\S+@\S+$/, message: 'Invalid email' } })} type="email" placeholder="you@example.com" className="input-field pl-10" />
                  </Field>

                  <div>
                    <label className="block text-white text-xs uppercase tracking-wider mb-1.5">Phone Number</label>
                    <div className="flex items-center h-11 rounded-lg border border-[var(--color-input-border-focus)] bg-[var(--color-input-bg)] focus-within:border-[var(--color-primary)] focus-within:shadow-[0_0_0_3px_var(--color-input-glow-focus)] transition-all duration-300 overflow-hidden">
                      <span className="pl-3.5 text-white shrink-0"><FiPhone size={15} /></span>
                      <select
                        {...register('phone_country_code', { required: 'Required' })}
                        defaultValue="+1"
                        className="h-full bg-transparent text-white text-sm pl-2 pr-1 border-none outline-none appearance-none cursor-pointer shrink-0 w-[2rem]"
                        style={{ background: 'transparent' }}
                      >
                        {COUNTRY_CODES.map(({ code, label }) => (
                          <option key={code} value={code} className="bg-[#0a0a0a] text-white">{label}</option>
                        ))}
                      </select>
                      <span className="w-px self-stretch bg-white/10 mx-1 shrink-0" />
                      <input
                        {...register('phone_number', { required: 'Required' })}
                        placeholder="Phone number"
                        className="flex-1 h-full bg-transparent text-white text-sm px-3 border-none outline-none placeholder:text-white min-w-0"
                      />
                    </div>
                    {(errors.phone_country_code || errors.phone_number) && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.phone_country_code?.message || errors.phone_number?.message}
                      </p>
                    )}
                  </div>

                  <Field label="Country" error={errors.country?.message} icon={<FiGlobe size={15} />}>
                    <input {...register('country', { required: 'Required' })} placeholder="Your country" className="input-field pl-10" />
                  </Field>

                  <Field label="City" error={errors.city?.message} icon={<FiMapPin size={15} />}>
                    <input {...register('city', { required: 'Required' })} placeholder="Your city" className="input-field pl-10" />
                  </Field>

                  <Field label="State / Province" error={errors.state?.message} icon={<FiMapPin size={15} />}>
                    <input {...register('state')} placeholder="State or province" className="input-field pl-10" />
                  </Field>

                  <Field label="Postal Code" error={errors.postal_code?.message} icon={<FiMapPin size={15} />}>
                    <input {...register('postal_code', { required: 'Required' })} placeholder="Postal code" className="input-field pl-10" />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-white text-xs uppercase tracking-wider mb-1.5">Street Address</label>
                  <div className="relative">
                    <FiMapPin className="absolute left-3.5 top-3.5 text-white" size={15} />
                    <textarea
                      {...register('address', { required: 'Address is required' })}
                      rows={2}
                      placeholder="Full street address"
                      className="input-field pl-10 resize-none"
                    />
                  </div>
                  {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address.message}</p>}
                </div>

                <div>
                  <label className="block text-white text-xs uppercase tracking-wider mb-1.5">
                    Special Notes <span className="text-white font-normal normal-case">(optional)</span>
                  </label>
                  <div className="relative">
                    <FiFileText className="absolute left-3.5 top-3.5 text-white" size={15} />
                    <textarea
                      {...register('special_note')}
                      rows={3}
                      maxLength={900}
                      placeholder="Any specific requests or information you'd like us to know..."
                      className="input-field pl-10 resize-none"
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

                <div className="flex items-start gap-4 mb-2 pb-2  border-white/5">
                  <div className="w-12 h-12 bg-red-950/40 border border-red-900/30 rounded-xl flex items-center justify-center text-red-400 shrink-0">
                    <GiCrystalBall size={22} />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{service?.name}</p>
                  </div>
                </div>

                {service?.features?.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <FiCheck size={13} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-white text-xs">{f.feature_text}</p>
                  </div>
                ))}

                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white text-sm">Service</span>
                    <span className="text-white text-sm">{rawPrice}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm">Tax</span>
                    <span className="text-white text-sm">Will be included</span>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                    <span className="text-white font-semibold">Total</span>
                    <div>
                      <span className="text-red-400 font-bold text-xl">{rawPrice}</span>
                      <p className="text-white text-xs mt-0.5">US Dollar + 5% GST</p>
                    </div>
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
      <label className="block text-white text-xs uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white">{icon}</span>
        {children}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

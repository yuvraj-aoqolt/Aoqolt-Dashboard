import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  FiMapPin, FiCamera, FiPlus, FiTrash2, FiArrowRight, FiUser, FiUsers,
  FiCheck
} from 'react-icons/fi'
import { bookingsAPI } from '../../api'
import LoadingScreen from '../../components/LoadingScreen'
import Navbar from '../../components/Navbar'

export default function DetailsFormPage() {
  const { form2Token } = useParams()
  const navigate = useNavigate()

  const [booking, setBooking] = useState(null)
  const [bookingId, setBookingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [mainImage, setMainImage] = useState(null)
  const [memberImages, setMemberImages] = useState({})
  const [photoError, setPhotoError] = useState(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      family_members: [{ name: '', relation: '', dob: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'family_members' })

  useEffect(() => {
    if (!form2Token) {
      navigate('/')
      return
    }
    bookingsAPI
      .getByForm2Token(form2Token)
      .then(({ data }) => {
        const b = data.data || data
        setBooking(b)
        setBookingId(b.id)
      })
      .catch((err) => {
        const code = err.response?.data?.code
        if (code === 'ALREADY_SUBMITTED') {
          toast.success('Your details have already been submitted.')
          navigate('/dashboard/bookings', { replace: true })
        } else {
          toast.error('Form link is invalid or has expired.')
          navigate('/', { replace: true })
        }
      })
      .finally(() => setLoading(false))
  }, [form2Token, navigate])

  if (loading) return <LoadingScreen />
  if (!booking) return null

  const serviceType = booking?.service?.service_type || booking?.selected_service
  const isFamilyAura = serviceType === 'family_aura'
  const serviceName = booking?.service?.name || 'Session'
  const bookingRef = booking?.booking_id

  const onSubmit = async (values) => {
    // Validate photo required for single aura
    if (!isFamilyAura && !mainImage) {
      setPhotoError('A photo is required for this service')
      return
    }
    setPhotoError(null)
    setSubmitting(true)
    try {
      // Build details payload
      let detailsPayload = {}

      if (isFamilyAura) {
        detailsPayload = {
          birth_date: values.birth_date,
          birth_time: values.birth_time,
          birth_place: values.birth_place,
          family_member_count: fields.length,
          family_member_details: values.family_members.map((m) => ({
            name: m.name,
            relation: m.relation,
            dob: m.dob || null,
          })),
        }
      } else {
        detailsPayload = {
          custom_data: {
            full_name: values.full_name,
            mother_name: values.mother_name,
            current_city: values.current_city,
            marital_status: values.marital_status,
            scan_focus: values.scan_focus,
          },
        }
      }

      await bookingsAPI.addDetails(bookingId, detailsPayload)

      // Upload main photo
      if (mainImage) {
        const fd = new FormData()
        fd.append('file', mainImage)
        fd.append('file_type', 'image')
        fd.append('description', 'main_photo')
        await bookingsAPI.uploadAttachment(bookingId, fd)
      }

      // Upload family member photos
      if (isFamilyAura) {
        for (const [idx, img] of Object.entries(memberImages)) {
          if (img) {
            const fd = new FormData()
            fd.append('file', img)
            fd.append('file_type', 'image')
            fd.append('description', `family_member:${idx}`)
            await bookingsAPI.uploadAttachment(bookingId, fd)
          }
        }
      }

      toast.success('Details submitted!')
      navigate('/booking/success', {
        replace: true,
        state: { bookingId, bookingRef },
      })
    } catch (err) {
      const errData = err.response?.data
      const msg =
        errData?.error
          ? typeof errData.error === 'string'
            ? errData.error
            : JSON.stringify(errData.error)
          : 'Submission failed. Please try again.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-900/30 text-green-400 border border-green-800/30 rounded-full px-3 py-1">
                <FiCheck size={11} /> Payment Confirmed
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
              {isFamilyAura ? 'Family Details' : 'Your Details'}
            </h1>
            <p className="text-white/40">
              Please fill in the required information to complete your{' '}
              <span className="text-white/60">{serviceName}</span> session.
            </p>
            {bookingRef && (
              <p className="text-white/25 text-sm mt-2 font-mono">Booking: {bookingRef}</p>
            )}
          </motion.div>

          {/* Steps indicator */}
          <div className="flex items-center gap-3 mb-10">
            {['Booking', 'Payment', 'Details'].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 text-xs font-medium ${i === 2 ? 'text-red-400' : 'text-green-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs
                    ${i === 2 ? 'border-red-600/50 bg-red-950/50 text-red-400' : 'border-green-700/40 bg-green-900/30 text-green-400'}`}>
                    {i < 2 ? <FiCheck size={10} /> : i + 1}
                  </div>
                  {step}
                </div>
                {i < 2 && <div className="w-8 h-px bg-white/10" />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

            {/* ── Primary / Solo Person Details ─────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl border border-red-900/20 p-8"
            >
              <h2 className="text-white font-semibold text-base mb-6 flex items-center gap-2">
                <FiUser size={16} className="text-red-500" />
                {isFamilyAura ? 'Primary Person Details' : 'Your Personal Details'}
              </h2>

              {!isFamilyAura ? (
                <div className="space-y-5">
                  {/* Full Name */}
                  <Field label="Full Name *" error={errors.full_name?.message}>
                    <div className="relative">
                      <FiUser className="absolute left-3.5 top-3.5 text-white/30" size={15} />
                      <input
                        {...register('full_name', { required: 'Full name is required' })}
                        placeholder="Your full name"
                        className="input-field pl-9"
                      />
                    </div>
                  </Field>

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">
                      Your Photo *
                    </label>
                    <ImageUpload value={mainImage} onChange={(f) => { setMainImage(f); setPhotoError(null) }} id="main-photo" />
                    <p className="text-white/40 text-xs mt-2 flex items-start gap-1.5">
                      <FiCamera size={11} className="mt-0.5 shrink-0 text-amber-400/70" />
                      <span>Make sure the photo is <span className="text-amber-400/80">straight</span> and there are <span className="text-amber-400/80">no glasses</span> on your face.</span>
                    </p>
                    {photoError && <p className="text-red-400 text-xs mt-1">{photoError}</p>}
                  </div>

                  {/* Mother's Name */}
                  <Field label="Mother's Name *" error={errors.mother_name?.message}>
                    <input
                      {...register('mother_name', { required: "Mother's name is required" })}
                      placeholder="Your mother's full name"
                      className="input-field"
                    />
                  </Field>

                  {/* Current City */}
                  <Field label="Current City of Residence *" error={errors.current_city?.message}>
                    <div className="relative">
                      <FiMapPin className="absolute left-3.5 top-3.5 text-white/30" size={15} />
                      <input
                        {...register('current_city', { required: 'Current city is required' })}
                        placeholder="City where you currently live"
                        className="input-field pl-9"
                      />
                    </div>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Marital Status */}
                    <Field label="Marital Status *" error={errors.marital_status?.message}>
                      <select
                        {...register('marital_status', { required: 'Marital status is required' })}
                        className="input-field"
                      >
                        <option value="">Select status…</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </Field>

                    {/* Scan Focus */}
                    <Field label="Main Aspects to Focus *" error={errors.scan_focus?.message}>
                      <input
                        {...register('scan_focus', { required: 'Please specify the main aspect to focus on' })}
                        placeholder="e.g. Health, Finance, Career…"
                        className="input-field"
                      />
                    </Field>
                  </div>
                </div>
              ) : (
                /* Family Aura — birth details */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Date of Birth *" error={errors.birth_date?.message}>
                    <input
                      type="date"
                      {...register('birth_date', { required: 'Date of birth is required' })}
                      className="input-field"
                    />
                  </Field>

                  <Field label="Time of Birth *" error={errors.birth_time?.message}>
                    <input
                      type="time"
                      {...register('birth_time', { required: 'Time of birth is required' })}
                      className="input-field"
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Place of Birth *" error={errors.birth_place?.message}>
                      <div className="relative">
                        <FiMapPin className="absolute left-3.5 top-3.5 text-white/30" size={15} />
                        <input
                          {...register('birth_place', { required: 'Place of birth is required' })}
                          placeholder="City, Country"
                          className="input-field pl-9"
                        />
                      </div>
                    </Field>
                  </div>

                  {/* Photo upload */}
                  <div className="sm:col-span-2 mt-1">
                    <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">
                      Your Photo / Aura Image
                    </label>
                    <ImageUpload value={mainImage} onChange={setMainImage} id="main-photo" />
                  </div>
                </div>
              )}
            </motion.div>

            {/* ── Family Members (family_aura only) ─────────────────────── */}
            {isFamilyAura && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl border border-red-900/20 p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-white font-semibold text-base flex items-center gap-2">
                    <FiUsers size={16} className="text-red-500" />
                    Family Members
                    <span className="text-white/30 text-xs font-normal">({fields.length})</span>
                  </h2>
                  <motion.button
                    type="button"
                    onClick={() => append({ name: '', relation: '', dob: '' })}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-700/50 rounded-xl px-4 py-2 transition-all"
                  >
                    <FiPlus size={15} /> Add Member
                  </motion.button>
                </div>

                {fields.length === 0 && (
                  <p className="text-white/30 text-sm text-center py-6 border border-dashed border-white/10 rounded-xl">
                    No family members added yet. Click "Add Member" to add one.
                  </p>
                )}

                <AnimatePresence>
                  {fields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, margin: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border border-white/5 rounded-xl p-5 mb-4 bg-white/[0.02]"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-white/60 text-sm font-medium">Member {index + 1}</span>
                        {fields.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              remove(index)
                              setMemberImages((prev) => {
                                const updated = {}
                                Object.entries(prev).forEach(([k, v]) => {
                                  const n = parseInt(k)
                                  if (n < index) updated[k] = v
                                  else if (n > index) updated[n - 1] = v
                                })
                                return updated
                              })
                            }}
                            className="text-red-500/60 hover:text-red-400 transition-colors p-1"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field
                          label="Member Name *"
                          error={errors.family_members?.[index]?.name?.message}
                        >
                          <input
                            {...register(`family_members.${index}.name`, {
                              required: 'Name is required',
                            })}
                            placeholder="Full name"
                            className="input-field"
                          />
                        </Field>

                        <Field
                          label="Relation *"
                          error={errors.family_members?.[index]?.relation?.message}
                        >
                          <input
                            {...register(`family_members.${index}.relation`, {
                              required: 'Relation is required',
                            })}
                            placeholder="e.g. Spouse, Child, Parent"
                            className="input-field"
                          />
                        </Field>

                        <Field
                          label="Date of Birth"
                          error={errors.family_members?.[index]?.dob?.message}
                        >
                          <input
                            type="date"
                            {...register(`family_members.${index}.dob`)}
                            className="input-field"
                          />
                        </Field>

                        <div>
                          <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">
                            Member Photo
                          </label>
                          <ImageUpload
                            value={memberImages[index]}
                            onChange={(file) =>
                              setMemberImages((prev) => ({ ...prev, [index]: file }))
                            }
                            id={`member-photo-${index}`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={!submitting ? { scale: 1.02 } : {}}
              whileTap={!submitting ? { scale: 0.98 } : {}}
              className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting Details…
                </>
              ) : (
                <>
                  Submit Details <FiArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Helper components ────────────────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-white/60 text-xs uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

function ImageUpload({ value, onChange, id }) {
  const inputRef = useRef(null)

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        id={id}
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`w-full border border-dashed rounded-xl p-4 text-center transition-all duration-200 ${
          value
            ? 'border-red-600/50 bg-red-950/20'
            : 'border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04]'
        }`}
      >
        {value ? (
          <div className="flex items-center justify-center gap-2">
            <FiCamera size={16} className="text-red-400 shrink-0" />
            <span className="text-white/70 text-sm truncate max-w-[180px]">{value.name}</span>
            <FiCheck size={14} className="text-green-400 shrink-0" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <FiCamera size={22} className="text-white/25" />
            <span className="text-white/35 text-xs">Click to upload photo</span>
          </div>
        )}
      </button>
    </div>
  )
}

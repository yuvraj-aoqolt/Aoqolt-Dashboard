import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  FiMapPin, FiCamera, FiPlus, FiTrash2, FiArrowRight,
  FiUser, FiUsers, FiCheck, FiAlertTriangle
} from 'react-icons/fi'
import { correctionAPI } from '../../api'
import LoadingScreen from '../../components/LoadingScreen'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

export default function CorrectionFormPage() {
  const { token } = useParams()

  const [correctionData, setCorrectionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [mainImage, setMainImage] = useState(null)
  const [memberImages, setMemberImages] = useState({})

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm({
    defaultValues: { family_members: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'family_members' })

  useEffect(() => {
    correctionAPI
      .get(token)
      .then(({ data }) => {
        const d = data.data
        setCorrectionData(d)
        // Pre-fill form with existing data
        const current = d.current_data || {}
        const members = current.family_member_details || []
        reset({
          birth_date: current.birth_date || '',
          birth_time: current.birth_time || '',
          birth_place: current.birth_place || '',
          family_members: members.map((m) => ({
            name: m.name || '',
            relation: m.relation || '',
            dob: m.dob || '',
          })),
        })
      })
      .catch((err) => {
        const msg = err.response?.data?.error || 'Invalid or expired correction link'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [token, reset])

  if (loading) return <LoadingScreen />

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-red-950/40 border border-red-800/40 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiAlertTriangle size={32} className="text-red-400" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white mb-3">Link Invalid</h1>
            <p className="text-white/45 text-sm leading-relaxed">{error}</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (submitted || correctionData?.correction_completed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md"
          >
            <div className="w-24 h-24 bg-green-900/30 border border-green-700/40 rounded-full flex items-center justify-center mx-auto mb-8">
              <FiCheck size={40} className="text-green-400" />
            </div>
            <h1 className="font-display text-3xl font-bold text-white mb-3">
              Correction Submitted!
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Your updated details have been received. Our team will review them shortly.
            </p>
          </motion.div>
        </div>
        <Footer />
      </div>
    )
  }

  const flaggedFields = correctionData?.flagged_fields || []
  const fieldNotes = correctionData?.flagged_field_notes || {}
  const isFamilyAura = correctionData?.service_type === 'family_aura'
  const isFlagged = (name) => flaggedFields.includes(name)

  const onSubmit = async (values) => {
    setSubmitting(true)
    try {
      const fd = new FormData()

      fd.append('birth_date', values.birth_date || '')
      fd.append('birth_time', values.birth_time || '')
      fd.append('birth_place', values.birth_place || '')

      if (isFamilyAura) {
        fd.append('family_member_count', fields.length)
        fd.append(
          'family_member_details',
          JSON.stringify(
            values.family_members.map((m) => ({
              name: m.name,
              relation: m.relation,
              dob: m.dob || null,
            }))
          )
        )
      }

      // Images (keyed by description that backend uses)
      if (mainImage) fd.append('main_photo', mainImage)
      if (isFamilyAura) {
        Object.entries(memberImages).forEach(([idx, img]) => {
          if (img) fd.append(`family_member:${idx}`, img)
        })
      }

      await correctionAPI.submit(token, fd)
      toast.success('Correction submitted successfully!')
      setSubmitted(true)
    } catch (err) {
      const msg =
        err.response?.data?.error
          ? typeof err.response.data.error === 'string'
            ? err.response.data.error
            : 'Submission failed. Please try again.'
          : 'Submission failed. Please try again.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      <div className="flex-1 pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-red-950/50 text-red-400 border border-red-800/40 rounded-full px-3 py-1">
                <FiAlertTriangle size={11} /> Correction Required
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
              Update Your Details
            </h1>
            <p className="text-white/45 leading-relaxed">
              Our team has flagged some information that needs to be corrected.
              Fields highlighted in <span className="text-red-400">red</span> require your attention.
            </p>
            {correctionData?.booking_id && (
              <p className="text-white/25 text-sm mt-2 font-mono">
                Booking: {correctionData.booking_id}
              </p>
            )}
          </motion.div>

          {/* Flagged fields summary banner */}
          {flaggedFields.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-red-950/30 border border-red-800/40 rounded-2xl p-5 mb-8"
            >
              <p className="text-red-400 font-medium text-sm mb-2 flex items-center gap-2">
                <FiAlertTriangle size={14} /> Fields requiring correction:
              </p>
              <ul className="space-y-1">
                {flaggedFields.map((f) => (
                  <li key={f} className="text-white/60 text-sm flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>
                      <span className="text-red-300 font-medium">{fieldLabelMap[f] || f}</span>
                      {fieldNotes[f] && (
                        <span className="text-white/40 ml-2">— {fieldNotes[f]}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

            {/* ── Primary / Solo Person Details ─────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass rounded-2xl border border-red-900/20 p-8"
            >
              <h2 className="text-white font-semibold text-base mb-6 flex items-center gap-2">
                <FiUser size={16} className="text-red-500" />
                {isFamilyAura ? 'Primary Person Details' : 'Your Personal Details'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <CorrectionField
                  label="Date of Birth *"
                  error={errors.birth_date?.message}
                  flagged={isFlagged('birth_date')}
                  note={fieldNotes['birth_date']}
                >
                  <input
                    type="date"
                    {...register('birth_date', { required: 'Date of birth is required' })}
                    className={`input-field ${isFlagged('birth_date') ? 'border-red-600/70 focus:border-red-500' : ''}`}
                  />
                </CorrectionField>

                <CorrectionField
                  label="Time of Birth *"
                  error={errors.birth_time?.message}
                  flagged={isFlagged('birth_time')}
                  note={fieldNotes['birth_time']}
                >
                  <input
                    type="time"
                    {...register('birth_time', { required: 'Time of birth is required' })}
                    className={`input-field ${isFlagged('birth_time') ? 'border-red-600/70 focus:border-red-500' : ''}`}
                  />
                </CorrectionField>

                <div className="sm:col-span-2">
                  <CorrectionField
                    label="Place of Birth *"
                    error={errors.birth_place?.message}
                    flagged={isFlagged('birth_place')}
                    note={fieldNotes['birth_place']}
                  >
                    <div className="relative">
                      <FiMapPin className="absolute left-3.5 top-3.5 text-white/30" size={15} />
                      <input
                        {...register('birth_place', { required: 'Place of birth is required' })}
                        placeholder="City, Country"
                        className={`input-field pl-9 ${isFlagged('birth_place') ? 'border-red-600/70 focus:border-red-500' : ''}`}
                      />
                    </div>
                  </CorrectionField>
                </div>
              </div>

              {/* Main photo */}
              <div className="mt-6">
                <CorrectionField
                  label="Your Photo / Aura Image"
                  flagged={isFlagged('main_photo')}
                  note={fieldNotes['main_photo']}
                >
                  <ImageUpload
                    value={mainImage}
                    onChange={setMainImage}
                    id="main-photo"
                    flagged={isFlagged('main_photo')}
                  />
                </CorrectionField>
              </div>
            </motion.div>

            {/* ── Family Members ─────────────────────────────────────────── */}
            {isFamilyAura && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
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

                <AnimatePresence>
                  {fields.map((field, index) => {
                    const memberFlagged = isFlagged(`family_member:${index}`)
                    return (
                      <motion.div
                        key={field.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`rounded-xl p-5 mb-4 border ${
                          memberFlagged
                            ? 'border-red-600/50 bg-red-950/20'
                            : 'border-white/5 bg-white/[0.02]'
                        }`}
                      >
                        {memberFlagged && (
                          <div className="flex items-center gap-2 mb-3 text-red-400 text-xs font-medium">
                            <FiAlertTriangle size={12} />
                            This member's information needs correction
                            {fieldNotes[`family_member:${index}`] && (
                              <span className="text-white/40 ml-1 font-normal">
                                — {fieldNotes[`family_member:${index}`]}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-4">
                          <span className="text-white/60 text-sm font-medium">Member {index + 1}</span>
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
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Member Name *" error={errors.family_members?.[index]?.name?.message}>
                            <input
                              {...register(`family_members.${index}.name`, { required: 'Name is required' })}
                              placeholder="Full name"
                              className="input-field"
                            />
                          </Field>

                          <Field label="Relation *" error={errors.family_members?.[index]?.relation?.message}>
                            <input
                              {...register(`family_members.${index}.relation`, { required: 'Relation is required' })}
                              placeholder="e.g. Spouse, Child, Parent"
                              className="input-field"
                            />
                          </Field>

                          <Field label="Date of Birth">
                            <input
                              type="date"
                              {...register(`family_members.${index}.dob`)}
                              className="input-field"
                            />
                          </Field>

                          <div>
                            <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">
                              Member Photo
                              {memberFlagged && (
                                <span className="text-red-400 ml-1">*</span>
                              )}
                            </label>
                            <ImageUpload
                              value={memberImages[index]}
                              onChange={(file) =>
                                setMemberImages((prev) => ({ ...prev, [index]: file }))
                              }
                              id={`member-photo-${index}`}
                              flagged={memberFlagged}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
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
                  Submitting…
                </>
              ) : (
                <>
                  Submit Correction <FiArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  )
}

// ── Field label mapping (field_name → human label) ─────────────────────

const fieldLabelMap = {
  birth_date: 'Date of Birth',
  birth_time: 'Time of Birth',
  birth_place: 'Place of Birth',
  main_photo: 'Your Photo / Aura Image',
  family_member_details: 'Family Member Details',
}

// ── Helper components ────────────────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-white/60 text-xs uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

function CorrectionField({ label, error, flagged, note, children }) {
  return (
    <div>
      <label
        className={`block text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${
          flagged ? 'text-red-400' : 'text-white/60'
        }`}
      >
        {flagged && <FiAlertTriangle size={11} />}
        {label}
      </label>
      {children}
      {note && <p className="text-red-400/70 text-xs mt-1 flex items-center gap-1"><FiAlertTriangle size={10} /> {note}</p>}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

function ImageUpload({ value, onChange, id, flagged }) {
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
            : flagged
            ? 'border-red-600/60 bg-red-950/20 hover:border-red-500/70'
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
            <FiCamera size={22} className={flagged ? 'text-red-500/60' : 'text-white/25'} />
            <span className={`text-xs ${flagged ? 'text-red-400/70' : 'text-white/35'}`}>
              {flagged ? 'Upload corrected photo' : 'Click to upload photo'}
            </span>
          </div>
        )}
      </button>
    </div>
  )
}

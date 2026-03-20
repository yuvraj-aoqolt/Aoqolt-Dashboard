import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  FiSearch, FiChevronDown, FiChevronUp, FiAlertTriangle, FiCheck,
  FiCopy, FiUser, FiUsers, FiCalendar, FiClock, FiMapPin, FiImage,
  FiSend, FiX, FiExternalLink
} from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'
import { bookingsAPI } from '../../api'
import SuperAdminLayout from './SuperAdminLayout'
import LoadingScreen from '../../components/LoadingScreen'

const BASE_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin

// ── All fields that can be flagged ───────────────────────────────────────
const FLAGGABLE_FIELDS = [
  { key: 'birth_date',   label: 'Date of Birth' },
  { key: 'birth_time',   label: 'Time of Birth' },
  { key: 'birth_place',  label: 'Place of Birth' },
  { key: 'main_photo',   label: 'Photo / Aura Image' },
]
const FAMILY_FLAGGABLE = (index) => [
  { key: `family_member:${index}`, label: `Member ${index + 1} (all info)` },
]

const statusBadge = (s) => ({
  pending:         'bg-white/5 text-white/40',
  payment_pending: 'bg-yellow-900/30 text-yellow-400',
  completed:       'bg-green-900/30 text-green-400',
  cancelled:       'bg-red-900/30 text-red-400',
})[s] || 'bg-white/5 text-white/30'

const serviceIcon = (t) => ({
  single_aura: <FiUser size={14} />,
  family_aura: <FiUsers size={14} />,
  astrology:   <GiCrystalBall size={14} />,
})[t] || <GiCrystalBall size={14} />

export default function SuperAdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState(null)   // booking id
  const [correctionModal, setCorrectionModal] = useState(null) // booking object
  const [flaggedFields, setFlaggedFields]     = useState([])
  const [fieldNotes, setFieldNotes]           = useState({})   // {field_key: note}
  const [sending, setSending]                 = useState(false)
  const [generatedLink, setGeneratedLink]     = useState(null)

  useEffect(() => {
    bookingsAPI.allBookings()
      .then(({ data }) => setBookings(Array.isArray(data) ? data : data.results || []))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = bookings.filter((b) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.booking_id?.toLowerCase().includes(q) ||
      b.full_name?.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q) ||
      b.service_name?.toLowerCase().includes(q)
    )
  })

  const toggleExpand = (id) => setExpanded((prev) => (prev === id ? null : id))

  const openCorrectionModal = (booking) => {
    setCorrectionModal(booking)
    setFlaggedFields([])
    setFieldNotes({})
    setGeneratedLink(null)
  }

  const toggleFlag = (key) => {
    setFlaggedFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    )
  }

  const handleSendCorrection = async () => {
    if (flaggedFields.length === 0) { toast.error('Select at least one field to flag'); return }
    setSending(true)
    try {
      const { data } = await bookingsAPI.requestCorrection(correctionModal.id, {
        flagged_fields: flaggedFields,
        flagged_field_notes: fieldNotes,
        frontend_base_url: BASE_URL,
      })
      const link = data.data?.correction_link || `${BASE_URL}/form/${data.data?.correction_token}`
      setGeneratedLink(link)
      toast.success('Correction request created')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create correction request')
    } finally {
      setSending(false)
    }
  }

  const copyLink = (link) => {
    navigator.clipboard.writeText(link)
    toast.success('Link copied!')
  }

  const whatsappLink = (link, booking) =>
    `https://wa.me/${encodeURIComponent(booking.phone_number || '')}?text=${encodeURIComponent(
      `Hi ${booking.full_name}, please update your Aoqolt booking details here: ${link}`
    )}`

  if (loading) return <LoadingScreen />

  return (
    <SuperAdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Bookings & Form Details</h1>
            <p className="text-white/30 text-sm mt-1">{bookings.length} total bookings</p>
          </div>
          <div className="relative">
            <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, booking ID…"
              className="pl-9 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 focus:border-yellow-600/40 rounded-xl text-white placeholder:text-white/25 outline-none transition-all w-72"
            />
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-20 text-white/20 text-sm">No bookings found</div>
          )}
          {filtered.map((booking, i) => {
            const details = booking.details
            const isOpen = expanded === booking.id
            const hasFamilyMembers = details?.family_member_details?.length > 0
            const allFlaggable = [
              ...FLAGGABLE_FIELDS,
              ...(hasFamilyMembers
                ? details.family_member_details.map((_, idx) => FAMILY_FLAGGABLE(idx)[0])
                : []),
            ]

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-2xl border border-white/5 overflow-hidden"
              >
                {/* Row header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => toggleExpand(booking.id)}
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-yellow-400/70">
                      {serviceIcon(booking.service?.service_type || booking.selected_service)}
                      <span className="text-white font-medium text-sm">{booking.booking_id}</span>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">{booking.full_name}</p>
                      <p className="text-white/30 text-xs">{booking.email}</p>
                    </div>
                    <span className="text-white/35 text-xs hidden sm:block">
                      {booking.service_name || booking.service?.name}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs capitalize ${statusBadge(booking.status)}`}>
                      {booking.status?.replace('_', ' ')}
                    </span>
                    {details && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-900/20 text-green-400 border border-green-900/20">
                        Form 2 submitted
                      </span>
                    )}
                    {details?.flagged_fields?.length > 0 && !details.correction_completed && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-900/30 text-red-400 border border-red-900/20 flex items-center gap-1">
                        <FiAlertTriangle size={10} /> Correction pending
                      </span>
                    )}
                    {details?.correction_completed && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-900/20 text-blue-400 border border-blue-900/20 flex items-center gap-1">
                        <FiCheck size={10} /> Correction received
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {details && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openCorrectionModal(booking) }}
                        className="px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 border border-red-900/20 hover:border-red-700/40 rounded-xl transition-all"
                      >
                        Flag Fields
                      </button>
                    )}
                    {isOpen ? <FiChevronUp size={16} className="text-white/30" /> : <FiChevronDown size={16} className="text-white/30" />}
                  </div>
                </div>

                {/* Expanded detail panel */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-6 border-t border-white/5 pt-5 space-y-6">

                        {/* Booking info */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <InfoCell label="Booking ID" value={booking.booking_id} mono />
                          <InfoCell label="Service" value={booking.service_name || booking.service?.name} />
                          <InfoCell label="Phone" value={booking.phone_number} />
                          <InfoCell
                            label="Created"
                            value={booking.created_at ? format(new Date(booking.created_at), 'dd MMM yyyy') : '—'}
                          />
                        </div>

                        {/* Form 2 data */}
                        {details ? (
                          <div className="space-y-5">
                            <h3 className="text-white/60 text-xs uppercase tracking-wider">Submitted Details (Form 2)</h3>

                            {/* Primary person */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <DetailCell
                                icon={<FiCalendar size={13} />}
                                label="Date of Birth"
                                value={details.birth_date}
                                flagged={details.flagged_fields?.includes('birth_date')}
                              />
                              <DetailCell
                                icon={<FiClock size={13} />}
                                label="Time of Birth"
                                value={details.birth_time}
                                flagged={details.flagged_fields?.includes('birth_time')}
                              />
                              <DetailCell
                                icon={<FiMapPin size={13} />}
                                label="Place of Birth"
                                value={details.birth_place}
                                flagged={details.flagged_fields?.includes('birth_place')}
                              />
                            </div>

                            {/* Attachments */}
                            {booking.attachments?.length > 0 && (
                              <div>
                                <p className="text-white/40 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <FiImage size={11} /> Uploaded Images
                                </p>
                                <div className="flex flex-wrap gap-3">
                                  {booking.attachments.map((att) => (
                                    <a
                                      key={att.id}
                                      href={att.file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-all hover:bg-white/10 ${
                                        details.flagged_fields?.includes(att.description)
                                          ? 'border-red-600/50 bg-red-950/20 text-red-300'
                                          : 'border-white/10 bg-white/5 text-white/60'
                                      }`}
                                    >
                                      <FiImage size={12} />
                                      {att.description || att.file_name}
                                      <FiExternalLink size={11} className="opacity-50" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Family members */}
                            {hasFamilyMembers && (
                              <div>
                                <p className="text-white/40 text-xs uppercase tracking-wider mb-3 flex items-center gap-1">
                                  <FiUsers size={11} /> Family Members ({details.family_member_details.length})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {details.family_member_details.map((m, idx) => {
                                    const memberKey = `family_member:${idx}`
                                    const isMemberFlagged = details.flagged_fields?.includes(memberKey)
                                    const memberPhoto = booking.attachments?.find((a) => a.description === memberKey)
                                    return (
                                      <div
                                        key={idx}
                                        className={`rounded-xl p-4 border text-sm ${
                                          isMemberFlagged
                                            ? 'border-red-600/40 bg-red-950/20'
                                            : 'border-white/5 bg-white/[0.02]'
                                        }`}
                                      >
                                        {isMemberFlagged && (
                                          <span className="inline-flex items-center gap-1 text-red-400 text-xs mb-2">
                                            <FiAlertTriangle size={10} /> Flagged
                                          </span>
                                        )}
                                        <p className="text-white font-medium">{m.name}</p>
                                        <p className="text-white/40 text-xs">{m.relation}</p>
                                        {m.dob && <p className="text-white/30 text-xs mt-1">DOB: {m.dob}</p>}
                                        {memberPhoto && (
                                          <a
                                            href={memberPhoto.file}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 mt-2 text-white/40 hover:text-white/70 text-xs transition-colors"
                                          >
                                            <FiImage size={11} /> View Photo <FiExternalLink size={10} />
                                          </a>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Previous correction status */}
                            {details.correction_requested_at && (
                              <div className="flex items-center gap-3 text-xs text-white/30 border border-white/5 rounded-xl px-4 py-3">
                                <FiAlertTriangle size={12} className="text-yellow-500/60 shrink-0" />
                                <span>
                                  Correction requested{' '}
                                  {format(new Date(details.correction_requested_at), 'dd MMM yyyy HH:mm')}
                                  {details.correction_completed && (
                                    <span className="text-green-400 ml-2">— User submitted correction</span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-6 text-center text-white/20 text-sm border border-dashed border-white/5 rounded-xl">
                            Form 2 not yet submitted by user
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* ── Correction / Flag Fields Modal ─────────────────────────────── */}
      <AnimatePresence>
        {correctionModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl border border-white/10 p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg">Flag Fields for Correction</h3>
                <button onClick={() => { setCorrectionModal(null); setGeneratedLink(null) }}
                  className="text-white/30 hover:text-white/60 transition-colors">
                  <FiX size={20} />
                </button>
              </div>

              <p className="text-white/40 text-sm mb-5">
                Booking <span className="text-white/70 font-mono">{correctionModal.booking_id}</span> —{' '}
                {correctionModal.full_name}
              </p>

              {!generatedLink ? (
                <>
                  {/* Field selector */}
                  <div className="space-y-2 mb-6">
                    {[
                      ...FLAGGABLE_FIELDS,
                      ...(correctionModal.details?.family_member_details?.map((_, idx) => FAMILY_FLAGGABLE(idx)[0]) || []),
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <label
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            flaggedFields.includes(key)
                              ? 'border-red-600/50 bg-red-950/20'
                              : 'border-white/5 hover:border-white/15 bg-white/[0.02]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={flaggedFields.includes(key)}
                            onChange={() => toggleFlag(key)}
                            className="accent-red-500"
                          />
                          <span className={`text-sm ${flaggedFields.includes(key) ? 'text-red-300' : 'text-white/60'}`}>
                            {label}
                          </span>
                        </label>
                        {flaggedFields.includes(key) && (
                          <input
                            value={fieldNotes[key] || ''}
                            onChange={(e) => setFieldNotes((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={`Note for "${label}" (optional)`}
                            className="w-full text-xs bg-white/5 border border-white/10 focus:border-red-700/40 rounded-xl px-3 py-2 text-white/70 placeholder:text-white/20 outline-none"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSendCorrection}
                    disabled={sending || flaggedFields.length === 0}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FiSend size={15} />
                    )}
                    Generate Correction Link
                  </button>
                </>
              ) : (
                /* Generated link panel */
                <div className="space-y-4">
                  <div className="bg-green-900/20 border border-green-800/30 rounded-xl p-4">
                    <p className="text-green-400 text-sm font-medium mb-2 flex items-center gap-2">
                      <FiCheck size={14} /> Correction link generated
                    </p>
                    <p className="text-white/60 text-xs break-all font-mono">{generatedLink}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => copyLink(generatedLink)}
                      className="flex items-center justify-center gap-2 py-2.5 text-sm border border-white/10 hover:border-white/20 text-white/60 hover:text-white rounded-xl transition-all"
                    >
                      <FiCopy size={14} /> Copy Link
                    </button>
                    <a
                      href={whatsappLink(generatedLink, correctionModal)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 text-sm bg-green-700/20 border border-green-800/30 hover:bg-green-700/30 text-green-400 rounded-xl transition-all"
                    >
                      <FiSend size={14} /> Send via WhatsApp
                    </a>
                  </div>

                  <button
                    onClick={() => { setFlaggedFields([]); setFieldNotes({}); setGeneratedLink(null) }}
                    className="w-full text-white/30 hover:text-white/60 text-sm py-2 transition-colors"
                  >
                    Flag different fields
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SuperAdminLayout>
  )
}

// ── Small helper components ───────────────────────────────────────────────

function InfoCell({ label, value, mono }) {
  return (
    <div>
      <p className="text-white/30 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-white/70 text-sm ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  )
}

function DetailCell({ icon, label, value, flagged }) {
  return (
    <div className={`rounded-xl p-3 border ${flagged ? 'border-red-600/50 bg-red-950/20' : 'border-white/5 bg-white/[0.02]'}`}>
      <p className={`text-xs uppercase tracking-wider mb-1 flex items-center gap-1 ${flagged ? 'text-red-400' : 'text-white/30'}`}>
        {flagged && <FiAlertTriangle size={10} />}{icon} {label}
      </p>
      <p className={`text-sm font-medium ${flagged ? 'text-red-200' : 'text-white/70'}`}>{value || '—'}</p>
    </div>
  )
}

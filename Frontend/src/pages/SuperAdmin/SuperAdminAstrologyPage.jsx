import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  FiSearch, FiChevronDown, FiChevronUp,
  FiEdit2, FiSave, FiUser, FiCalendar, FiClock, FiMapPin,
  FiPhone, FiMail, FiGlobe, FiX, FiTrash2,
} from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'
import { bookingsAPI } from '../../api'
import SuperAdminLayout from './SuperAdminLayout'
import LoadingScreen from '../../components/LoadingScreen'

const statusBadge = (s) => ({
  pending:         'bg-white/5 text-white/40',
  payment_pending: 'bg-yellow-900/30 text-yellow-400',
  completed:       'bg-green-900/30 text-green-400',
  cancelled:       'bg-red-900/30 text-red-400',
})[s] || 'bg-white/5 text-white/30'

export default function SuperAdminAstrologyPage() {
  const [bookings, setBookings]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [expanded, setExpanded]           = useState(null)
  const [editForm1Modal, setEditForm1Modal] = useState(null)
  const [editForm2Modal, setEditForm2Modal] = useState(null)
  const [form1Data, setForm1Data]         = useState({})
  const [form2Data, setForm2Data]         = useState({})
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(null)
  const [confirmDel, setConfirmDel]       = useState(null)

  useEffect(() => {
    bookingsAPI.allBookings()
      .then(({ data }) => {
        const all = Array.isArray(data) ? data : data.results || []
        setBookings(all.filter((b) => {
          const t = b.service_type || b.service?.service_type || b.selected_service
          return t === 'astrology'
        }))
      })
      .catch(() => toast.error('Failed to load astrology bookings'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = bookings.filter((b) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.booking_id?.toLowerCase().includes(q) ||
      b.full_name?.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q)
    )
  })

  const toggleExpand = (id) => setExpanded((prev) => (prev === id ? null : id))

  const deleteBooking = async (id) => {
    setConfirmDel(null)
    setDeleting(id)
    try {
      await bookingsAPI.deleteBooking(id)
      setBookings((prev) => prev.filter((b) => b.id !== id))
      toast.success('Booking deleted')
    } catch {
      toast.error('Failed to delete booking')
    } finally {
      setDeleting(null)
    }
  }

  const openEditForm1 = (booking) => {
    setEditForm1Modal(booking)
    setForm1Data({
      full_name:           booking.full_name || '',
      email:               booking.email || '',
      phone_country_code:  booking.phone_country_code || '+1',
      phone_number:        booking.phone_number || '',
      address:             booking.address || '',
      country:             booking.country || '',
      state:               booking.state || '',
      city:                booking.city || '',
      postal_code:         booking.postal_code || '',
      special_note:        booking.special_note || '',
    })
  }

  const openEditForm2 = (booking) => {
    setEditForm2Modal(booking)
    const d  = booking.details || {}
    const cd = d.custom_data || {}
    setForm2Data({
      full_name:         cd.full_name || '',
      birth_date:        d.birth_date || '',
      birth_time:        d.birth_time || '',
      birth_place:       d.birth_place || '',
      appointment_date:  cd.appointment_date || '',
      appointment_time:  cd.appointment_time || '',
      additional_notes:  d.additional_notes || '',
    })
  }

  const handleSaveForm1 = async () => {
    setSaving(true)
    try {
      await bookingsAPI.editForm1(editForm1Modal.id, form1Data)
      setBookings((prev) =>
        prev.map((b) => b.id === editForm1Modal.id ? { ...b, ...form1Data } : b)
      )
      toast.success('Booking updated')
      setEditForm1Modal(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveForm2 = async () => {
    setSaving(true)
    try {
      const payload = {
        birth_date:  form2Data.birth_date  || null,
        birth_time:  form2Data.birth_time  || null,
        birth_place: form2Data.birth_place || '',
        custom_data: {
          full_name:        form2Data.full_name,
          appointment_date: form2Data.appointment_date,
          appointment_time: form2Data.appointment_time,
        },
        additional_notes: form2Data.additional_notes,
      }
      await bookingsAPI.editForm2(editForm2Modal.id, payload)
      setBookings((prev) =>
        prev.map((b) =>
          b.id === editForm2Modal.id
            ? { ...b, details: { ...b.details, ...payload } }
            : b
        )
      )
      toast.success('Astrology details updated')
      setEditForm2Modal(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <SuperAdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
              <GiCrystalBall className="text-purple-400" size={22} />
              Astrology Bookings
            </h1>
            <p className="text-white/30 text-sm mt-1">{bookings.length} total astrology bookings</p>
          </div>
          <div className="relative">
            <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, booking ID…"
              className="pl-9 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 focus:border-purple-600/40 rounded-xl text-white placeholder:text-white/25 outline-none transition-all w-72"
            />
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-20 text-white/20 text-sm">No astrology bookings found</div>
          )}

          {filtered.map((booking, i) => {
            const details = booking.details
            const cd      = details?.custom_data || {}
            const isOpen  = expanded === booking.id

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
                    <div className="flex items-center gap-2 text-purple-400/70">
                      <GiCrystalBall size={14} />
                      <span className="text-white font-medium text-sm">{booking.booking_id}</span>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">{booking.full_name}</p>
                      <p className="text-white/30 text-xs">{booking.email}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs capitalize ${statusBadge(booking.status)}`}>
                      {booking.status?.replace('_', ' ')}
                    </span>
                    {details && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-900/20 text-purple-400 border border-purple-900/20">
                        Details submitted
                      </span>
                    )}
                    {cd.appointment_date && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-900/20 text-blue-300 border border-blue-900/20 flex items-center gap-1">
                        <FiCalendar size={10} />
                        {cd.appointment_date} {cd.appointment_time}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditForm1(booking) }}
                      className="px-3 py-1.5 text-xs text-blue-400/70 hover:text-blue-400 border border-blue-900/20 hover:border-blue-700/40 rounded-xl transition-all flex items-center gap-1"
                    >
                      <FiEdit2 size={11} /> Edit Details
                    </button>
                    {details && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditForm2(booking) }}
                        className="px-3 py-1.5 text-xs text-purple-400/70 hover:text-purple-400 border border-purple-900/20 hover:border-purple-700/40 rounded-xl transition-all flex items-center gap-1"
                      >
                        <FiEdit2 size={11} /> Edit Astro Details
                      </button>
                    )}
                    {isOpen
                      ? <FiChevronUp size={16} className="text-white/30" />
                      : <FiChevronDown size={16} className="text-white/30" />
                    }
                    {confirmDel === booking.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-red-400 text-xs">Delete?</span>
                        <button onClick={() => deleteBooking(booking.id)} className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg">Yes</button>
                        <button onClick={() => setConfirmDel(null)} className="px-2 py-1 text-xs bg-white/5 text-white/50 rounded-lg">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDel(booking.id) }}
                        disabled={deleting === booking.id}
                        className="p-1.5 text-white/15 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-40"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded panel */}
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

                        {/* ── Form 1 — Booking / Contact Details ────────── */}
                        <div>
                          <h3 className="text-white/40 text-xs uppercase tracking-wider mb-3">Booking Details (Form 1)</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            <InfoCell label="Booking ID"  value={booking.booking_id} mono />
                            <InfoCell label="Full Name"   value={booking.full_name} />
                            <InfoCell label="Email"       value={booking.email} />
                            <InfoCell label="Phone"       value={`${booking.phone_country_code || ''} ${booking.phone_number || ''}`} />
                            <InfoCell label="City"        value={booking.city} />
                            <InfoCell label="State"       value={booking.state} />
                            <InfoCell label="Country"     value={booking.country} />
                            <InfoCell label="Postal Code" value={booking.postal_code} />
                          </div>
                          {booking.address && (
                            <div className="mt-3 rounded-xl p-3 border border-white/5 bg-white/[0.02]">
                              <p className="text-xs uppercase tracking-wider mb-1 text-white/30 flex items-center gap-1">
                                <FiMapPin size={10} /> Address
                              </p>
                              <p className="text-sm text-white/70">{booking.address}</p>
                            </div>
                          )}
                          {booking.special_note && (
                            <div className="mt-2 rounded-xl p-3 border border-white/5 bg-white/[0.02]">
                              <p className="text-xs uppercase tracking-wider mb-1 text-white/30">Special Note</p>
                              <p className="text-sm text-white/70">{booking.special_note}</p>
                            </div>
                          )}
                          <p className="text-white/20 text-xs mt-2">
                            Booked on: {booking.created_at ? format(new Date(booking.created_at), 'dd MMM yyyy, hh:mm a') : '—'}
                          </p>
                        </div>

                        {/* ── Form 2 — Astrology Details ─────────────────── */}
                        <div>
                          <h3 className="text-white/40 text-xs uppercase tracking-wider mb-3">Astrology Details (Form 2)</h3>
                          {details ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <DetailCell icon={<FiUser size={13} />}     label="Full Name"        value={cd.full_name} />
                                <DetailCell icon={<FiCalendar size={13} />} label="Date of Birth"    value={details.birth_date} />
                                <DetailCell
                                  icon={<FiClock size={13} />}
                                  label="Time of Birth"
                                  value={details.birth_time || (cd.birth_time_not_sure ? 'Not sure' : '—')}
                                />
                                <DetailCell icon={<FiMapPin size={13} />}   label="Place of Birth"   value={details.birth_place} />
                                <DetailCell icon={<FiCalendar size={13} />} label="Appointment Date" value={cd.appointment_date} />
                                <DetailCell icon={<FiClock size={13} />}    label="Appointment Time" value={cd.appointment_time} />
                              </div>
                              {details.additional_notes && (
                                <div className="rounded-xl p-3 border border-white/5 bg-white/[0.02]">
                                  <p className="text-xs uppercase tracking-wider mb-1 text-white/30">Notes</p>
                                  <p className="text-sm text-white/70">{details.additional_notes}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-5 text-center text-white/20 text-sm border border-dashed border-white/5 rounded-xl">
                              Astrology details not yet submitted by client
                            </div>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* ── Edit Booking Details Modal (Form 1) ───────────────────────── */}
      <AnimatePresence>
        {editForm1Modal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl border border-white/10 p-7 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg">Edit Booking Details</h3>
                <button onClick={() => setEditForm1Modal(null)} className="text-white/30 hover:text-white/60 transition-colors">
                  <FiX size={20} />
                </button>
              </div>
              <p className="text-white/40 text-sm mb-5">
                Booking <span className="text-white/70 font-mono">{editForm1Modal.booking_id}</span> — {editForm1Modal.full_name}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <ModalField label="Full Name" icon={<FiUser size={13} />}>
                  <input value={form1Data.full_name || ''} onChange={(e) => setForm1Data((p) => ({ ...p, full_name: e.target.value }))} className="modal-input" placeholder="Full name" />
                </ModalField>
                <ModalField label="Email" icon={<FiMail size={13} />}>
                  <input type="email" value={form1Data.email || ''} onChange={(e) => setForm1Data((p) => ({ ...p, email: e.target.value }))} className="modal-input" placeholder="Email" />
                </ModalField>

                <div className="sm:col-span-2">
                  <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Phone Number</label>
                  <div className="flex">
                    <div className="relative shrink-0">
                      <FiPhone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input value={form1Data.phone_country_code || ''} onChange={(e) => setForm1Data((p) => ({ ...p, phone_country_code: e.target.value }))} className="modal-input !w-20 !pl-8 !rounded-r-none !border-r-0" placeholder="+1" />
                    </div>
                    <input value={form1Data.phone_number || ''} onChange={(e) => setForm1Data((p) => ({ ...p, phone_number: e.target.value }))} className="modal-input flex-1 min-w-0 !rounded-l-none" placeholder="Phone number" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Address</label>
                  <textarea value={form1Data.address || ''} onChange={(e) => setForm1Data((p) => ({ ...p, address: e.target.value }))} className="modal-input resize-none" rows={2} placeholder="Street address" />
                </div>

                <ModalField label="Country" icon={<FiGlobe size={13} />}>
                  <input value={form1Data.country || ''} onChange={(e) => setForm1Data((p) => ({ ...p, country: e.target.value }))} className="modal-input" placeholder="Country" />
                </ModalField>
                <ModalField label="State / Province" icon={<FiMapPin size={13} />}>
                  <input value={form1Data.state || ''} onChange={(e) => setForm1Data((p) => ({ ...p, state: e.target.value }))} className="modal-input" placeholder="State" />
                </ModalField>
                <ModalField label="City" icon={<FiMapPin size={13} />}>
                  <input value={form1Data.city || ''} onChange={(e) => setForm1Data((p) => ({ ...p, city: e.target.value }))} className="modal-input" placeholder="City" />
                </ModalField>
                <ModalField label="Postal Code" icon={<FiMapPin size={13} />}>
                  <input value={form1Data.postal_code || ''} onChange={(e) => setForm1Data((p) => ({ ...p, postal_code: e.target.value }))} className="modal-input" placeholder="Postal code" />
                </ModalField>

                <div className="sm:col-span-2">
                  <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Special Note</label>
                  <textarea value={form1Data.special_note || ''} onChange={(e) => setForm1Data((p) => ({ ...p, special_note: e.target.value }))} className="modal-input resize-none" rows={3} placeholder="Special notes…" />
                </div>
              </div>

              <button
                onClick={handleSaveForm1}
                disabled={saving}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={15} />}
                Save Changes
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Astrology Details Modal (Form 2) ─────────────────────── */}
      <AnimatePresence>
        {editForm2Modal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl border border-white/10 p-7 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <GiCrystalBall className="text-purple-400" size={18} />
                  Edit Astrology Details
                </h3>
                <button onClick={() => setEditForm2Modal(null)} className="text-white/30 hover:text-white/60 transition-colors">
                  <FiX size={20} />
                </button>
              </div>
              <p className="text-white/40 text-sm mb-5">
                Booking <span className="text-white/70 font-mono">{editForm2Modal.booking_id}</span> — {editForm2Modal.full_name}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="sm:col-span-2">
                  <ModalField label="Full Name" icon={<FiUser size={13} />}>
                    <input value={form2Data.full_name || ''} onChange={(e) => setForm2Data((p) => ({ ...p, full_name: e.target.value }))} className="modal-input" placeholder="Client's full name" />
                  </ModalField>
                </div>

                <ModalField label="Date of Birth" icon={<FiCalendar size={13} />}>
                  <input type="date" value={form2Data.birth_date || ''} onChange={(e) => setForm2Data((p) => ({ ...p, birth_date: e.target.value }))} className="modal-input" />
                </ModalField>

                <ModalField label="Time of Birth" icon={<FiClock size={13} />}>
                  <input type="time" value={form2Data.birth_time || ''} onChange={(e) => setForm2Data((p) => ({ ...p, birth_time: e.target.value }))} className="modal-input" placeholder="Leave blank if not sure" />
                </ModalField>

                <div className="sm:col-span-2">
                  <ModalField label="Place of Birth" icon={<FiMapPin size={13} />}>
                    <input value={form2Data.birth_place || ''} onChange={(e) => setForm2Data((p) => ({ ...p, birth_place: e.target.value }))} className="modal-input" placeholder="City, Country" />
                  </ModalField>
                </div>

                <ModalField label="Appointment Date" icon={<FiCalendar size={13} />}>
                  <input type="date" value={form2Data.appointment_date || ''} onChange={(e) => setForm2Data((p) => ({ ...p, appointment_date: e.target.value }))} className="modal-input" />
                </ModalField>

                <ModalField label="Appointment Time" icon={<FiClock size={13} />}>
                  <input type="time" value={form2Data.appointment_time || ''} onChange={(e) => setForm2Data((p) => ({ ...p, appointment_time: e.target.value }))} className="modal-input" />
                </ModalField>

                <div className="sm:col-span-2">
                  <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Additional Notes</label>
                  <textarea value={form2Data.additional_notes || ''} onChange={(e) => setForm2Data((p) => ({ ...p, additional_notes: e.target.value }))} className="modal-input resize-none" rows={3} placeholder="Additional notes…" />
                </div>
              </div>

              <button
                onClick={handleSaveForm2}
                disabled={saving}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={15} />}
                Save Astrology Details
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SuperAdminLayout>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────

function InfoCell({ label, value, mono }) {
  return (
    <div>
      <p className="text-white/30 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-white/70 text-sm ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  )
}

function DetailCell({ icon, label, value }) {
  return (
    <div className="rounded-xl p-3 border border-white/5 bg-white/[0.02]">
      <p className="text-xs uppercase tracking-wider mb-1 flex items-center gap-1 text-white/30">
        {icon} {label}
      </p>
      <p className="text-sm font-medium text-white/70">{value || '—'}</p>
    </div>
  )
}

function ModalField({ label, icon, children }) {
  return (
    <div>
      <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1">
        {icon && <span className="text-white/20">{icon}</span>}{label}
      </label>
      {children}
    </div>
  )
}

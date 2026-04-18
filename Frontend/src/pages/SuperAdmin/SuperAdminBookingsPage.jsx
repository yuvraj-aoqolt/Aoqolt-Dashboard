import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  FiSearch, FiChevronDown, FiChevronUp, FiCheck,
  FiEdit2, FiSave, FiUser, FiUsers, FiCalendar, FiClock, FiMapPin, FiImage,
  FiPhone, FiMail, FiGlobe, FiX, FiExternalLink, FiTrash2
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

const serviceIcon = (t) => ({
  single_aura: <FiUser size={14} />,
  family_aura: <FiUsers size={14} />,
  astrology:   <GiCrystalBall size={14} />,
})[t] || <GiCrystalBall size={14} />

export default function SuperAdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState(null)
  const [editForm1Modal, setEditForm1Modal] = useState(null)
  const [editForm2Modal, setEditForm2Modal] = useState(null)
  const [form1Data, setForm1Data] = useState({})
  const [form2Data, setForm2Data] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

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
      full_name: booking.full_name || '',
      email: booking.email || '',
      phone_country_code: booking.phone_country_code || '+1',
      phone_number: booking.phone_number || '',
      address: booking.address || '',
      country: booking.country || '',
      state: booking.state || '',
      city: booking.city || '',
      postal_code: booking.postal_code || '',
      special_note: booking.special_note || '',
    })
  }

  const openEditForm2 = (booking) => {
    setEditForm2Modal(booking)
    const d = booking.details || {}
    const cd = d.custom_data || {}
    const svcType = booking.service_type || booking.service?.service_type || booking.selected_service
    if (svcType === 'single_aura') {
      setForm2Data({
        full_name: cd.full_name || '',
        mother_name: cd.mother_name || '',
        current_city: cd.current_city || '',
        marital_status: cd.marital_status || '',
        scan_focus: cd.scan_focus || '',
        additional_notes: d.additional_notes || '',
      })
    } else {
      setForm2Data({
        birth_date: d.birth_date || '',
        birth_time: d.birth_time || '',
        birth_place: d.birth_place || '',
        additional_notes: d.additional_notes || '',
        family_member_count: d.family_member_count ?? '',
        family_member_details: d.family_member_details ? JSON.stringify(d.family_member_details, null, 2) : '',
        custom_data: d.custom_data ? JSON.stringify(d.custom_data, null, 2) : '',
      })
    }
  }

  const handleSaveForm1 = async () => {
    setSaving(true)
    try {
      await bookingsAPI.editForm1(editForm1Modal.id, form1Data)
      setBookings(prev => prev.map(b => b.id === editForm1Modal.id ? { ...b, ...form1Data } : b))
      toast.success('Booking details updated')
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
      const svcType = editForm2Modal.service_type || editForm2Modal.service?.service_type || editForm2Modal.selected_service
      let payload
      if (svcType === 'single_aura') {
        payload = {
          custom_data: {
            full_name: form2Data.full_name,
            mother_name: form2Data.mother_name,
            current_city: form2Data.current_city,
            marital_status: form2Data.marital_status,
            scan_focus: form2Data.scan_focus,
          },
          additional_notes: form2Data.additional_notes,
        }
      } else {
        payload = { ...form2Data }
        try { payload.family_member_details = form2Data.family_member_details ? JSON.parse(form2Data.family_member_details) : null } catch { /* keep raw */ }
        try { payload.custom_data = form2Data.custom_data ? JSON.parse(form2Data.custom_data) : {} } catch { /* keep raw */ }
      }
      await bookingsAPI.editForm2(editForm2Modal.id, payload)
      setBookings(prev => prev.map(b =>
        b.id === editForm2Modal.id
          ? { ...b, details: { ...b.details, ...(svcType === 'single_aura' ? { custom_data: payload.custom_data, additional_notes: payload.additional_notes } : payload) } }
          : b
      ))
      toast.success('Form 2 updated')
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
            const svcType = booking.service_type || booking.service?.service_type || booking.selected_service
            const isSingleAura = svcType === 'single_aura'

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
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditForm1(booking) }}
                      className="px-3 py-1.5 text-xs text-blue-400/70 hover:text-blue-400 border border-blue-900/20 hover:border-blue-700/40 rounded-xl transition-all flex items-center gap-1"
                    >
                      <FiEdit2 size={11} /> Edit Form 1
                    </button>
                    {details && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditForm2(booking) }}
                        className="px-3 py-1.5 text-xs text-purple-400/70 hover:text-purple-400 border border-purple-900/20 hover:border-purple-700/40 rounded-xl transition-all flex items-center gap-1"
                      >
                        <FiEdit2 size={11} /> Edit Form 2
                      </button>
                    )}
                    {isOpen ? <FiChevronUp size={16} className="text-white/30" /> : <FiChevronDown size={16} className="text-white/30" />}
                    {confirmDel === booking.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <span className="text-red-400 text-xs">Delete?</span>
                        <button onClick={() => deleteBooking(booking.id)} className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg">Yes</button>
                        <button onClick={() => setConfirmDel(null)} className="px-2 py-1 text-xs bg-white/5 text-white/50 rounded-lg">No</button>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDel(booking.id) }} disabled={deleting === booking.id}
                        className="p-1.5 text-white/15 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-40">
                        <FiTrash2 size={13} />
                      </button>
                    )}
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

                            {/* Primary person / aura details */}
                            {isSingleAura ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <DetailCell icon={<FiUser size={13} />} label="Full Name" value={details.custom_data?.full_name} />
                                <DetailCell icon={<FiUsers size={13} />} label="Mother's Name" value={details.custom_data?.mother_name} />
                                <DetailCell icon={<FiMapPin size={13} />} label="Current City" value={details.custom_data?.current_city} />
                                <DetailCell
                                  icon={<FiCheck size={13} />}
                                  label="Marital Status"
                                  value={details.custom_data?.marital_status
                                    ? details.custom_data.marital_status.charAt(0).toUpperCase() + details.custom_data.marital_status.slice(1)
                                    : '—'}
                                />
                                <div className="sm:col-span-2">
                                  <DetailCell icon={<FiSearch size={13} />} label="Main Scan Focus" value={details.custom_data?.scan_focus} />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <DetailCell icon={<FiCalendar size={13} />} label="Date of Birth" value={details.birth_date} />
                                <DetailCell icon={<FiClock size={13} />} label="Time of Birth" value={details.birth_time} />
                                <DetailCell icon={<FiMapPin size={13} />} label="Place of Birth" value={details.birth_place} />
                              </div>
                            )}

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
                                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-all hover:bg-white/10 border-white/10 bg-white/5 text-white/60"
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
                                    const memberPhoto = booking.attachments?.find((a) => a.description === memberKey)
                                    return (
                                      <div key={idx} className="rounded-xl p-4 border text-sm border-white/5 bg-white/[0.02]">
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

      {/* ── Edit Form 1 Modal ─────────────────────────────────────────── */}
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
                <h3 className="text-white font-bold text-lg">Edit Booking Details (Form 1)</h3>
                <button onClick={() => setEditForm1Modal(null)} className="text-white/30 hover:text-white/60 transition-colors">
                  <FiX size={20} />
                </button>
              </div>
              <p className="text-white/40 text-sm mb-5">
                Booking <span className="text-white/70 font-mono">{editForm1Modal.booking_id}</span> — {editForm1Modal.full_name}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <ModalField label="Full Name" icon={<FiUser size={13} />}>
                  <input value={form1Data.full_name || ''} onChange={e => setForm1Data(p => ({ ...p, full_name: e.target.value }))} className="modal-input" placeholder="Full name" />
                </ModalField>
                <ModalField label="Email" icon={<FiMail size={13} />}>
                  <input type="email" value={form1Data.email || ''} onChange={e => setForm1Data(p => ({ ...p, email: e.target.value }))} className="modal-input" placeholder="Email" />
                </ModalField>

                <div className="sm:col-span-2">
                  <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Phone Number</label>
                  <div className="flex">
                    <div className="relative shrink-0">
                      <FiPhone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input value={form1Data.phone_country_code || ''} onChange={e => setForm1Data(p => ({ ...p, phone_country_code: e.target.value }))} className="modal-input !w-20 !pl-8 !rounded-r-none !border-r-0" placeholder="+1" />
                    </div>
                    <input value={form1Data.phone_number || ''} onChange={e => setForm1Data(p => ({ ...p, phone_number: e.target.value }))} className="modal-input flex-1 min-w-0 !rounded-l-none" placeholder="Phone number" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Address</label>
                  <textarea value={form1Data.address || ''} onChange={e => setForm1Data(p => ({ ...p, address: e.target.value }))} className="modal-input resize-none" rows={2} placeholder="Street address" />
                </div>

                <ModalField label="Country" icon={<FiGlobe size={13} />}>
                  <input value={form1Data.country || ''} onChange={e => setForm1Data(p => ({ ...p, country: e.target.value }))} className="modal-input" placeholder="Country" />
                </ModalField>
                <ModalField label="State / Province" icon={<FiMapPin size={13} />}>
                  <input value={form1Data.state || ''} onChange={e => setForm1Data(p => ({ ...p, state: e.target.value }))} className="modal-input" placeholder="State" />
                </ModalField>
                <ModalField label="City" icon={<FiMapPin size={13} />}>
                  <input value={form1Data.city || ''} onChange={e => setForm1Data(p => ({ ...p, city: e.target.value }))} className="modal-input" placeholder="City" />
                </ModalField>
                <ModalField label="Postal Code" icon={<FiMapPin size={13} />}>
                  <input value={form1Data.postal_code || ''} onChange={e => setForm1Data(p => ({ ...p, postal_code: e.target.value }))} className="modal-input" placeholder="Postal code" />
                </ModalField>

                <div className="sm:col-span-2">
                  <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Special Note</label>
                  <textarea value={form1Data.special_note || ''} onChange={e => setForm1Data(p => ({ ...p, special_note: e.target.value }))} className="modal-input resize-none" rows={3} placeholder="Special notes…" />
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

      {/* ── Edit Form 2 Modal ─────────────────────────────────────────── */}
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
                <h3 className="text-white font-bold text-lg">Edit Submitted Details (Form 2)</h3>
                <button onClick={() => setEditForm2Modal(null)} className="text-white/30 hover:text-white/60 transition-colors">
                  <FiX size={20} />
                </button>
              </div>
              <p className="text-white/40 text-sm mb-5">
                Booking <span className="text-white/70 font-mono">{editForm2Modal.booking_id}</span> — {editForm2Modal.full_name}
              </p>

              {(() => {
                const svcType = editForm2Modal.service_type || editForm2Modal.service?.service_type || editForm2Modal.selected_service
                const isSingle = svcType === 'single_aura'
                return isSingle ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <ModalField label="Full Name" icon={<FiUser size={13} />}>
                      <input value={form2Data.full_name || ''} onChange={e => setForm2Data(p => ({ ...p, full_name: e.target.value }))} className="modal-input" placeholder="Full name" />
                    </ModalField>
                    <ModalField label="Mother's Name" icon={<FiUsers size={13} />}>
                      <input value={form2Data.mother_name || ''} onChange={e => setForm2Data(p => ({ ...p, mother_name: e.target.value }))} className="modal-input" placeholder="Mother's full name" />
                    </ModalField>
                    <ModalField label="Current City of Residence" icon={<FiMapPin size={13} />}>
                      <input value={form2Data.current_city || ''} onChange={e => setForm2Data(p => ({ ...p, current_city: e.target.value }))} className="modal-input" placeholder="Current city" />
                    </ModalField>
                    <ModalField label="Marital Status" icon={<FiCheck size={13} />}>
                      <select value={form2Data.marital_status || ''} onChange={e => setForm2Data(p => ({ ...p, marital_status: e.target.value }))} className="modal-input">
                        <option value="">Select…</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </ModalField>
                    <div className="sm:col-span-2">
                      <ModalField label="Main Aspects to Focus" icon={<FiSearch size={13} />}>
                        <input value={form2Data.scan_focus || ''} onChange={e => setForm2Data(p => ({ ...p, scan_focus: e.target.value }))} className="modal-input" placeholder="e.g. Health, Finance, Career…" />
                      </ModalField>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Additional Notes</label>
                      <textarea value={form2Data.additional_notes || ''} onChange={e => setForm2Data(p => ({ ...p, additional_notes: e.target.value }))} className="modal-input resize-none" rows={3} placeholder="Additional notes…" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <ModalField label="Date of Birth" icon={<FiCalendar size={13} />}>
                      <input type="date" value={form2Data.birth_date || ''} onChange={e => setForm2Data(p => ({ ...p, birth_date: e.target.value }))} className="modal-input" />
                    </ModalField>
                    <ModalField label="Time of Birth" icon={<FiClock size={13} />}>
                      <input type="time" value={form2Data.birth_time || ''} onChange={e => setForm2Data(p => ({ ...p, birth_time: e.target.value }))} className="modal-input" />
                    </ModalField>
                    <ModalField label="Place of Birth" icon={<FiMapPin size={13} />}>
                      <input value={form2Data.birth_place || ''} onChange={e => setForm2Data(p => ({ ...p, birth_place: e.target.value }))} className="modal-input" placeholder="City, Country" />
                    </ModalField>
                    <div className="sm:col-span-3">
                      <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Additional Notes</label>
                      <textarea value={form2Data.additional_notes || ''} onChange={e => setForm2Data(p => ({ ...p, additional_notes: e.target.value }))} className="modal-input resize-none" rows={3} placeholder="Additional notes…" />
                    </div>
                    {form2Data.family_member_details !== '' && (
                      <>
                        <ModalField label="Family Member Count" icon={<FiUsers size={13} />}>
                          <input type="number" value={form2Data.family_member_count ?? ''} onChange={e => setForm2Data(p => ({ ...p, family_member_count: e.target.value }))} className="modal-input" placeholder="0" />
                        </ModalField>
                        <div className="sm:col-span-3">
                          <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Family Member Details (JSON)</label>
                          <textarea value={form2Data.family_member_details || ''} onChange={e => setForm2Data(p => ({ ...p, family_member_details: e.target.value }))} className="modal-input resize-none font-mono text-xs" rows={6} placeholder='[{"name":"...","relation":"...","dob":"..."}]' />
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

              {/* Uploaded Images */}
              {editForm2Modal.attachments?.length > 0 && (
                <div className="mb-6 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FiImage size={12} /> Uploaded Images ({editForm2Modal.attachments.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {editForm2Modal.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/5 hover:border-white/20 transition-all"
                      >
                        <img
                          src={att.file}
                          alt={att.description || att.file_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.parentElement.classList.add('flex', 'items-center', 'justify-center')
                            e.target.parentElement.innerHTML = `<div class="text-center p-3"><div class="text-white/20 mb-1"><svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div><p class="text-white/30 text-xs truncate">${att.file_name}</p></div>`
                          }}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <FiExternalLink className="text-white" size={20} />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-white text-xs truncate">{att.description || att.file_name}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveForm2}
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

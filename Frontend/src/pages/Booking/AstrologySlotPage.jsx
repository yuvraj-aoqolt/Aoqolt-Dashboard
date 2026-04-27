/**
 * AstrologySlotPage
 *
 * Step shown AFTER the astrology form-2 is submitted.
 * Route: /astrology/schedule/:bookingId
 *
 * Flow:
 *  1. Auto-detect user timezone (overridable)
 *  2. Show 14-day date strip
 *  3. Fetch slots for selected date
 *  4. User picks a slot → POST /api/v1/astrology/schedule/
 *  5. Redirect to /booking/success
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  FiClock, FiCalendar, FiGlobe, FiCheck, FiArrowRight, FiLoader,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'
import Navbar from '../../components/Navbar'
import {
  astrologyAPI,
  detectTimezone,
  formatTimeInTz,
  formatDateLabel,
  getUpcomingDates,
} from '../../api/astrology'

const DATES_VISIBLE = 7   // how many date pills visible at once

export default function AstrologySlotPage() {
  const { bookingId } = useParams()
  const navigate      = useNavigate()

  const clientTz = useMemo(() => detectTimezone(), [])
  const [dates]                            = useState(() => getUpcomingDates(21))
  const [dateOffset,    setDateOffset]     = useState(0)
  const [selectedDate,  setSelectedDate]   = useState(dates[0])
  const [slots,         setSlots]          = useState([])
  const [loadingSlots,  setLoadingSlots]   = useState(false)
  const [selectedSlot,  setSelectedSlot]   = useState(null)
  const [submitting,    setSubmitting]     = useState(false)
  const [alreadyBooked, setAlreadyBooked]  = useState(null)  // existing schedule

  // Check if this booking already has a schedule
  useEffect(() => {
    astrologyAPI.listSchedules()
      .then(({ data }) => {
        const schedules = data.results || []
        const mine = schedules.find(s => s.booking === bookingId)
        if (mine) setAlreadyBooked(mine)
      })
      .catch(() => {})
  }, [bookingId])

  // Load slots whenever date or timezone changes
  const loadSlots = useCallback(() => {
    if (!selectedDate) return
    setLoadingSlots(true)
    setSelectedSlot(null)
    astrologyAPI.getSlots(selectedDate, clientTz)
      .then(({ data }) => setSlots(data.slots || []))
      .catch(() => { toast.error('Could not load slots'); setSlots([]) })
      .finally(() => setLoadingSlots(false))
  }, [selectedDate, clientTz])

  useEffect(() => { loadSlots() }, [loadSlots])

  const handleBook = async () => {
    if (!selectedSlot) return
    setSubmitting(true)
    try {
      await astrologyAPI.bookSlot(bookingId, selectedSlot.start_utc, clientTz)
      toast.success('Appointment confirmed!')
      navigate('/booking/success', { replace: true, state: { bookingId } })
    } catch (err) {
      const msg = err.response?.data?.error || 'Booking failed. Please try again.'
      toast.error(msg)
      if (err.response?.status === 409) loadSlots()   // refresh if slot taken
    } finally {
      setSubmitting(false)
    }
  }

  const visibleDates = dates.slice(dateOffset, dateOffset + DATES_VISIBLE)
  const canPrev = dateOffset > 0
  const canNext = dateOffset + DATES_VISIBLE < dates.length

  return (
    <div className="min-h-screen bg-dark">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-green-900/30 text-green-400 border border-green-800/30 rounded-full px-3 py-1">
                <FiCheck size={11} /> Details Submitted
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <GiCrystalBall className="text-purple-400" />
              Schedule Your Session
            </h1>
            <p className="text-white/60 text-base">
              Pick a convenient date and time for your astrology consultation.
            </p>
          </motion.div>

          {/* Steps */}
          <div className="flex items-center gap-3 mb-8">
            {['Booking', 'Payment', 'Details', 'Schedule'].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 text-sm font-medium ${i === 3 ? 'text-purple-400' : 'text-green-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs
                    ${i === 3
                      ? 'border-purple-600/50 bg-purple-950/50 text-purple-400'
                      : 'border-green-700/40 bg-green-900/30 text-green-400'}`}>
                    {i < 3 ? <FiCheck size={10} /> : i + 1}
                  </div>
                  {step}
                </div>
                {i < 3 && <div className="w-6 h-px bg-white/10" />}
              </div>
            ))}
          </div>

          {/* Already booked banner */}
          {alreadyBooked && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl border border-green-900/30 bg-green-900/10 flex items-start gap-3"
            >
              <FiCheck size={16} className="text-green-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-green-400 font-medium text-sm">You already have an appointment</p>
                <p className="text-white/50 text-xs mt-1">
                  {formatTimeInTz(alreadyBooked.appointment_start, clientTz)}
                  {' – '}
                  {formatTimeInTz(alreadyBooked.appointment_end, clientTz)}
                  {' on '}
                  {formatDateLabel(alreadyBooked.appointment_start.substring(0, 10))}
                </p>
                <p className="text-white/30 text-xs mt-0.5">You can still reschedule below.</p>
              </div>
            </motion.div>
          )}

          <div className="space-y-6">

            {/* Timezone — auto-detected, read-only */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass rounded-2xl border border-white/5 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <FiGlobe size={14} className="text-purple-400" />
                <span className="text-white/60 text-xs uppercase tracking-wider">Your Timezone</span>
                <span className="ml-auto text-[10px] bg-green-900/20 text-green-400 border border-green-900/30 px-2 py-0.5 rounded-full">
                  Auto-detected
                </span>
              </div>
              <p className="text-white/80 text-sm font-medium">{clientTz}</p>
              <p className="text-white/25 text-xs mt-1.5">
                All slot times below are shown in this timezone.
              </p>
            </motion.div>

            {/* Date strip */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl border border-white/5 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <FiCalendar size={14} className="text-purple-400" />
                <span className="text-white/60 text-xs uppercase tracking-wider">Select Date</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDateOffset(o => o - 1)}
                  disabled={!canPrev}
                  className="p-2 rounded-lg border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-all disabled:opacity-20"
                >
                  <FiChevronLeft size={16} />
                </button>
                <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${DATES_VISIBLE}, 1fr)` }}>
                  {visibleDates.map((d) => {
                    const [, , dayNum] = d.split('-')
                    const label = new Date(d + 'T00:00:00')
                      .toLocaleDateString('en-US', { weekday: 'short' })
                    const isSelected = d === selectedDate
                    return (
                      <button
                        key={d}
                        onClick={() => setSelectedDate(d)}
                        className={`flex flex-col items-center py-2.5 px-1 rounded-xl border text-xs transition-all
                          ${isSelected
                            ? 'border-purple-600/60 bg-purple-900/30 text-purple-300'
                            : 'border-white/5 bg-white/[0.02] text-white/40 hover:border-white/15 hover:text-white/60'}`}
                      >
                        <span className="font-medium">{label}</span>
                        <span className={`text-base font-bold mt-0.5 ${isSelected ? 'text-purple-300' : 'text-white/70'}`}>
                          {parseInt(dayNum)}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setDateOffset(o => o + 1)}
                  disabled={!canNext}
                  className="p-2 rounded-lg border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-all disabled:opacity-20"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            </motion.div>

            {/* Slots grid */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass rounded-2xl border border-white/5 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <FiClock size={14} className="text-purple-400" />
                <span className="text-white/60 text-xs uppercase tracking-wider">
                  Available Slots — {formatDateLabel(selectedDate)}
                </span>
              </div>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-10 gap-2 text-white/30">
                  <FiLoader size={18} className="animate-spin" />
                  <span className="text-sm">Loading slots…</span>
                </div>
              ) : slots.length === 0 ? (
                <p className="text-center py-10 text-white/20 text-sm">
                  No slots available for this date.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <AnimatePresence>
                    {slots.map((slot, i) => {
                      const isSelected = selectedSlot?.start_utc === slot.start_utc
                      return (
                        <motion.button
                          key={slot.start_utc}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.02 }}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot)}
                          className={`relative py-3 px-4 rounded-xl border text-sm font-medium transition-all
                            ${!slot.available
                              ? 'border-white/5 bg-white/[0.01] text-white/15 cursor-not-allowed line-through'
                              : isSelected
                                ? 'border-purple-500/60 bg-purple-900/30 text-purple-300 ring-1 ring-purple-500/30'
                                : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-purple-700/40 hover:bg-purple-950/20 hover:text-white/90'
                            }`}
                        >
                          {isSelected && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                              <FiCheck size={9} className="text-white" />
                            </span>
                          )}
                          <span className="block">{slot.start_local}</span>
                          <span className="block text-xs mt-0.5 opacity-60">– {slot.end_local}</span>
                        </motion.button>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>

            {/* Confirm button */}
            <motion.button
              onClick={handleBook}
              disabled={!selectedSlot || submitting}
              whileHover={selectedSlot && !submitting ? { scale: 1.02 } : {}}
              whileTap={selectedSlot && !submitting ? { scale: 0.98 } : {}}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-semibold transition-all
                bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500
                text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Confirming…
                </>
              ) : (
                <>
                  Confirm Appointment <FiArrowRight size={18} />
                </>
              )}
            </motion.button>

            {selectedSlot && (
              <p className="text-center text-white/40 text-sm -mt-3">
                Selected: <span className="text-purple-400 font-medium">
                  {formatDateLabel(selectedDate)} · {selectedSlot.start_local} – {selectedSlot.end_local}
                </span>
                {' '}({clientTz})
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}




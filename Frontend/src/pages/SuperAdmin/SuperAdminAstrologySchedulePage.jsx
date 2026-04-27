/**
 * SuperAdminAstrologySchedulePage
 *
 * Two-tab layout:
 *   Tab 1 — Availability: Set timezone, weekly hours, session/cooldown duration
 *   Tab 2 — Appointments: View all scheduled astrology sessions
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  FiClock, FiCalendar, FiGlobe, FiSave, FiCheck, FiX,
  FiPlus, FiTrash2, FiUser, FiRefreshCw,
} from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'
import SuperAdminLayout from './SuperAdminLayout'
import LoadingScreen from '../../components/LoadingScreen'
import {
  astrologyAPI,
  formatTimeInTz,
  formatDateLabel,
} from '../../api/astrology'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }

const DEFAULT_SCHEDULE = Object.fromEntries(DAYS.map(d => [d, []]))

const POPULAR_TZ = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore',
  'Asia/Tokyo', 'Australia/Sydney',
]

const statusBadge = (s) => ({
  confirmed:  'bg-green-900/30 text-green-400 border-green-800/30',
  pending:    'bg-yellow-900/30 text-yellow-400 border-yellow-800/30',
  cancelled:  'bg-red-900/30 text-red-400 border-red-800/30',
})[s] || 'bg-white/5 text-white/40 border-white/10'

export default function SuperAdminAstrologySchedulePage() {
  const [tab, setTab] = useState('availability')

  // ── Availability state ────────────────────────────────────────────────
  const [avail, setAvail] = useState(null)
  const [loadingAvail, setLoadingAvail] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    timezone: 'UTC',
    session_duration: 30,
    cooldown_time: 10,
    weekly_schedule: { ...DEFAULT_SCHEDULE },
  })

  // ── Appointments state ────────────────────────────────────────────────
  const [schedules, setSchedules] = useState([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [cancelling, setCancelling] = useState(null)

  useEffect(() => {
    astrologyAPI.getAvailability()
      .then(({ data }) => {
        const d = data.data || data
        setAvail(d)
        setForm({
          timezone:         d.timezone         || 'UTC',
          session_duration: d.session_duration || 30,
          cooldown_time:    d.cooldown_time    || 10,
          weekly_schedule:  { ...DEFAULT_SCHEDULE, ...(d.weekly_schedule || {}) },
        })
      })
      .catch(() => toast.error('Failed to load availability'))
      .finally(() => setLoadingAvail(false))
  }, [])

  const loadSchedules = () => {
    setLoadingSchedules(true)
    astrologyAPI.listSchedules()
      .then(({ data }) => setSchedules(data.results || []))
      .catch(() => toast.error('Failed to load schedules'))
      .finally(() => setLoadingSchedules(false))
  }

  useEffect(() => {
    if (tab === 'appointments') loadSchedules()
  }, [tab])

  // ── Save availability ─────────────────────────────────────────────────
  const handleSaveAvailability = async () => {
    setSaving(true)
    try {
      const { data } = await astrologyAPI.updateAvailability(form)
      setAvail(data.data || data)
      toast.success('Availability saved')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Day schedule helpers ──────────────────────────────────────────────
  const addRange = (day) => {
    setForm(f => ({
      ...f,
      weekly_schedule: {
        ...f.weekly_schedule,
        [day]: [...(f.weekly_schedule[day] || []), '09:00-17:00'],
      },
    }))
  }

  const updateRange = (day, idx, value) => {
    setForm(f => {
      const ranges = [...(f.weekly_schedule[day] || [])]
      ranges[idx] = value
      return { ...f, weekly_schedule: { ...f.weekly_schedule, [day]: ranges } }
    })
  }

  const removeRange = (day, idx) => {
    setForm(f => {
      const ranges = (f.weekly_schedule[day] || []).filter((_, i) => i !== idx)
      return { ...f, weekly_schedule: { ...f.weekly_schedule, [day]: ranges } }
    })
  }

  const toggleDay = (day) => {
    const current = form.weekly_schedule[day] || []
    if (current.length === 0) {
      addRange(day)
    } else {
      setForm(f => ({
        ...f,
        weekly_schedule: { ...f.weekly_schedule, [day]: [] },
      }))
    }
  }

  // ── Cancel appointment ─────────────────────────────────────────────────
  const handleCancel = async (scheduleId) => {
    setCancelling(scheduleId)
    try {
      await astrologyAPI.cancelSchedule(scheduleId)
      setSchedules(prev => prev.map(s =>
        s.id === scheduleId ? { ...s, status: 'cancelled' } : s
      ))
      toast.success('Appointment cancelled')
    } catch {
      toast.error('Failed to cancel')
    } finally {
      setCancelling(null)
    }
  }

  if (loadingAvail) return <LoadingScreen />

  return (
    <SuperAdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Page header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
              <GiCrystalBall className="text-purple-400" size={22} />
              Astrology Scheduling
            </h1>
            <p className="text-white/30 text-sm mt-1">Manage availability and client appointments</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit mb-6">
          {[
            { key: 'availability', label: 'Availability', icon: <FiClock size={14} /> },
            { key: 'appointments', label: 'Appointments', icon: <FiCalendar size={14} /> },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === t.key
                  ? 'bg-purple-700/50 text-purple-300 border border-purple-600/30'
                  : 'text-white/40 hover:text-white/60'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── Availability tab ─────────────────────────────────────── */}
          {tab === 'availability' && (
            <motion.div
              key="avail"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* Settings card */}
              <div className="glass rounded-2xl border border-white/5 p-6">
                <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
                  <FiGlobe size={15} className="text-purple-400" /> Session Settings
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">
                      Your Timezone
                    </label>
                    <input
                      value={form.timezone}
                      onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                      className="modal-input"
                      placeholder="e.g. Asia/Kolkata"
                      list="admin-tz-list"
                    />
                    <datalist id="admin-tz-list">
                      {POPULAR_TZ.map(t => <option key={t} value={t} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">
                      Session Duration (min)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={120}
                      value={form.session_duration}
                      onChange={e => setForm(f => ({ ...f, session_duration: parseInt(e.target.value) || 30 }))}
                      className="modal-input"
                    />
                  </div>
                  <div>
                    <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">
                      Cooldown / Gap (min)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={form.cooldown_time}
                      onChange={e => setForm(f => ({ ...f, cooldown_time: parseInt(e.target.value) || 10 }))}
                      className="modal-input"
                    />
                  </div>
                </div>
              </div>

              {/* Weekly schedule */}
              <div className="glass rounded-2xl border border-white/5 p-6">
                <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
                  <FiCalendar size={15} className="text-purple-400" /> Weekly Schedule
                </h2>
                <p className="text-white/30 text-xs mb-5">Times are in your timezone ({form.timezone})</p>

                <div className="space-y-3">
                  {DAYS.map(day => {
                    const ranges  = form.weekly_schedule[day] || []
                    const isActive = ranges.length > 0
                    return (
                      <div key={day} className="border border-white/5 rounded-xl p-4 bg-white/[0.01]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {/* Toggle */}
                            <button
                              onClick={() => toggleDay(day)}
                              className={`w-8 h-5 rounded-full transition-all flex items-center ${isActive ? 'bg-purple-600' : 'bg-white/10'}`}
                            >
                              <span className={`w-3.5 h-3.5 rounded-full bg-white transition-all mx-0.5 ${isActive ? 'translate-x-3' : 'translate-x-0'}`} />
                            </button>
                            <span className={`text-sm font-medium capitalize ${isActive ? 'text-white' : 'text-white/30'}`}>
                              {day.charAt(0).toUpperCase() + day.slice(1)}
                            </span>
                          </div>
                          {isActive && (
                            <button
                              onClick={() => addRange(day)}
                              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                            >
                              <FiPlus size={12} /> Add Range
                            </button>
                          )}
                        </div>

                        {isActive && (
                          <div className="space-y-2 pl-11">
                            {ranges.map((range, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  value={range}
                                  onChange={e => updateRange(day, idx, e.target.value)}
                                  placeholder="09:00-17:00"
                                  className="modal-input flex-1 text-sm font-mono"
                                />
                                <button
                                  onClick={() => removeRange(day, idx)}
                                  className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                                >
                                  <FiTrash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {!isActive && (
                          <p className="pl-11 text-white/20 text-xs">Off</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Save */}
              <button
                onClick={handleSaveAvailability}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                  bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500
                  text-white transition-all disabled:opacity-50"
              >
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <FiSave size={15} />}
                Save Availability
              </button>
            </motion.div>
          )}

          {/* ── Appointments tab ──────────────────────────────────────── */}
          {tab === 'appointments' && (
            <motion.div
              key="appts"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="flex justify-end mb-4">
                <button
                  onClick={loadSchedules}
                  disabled={loadingSchedules}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  <FiRefreshCw size={12} className={loadingSchedules ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              {loadingSchedules ? (
                <div className="flex items-center justify-center py-16 gap-2 text-white/30">
                  <FiRefreshCw size={18} className="animate-spin" />
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-16 text-white/20 text-sm">
                  No scheduled appointments yet
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="glass rounded-2xl border border-white/5 p-5"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-purple-900/30 border border-purple-800/30 flex items-center justify-center shrink-0">
                            <FiUser size={16} className="text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{s.client_name || '—'}</p>
                            <p className="text-white/40 text-xs font-mono">{s.booking_id}</p>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <span className="flex items-center gap-1 text-white/60 text-xs">
                                <FiCalendar size={11} />
                                {formatDateLabel(s.appointment_start.substring(0, 10))}
                              </span>
                              <span className="flex items-center gap-1 text-white/60 text-xs">
                                <FiClock size={11} />
                                {formatTimeInTz(s.appointment_start, form.timezone)}
                                {' – '}
                                {formatTimeInTz(s.appointment_end, form.timezone)}
                                {' '}
                                <span className="text-white/30">({form.timezone})</span>
                              </span>
                              <span className="flex items-center gap-1 text-white/30 text-xs">
                                <FiGlobe size={11} />
                                Client: {s.client_timezone}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs capitalize border ${statusBadge(s.status)}`}>
                            {s.status}
                          </span>
                          {s.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancel(s.id)}
                              disabled={cancelling === s.id}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400
                                border border-red-900/20 hover:border-red-700/40 rounded-xl transition-all disabled:opacity-40"
                            >
                              {cancelling === s.id
                                ? <span className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                : <FiX size={11} />}
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </SuperAdminLayout>
  )
}

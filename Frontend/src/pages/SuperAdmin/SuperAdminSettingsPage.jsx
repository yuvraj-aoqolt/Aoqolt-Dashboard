import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSave, FiX, FiEye, FiEyeOff, FiShield, FiClock, FiLock, FiCheck } from 'react-icons/fi'
import SuperAdminLayout from './SuperAdminLayout'
import { accountsAPI, authAPI } from '../../api'

// ── Toggle Switch ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-red-600' : 'bg-white/15'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ── Setting Input ─────────────────────────────────────────────────────────
function SettingInput({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-white/50 text-xs font-medium mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-red-600/50 transition-colors"
      />
    </div>
  )
}

// ── Section Card ──────────────────────────────────────────────────────────
function SectionCard({ title, children }) {
  return (
    <div className="glass rounded-2xl border border-white/5 p-6">
      <h2 className="text-white font-semibold text-base mb-5">{title}</h2>
      {children}
    </div>
  )
}

// ── Change Password Modal ─────────────────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [show, setShow] = useState({ old: false, new: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const toggleShow = (key) => () => setShow((s) => ({ ...s, [key]: !s[key] }))

  async function submit(e) {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) {
      setError("New passwords don't match.")
      return
    }
    setError('')
    setLoading(true)
    try {
      await authAPI.changePassword({
        old_password: form.old_password,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      })
      setSuccess(true)
      setTimeout(onClose, 1800)
    } catch (err) {
      const data = err.response?.data
      setError(
        typeof data === 'string' ? data :
        data?.old_password?.[0] || data?.new_password?.[0] || data?.non_field_errors?.[0] || data?.detail || 'Password change failed.'
      )
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'old_password',     label: 'Current Password',      showKey: 'old'     },
    { key: 'new_password',     label: 'New Password',          showKey: 'new'     },
    { key: 'confirm_password', label: 'Confirm New Password',  showKey: 'confirm' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass rounded-2xl border border-white/8 p-7 shadow-2xl"
        style={{ backgroundColor: 'var(--color-dark-2, #111)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 flex items-center justify-center">
              <FiLock size={15} className="text-red-400" />
            </div>
            <h3 className="text-white font-semibold text-base">Change Password</h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <FiX size={18} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <FiCheck size={22} className="text-green-400" />
            </div>
            <p className="text-green-400 font-medium">Password changed successfully!</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            {fields.map(({ key, label, showKey }) => (
              <div key={key}>
                <label className="block text-white/50 text-xs font-medium mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    type={show[showKey] ? 'text' : 'password'}
                    value={form[key]}
                    onChange={setField(key)}
                    required
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 pr-10 text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-red-600/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={toggleShow(showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                  >
                    {show[showKey] ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                </div>
              </div>
            ))}

            {error && (
              <p className="text-red-400 text-xs bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 mt-1">
              <button
                type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/50 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Login History Modal ───────────────────────────────────────────────────
function LoginHistoryModal({ user, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass rounded-2xl border border-white/8 p-7 shadow-2xl"
        style={{ backgroundColor: 'var(--color-dark-2, #111)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <FiClock size={15} className="text-blue-400" />
            </div>
            <h3 className="text-white font-semibold text-base">Login History</h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <FiX size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="glass rounded-xl border border-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm font-medium">Current Session</p>
                <p className="text-white/35 text-xs mt-0.5">{user?.email || 'Super Admin'}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg bg-green-900/30 text-green-400">
                Active
              </span>
            </div>
            {user?.last_login && (
              <p className="text-white/25 text-xs mt-2.5">
                Last login: {new Date(user.last_login).toLocaleString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </div>
          <p className="text-white/20 text-xs text-center pt-1">
            Detailed login history tracking is not yet enabled.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── 2FA Coming Soon Modal ─────────────────────────────────────────────────
function TwoFAModal({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm glass rounded-2xl border border-white/8 p-8 shadow-2xl text-center"
        style={{ backgroundColor: 'var(--color-dark-2, #111)' }}
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-purple-600/20 flex items-center justify-center">
          <FiShield size={24} className="text-purple-400" />
        </div>
        <h3 className="text-white font-semibold text-base mb-2">Two-Factor Authentication</h3>
        <p className="text-white/40 text-sm mb-6 leading-relaxed">
          2FA setup is coming soon. This feature will add an extra layer of security to your superadmin account.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl bg-white/8 text-white/60 text-sm font-medium hover:bg-white/12 hover:text-white/80 transition-colors"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
const LS_KEY = 'aoqolt_platform_settings'
const DEFAULT_PLATFORM = { platformName: 'Aoqolt', supportEmail: 'support@aoqolt.com', contactPhone: '+1 395305 3949' }

export default function SuperAdminSettingsPage() {
  const [general,      setGeneral]      = useState(DEFAULT_PLATFORM)
  const [savedGeneral, setSavedGeneral] = useState(DEFAULT_PLATFORM)
  const [notifs,       setNotifs]       = useState({ email: true, sms: false, push: true })
  const [savedNotifs,  setSavedNotifs]  = useState({ email: true, sms: false, push: true })
  const [user,         setUser]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState(null)   // { msg, type }
  const [modal,        setModal]        = useState(null)   // 'password' | 'history' | '2fa'

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
      const merged = { ...DEFAULT_PLATFORM, ...stored }
      setGeneral(merged)
      setSavedGeneral(merged)
    } catch {}

    Promise.allSettled([accountsAPI.getProfile(), accountsAPI.me()]).then(([profileRes, meRes]) => {
      if (profileRes.status === 'fulfilled') {
        const p = profileRes.value.data
        const n = {
          email: p.email_notifications ?? true,
          sms:   p.sms_notifications   ?? false,
          push:  p.notification_enabled ?? true,
        }
        setNotifs(n)
        setSavedNotifs(n)
      }
      if (meRes.status === 'fulfilled') setUser(meRes.value.data)
    }).finally(() => setLoading(false))
  }, [])

  const setG = (key) => (val) => setGeneral((g) => ({ ...g, [key]: val }))
  const setN = (key) => (val) => setNotifs((n) => ({ ...n, [key]: val }))

  function handleCancel() {
    setGeneral(savedGeneral)
    setNotifs(savedNotifs)
  }

  async function handleSave() {
    setSaving(true)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(general))
      setSavedGeneral(general)

      await accountsAPI.updateProfile({
        email_notifications: notifs.email,
        sms_notifications:   notifs.sms,
        notification_enabled: notifs.push,
      })
      setSavedNotifs(notifs)
      showToast('Settings saved successfully.')
    } catch {
      showToast('Failed to save notification preferences.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const notifRows = [
    { key: 'email', label: 'Email Notification', desc: 'Receive email update for new booking' },
    { key: 'sms',   label: 'SMS Notification',   desc: 'Receive SMS alert for urgent matters' },
    { key: 'push',  label: 'Push Notification',  desc: 'Get browser notifications for real-time updates' },
  ]

  const securityActions = [
    { label: 'Change password',                action: () => setModal('password') },
    { label: 'Enable two factor Authentication', action: () => setModal('2fa')     },
    { label: 'View Login History',              action: () => setModal('history')  },
  ]

  return (
    <SuperAdminLayout>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/35 text-sm mt-1">Configure your platform preferences and settings</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[280, 210, 180].map((h, i) => (
            <div key={i} className="glass rounded-2xl border border-white/5 animate-pulse" style={{ height: h }} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-5"
        >
          {/* General Settings */}
          <SectionCard title="General Settings">
            <div className="flex flex-col gap-4">
              <SettingInput
                label="Platform name"
                value={general.platformName}
                onChange={setG('platformName')}
                placeholder="Platform name"
              />
              <SettingInput
                label="Support Email"
                value={general.supportEmail}
                onChange={setG('supportEmail')}
                type="email"
                placeholder="support@yourplatform.com"
              />
              <SettingInput
                label="Contact Phone"
                value={general.contactPhone}
                onChange={setG('contactPhone')}
                placeholder="+1 000 000 0000"
              />
            </div>
          </SectionCard>

          {/* Notifications */}
          <SectionCard title="Notifications">
            <div className="flex flex-col divide-y divide-white/5">
              {notifRows.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-white/80 text-sm font-medium">{label}</p>
                    <p className="text-white/35 text-xs mt-0.5">{desc}</p>
                  </div>
                  <Toggle checked={notifs[key]} onChange={setN(key)} />
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Security */}
          <SectionCard title="Security">
            <div className="flex flex-col gap-3">
              {securityActions.map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="text-left px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white hover:border-white/15 transition-all"
                >
                  {label}
                </button>
              ))}
            </div>
          </SectionCard>

          {/* Action bar */}
          <div className="flex items-center justify-end gap-3 pt-1 pb-4">
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 rounded-xl bg-white/8 text-white/60 text-sm font-medium hover:bg-white/12 hover:text-white/80 transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              <FiSave size={14} />
              {saving ? 'Saving…' : 'Save Changes'}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modal === 'password' && <ChangePasswordModal onClose={() => setModal(null)} />}
        {modal === 'history'  && <LoginHistoryModal user={user} onClose={() => setModal(null)} />}
        {modal === '2fa'      && <TwoFAModal onClose={() => setModal(null)} />}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 ${
              toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
            }`}
          >
            {toast.type === 'error' ? <FiX size={14} /> : <FiCheck size={14} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </SuperAdminLayout>
  )
}

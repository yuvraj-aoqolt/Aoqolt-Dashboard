import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { FiUser, FiMail, FiPhone, FiMapPin, FiGlobe, FiLock, FiSave, FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { authAPI, accountsAPI } from '../../api'
import DashboardLayout from './DashboardLayout'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      address: user?.address || '',
      city: user?.city || '',
      country: user?.country || '',
      postal_code: user?.postal_code || '',
    },
  })

  const { register: pwRegister, handleSubmit: pwHandleSubmit, watch, reset: pwReset, formState: { errors: pwErrors } } = useForm()
  const newPassword = watch('new_password')

  const onSave = async (values) => {
    setSaving(true)
    try {
      await updateProfile(values)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const onChangePassword = async ({ current_password, new_password, confirm_password }) => {
    if (new_password !== confirm_password) { toast.error('Passwords do not match'); return }
    setChangingPw(true)
    try {
      await authAPI.changePassword({ current_password, new_password, confirm_new_password: confirm_password })
      toast.success('Password changed!')
      pwReset()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Password change failed')
    } finally {
      setChangingPw(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return }
    setAvatarUploading(true)
    const formData = new FormData()
    formData.append('avatar', file)
    try {
      await accountsAPI.uploadAvatar(formData)
      // Refresh profile
      window.location.reload()
    } catch {
      toast.error('Failed to upload avatar')
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white mb-1">Profile Settings</h1>
          <p className="text-white/40 text-sm">Manage your account information</p>
        </motion.div>

        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-2xl border border-white/5 p-6 mb-6 flex items-center gap-5">
          <div className="relative">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-red-900/50" />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-red-700 to-red-900 rounded-full flex items-center justify-center text-white font-bold text-3xl">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-medium">{user?.full_name}</p>
            <p className="text-white/40 text-sm">{user?.email}</p>
            <label className="mt-2 inline-block cursor-pointer text-red-400 hover:text-red-300 text-xs transition-colors">
              Change Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
        </motion.div>

        {/* Profile Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass rounded-2xl border border-white/5 p-6 mb-6">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2 text-sm uppercase tracking-wider">
            <FiUser size={16} className="text-red-500" /> Personal Information
          </h3>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                  <input {...register('full_name', { required: 'Required' })} className="input-field pl-9" />
                </div>
                {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>}
              </div>

              <div>
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                  <input {...register('email')} type="email" disabled className="input-field pl-9 opacity-50 cursor-not-allowed" />
                </div>
              </div>

              <div>
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Phone</label>
                <div className="relative">
                  <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                  <input {...register('phone_number')} className="input-field pl-9" />
                </div>
              </div>

              <div>
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Country</label>
                <div className="relative">
                  <FiGlobe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                  <input {...register('country')} className="input-field pl-9" />
                </div>
              </div>

              <div>
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">City</label>
                <div className="relative">
                  <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                  <input {...register('city')} className="input-field pl-9" />
                </div>
              </div>

              <div>
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Postal Code</label>
                <div className="relative">
                  <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                  <input {...register('postal_code')} className="input-field pl-9" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Address</label>
              <textarea {...register('address')} rows={2} className="input-field resize-none" />
            </div>

            <motion.button type="submit" disabled={saving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 btn-primary px-6 py-2.5 text-sm disabled:opacity-60">
              {saving ? (
                <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Saving...</>
              ) : (
                <><FiSave size={15} />Save Changes</>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Change Password */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass rounded-2xl border border-white/5 p-6">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2 text-sm uppercase tracking-wider">
            <FiLock size={16} className="text-red-500" /> Change Password
          </h3>
          <form onSubmit={pwHandleSubmit(onChangePassword)} className="space-y-4">
            {[
              { name: 'current_password', label: 'Current Password', rules: { required: 'Required' } },
              { name: 'new_password', label: 'New Password', rules: { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } } },
              { name: 'confirm_password', label: 'Confirm New Password', rules: { required: 'Required', validate: (v) => v === newPassword || 'Passwords do not match' } },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">{field.label}</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                  <input
                    {...pwRegister(field.name, field.rules)}
                    type={showPw ? 'text' : 'password'}
                    className="input-field pl-9 pr-9"
                  />
                </div>
                {pwErrors[field.name] && <p className="text-red-400 text-xs mt-1">{pwErrors[field.name].message}</p>}
              </div>
            ))}

            <motion.button type="submit" disabled={changingPw} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 btn-primary px-6 py-2.5 text-sm disabled:opacity-60">
              {changingPw ? 'Updating...' : 'Update Password'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}

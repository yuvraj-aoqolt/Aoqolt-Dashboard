import SuperAdminLayout from './SuperAdminLayout'
import { FiSettings } from 'react-icons/fi'

export default function SuperAdminSettingsPage() {
  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/35 text-sm mt-1">Platform configuration and preferences</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-white/20">
        <FiSettings size={48} className="mb-4 text-white/10" />
        <p className="text-sm">Settings — coming soon</p>
      </div>
    </SuperAdminLayout>
  )
}

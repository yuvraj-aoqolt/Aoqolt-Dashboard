import SuperAdminLayout from './SuperAdminLayout'
import { FiMessageSquare } from 'react-icons/fi'

export default function SuperAdminChatPage() {
  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Chat</h1>
        <p className="text-white/35 text-sm mt-1">Monitor client-admin conversations</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-white/20">
        <FiMessageSquare size={48} className="mb-4 text-white/10" />
        <p className="text-sm">Chat monitor — coming soon</p>
      </div>
    </SuperAdminLayout>
  )
}

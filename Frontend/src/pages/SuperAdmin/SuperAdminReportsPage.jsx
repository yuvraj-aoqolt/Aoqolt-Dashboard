import SuperAdminLayout from './SuperAdminLayout'
import { FiBarChart2 } from 'react-icons/fi'

export default function SuperAdminReportsPage() {
  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-white/35 text-sm mt-1">Platform analytics and reports</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-white/20">
        <FiBarChart2 size={48} className="mb-4 text-white/10" />
        <p className="text-sm">Reports & Analytics — coming soon</p>
      </div>
    </SuperAdminLayout>
  )
}

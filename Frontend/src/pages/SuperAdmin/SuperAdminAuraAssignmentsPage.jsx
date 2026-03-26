import SuperAdminLayout from './SuperAdminLayout'
import { GiCrystalBall } from 'react-icons/gi'

export default function SuperAdminAuraAssignmentsPage() {
  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Aura Assignments</h1>
        <p className="text-white/35 text-sm mt-1">Manage aura reading assignments</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-white/20">
        <GiCrystalBall size={48} className="mb-4 text-white/10" />
        <p className="text-sm">Aura Assignments — coming soon</p>
      </div>
    </SuperAdminLayout>
  )
}

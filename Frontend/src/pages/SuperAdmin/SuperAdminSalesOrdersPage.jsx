import SuperAdminLayout from './SuperAdminLayout'
import { FiShoppingBag } from 'react-icons/fi'

export default function SuperAdminSalesOrdersPage() {
  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Sales Orders</h1>
        <p className="text-white/35 text-sm mt-1">Manage all sales orders</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-white/20">
        <FiShoppingBag size={48} className="mb-4 text-white/10" />
        <p className="text-sm">Sales Orders — coming soon</p>
      </div>
    </SuperAdminLayout>
  )
}

import SuperAdminLayout from './SuperAdminLayout'
import { FiDollarSign } from 'react-icons/fi'

export default function SuperAdminInvoicePage() {
  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Invoice</h1>
        <p className="text-white/35 text-sm mt-1">View and manage client invoices</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-white/20">
        <FiDollarSign size={48} className="mb-4 text-white/10" />
        <p className="text-sm">Invoice management — coming soon</p>
      </div>
    </SuperAdminLayout>
  )
}

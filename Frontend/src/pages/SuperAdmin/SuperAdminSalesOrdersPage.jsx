import { useState, useEffect, useCallback } from 'react'
import SuperAdminLayout from './SuperAdminLayout'
import { salesAPI } from '../../api/index'
import { FiShoppingBag, FiRefreshCw, FiCheckCircle } from 'react-icons/fi'

const PAYMENT_BADGE = {
  unpaid:   'bg-white/10 text-white/40',
  partial:  'bg-yellow-500/20 text-yellow-300',
  paid:     'bg-green-500/20 text-green-300',
}
const STATUS_BADGE = {
  pending:     'bg-white/10 text-white/50',
  in_progress: 'bg-blue-500/20 text-blue-300',
  completed:   'bg-green-500/20 text-green-300',
  cancelled:   'bg-red-500/20 text-red-400',
}

export default function SuperAdminSalesOrdersPage() {
  const [orders, setOrders]      = useState([])
  const [loading, setLoading]    = useState(true)
  const [completing, setComp]    = useState(null)
  const [refreshKey, setRefresh] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await salesAPI.listOrders()
      const data = res.data?.results || res.data?.data || res.data || []
      setOrders(Array.isArray(data) ? data : [])
    } catch { setOrders([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  const handleComplete = async (id) => {
    if (!window.confirm('Mark this order as completed?')) return
    setComp(id)
    try {
      const res = await salesAPI.markOrderCompleted(id)
      if (res.data?.success) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'completed' } : o))
      }
    } catch {}
    setComp(null)
  }

  return (
    <SuperAdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Orders</h1>
          <p className="text-white/35 text-sm mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setRefresh(k => k + 1)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/60"
          title="Refresh"
        >
          <FiRefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-white/20">
          <FiShoppingBag size={48} className="mb-4 text-white/10" />
          <p className="text-sm">No orders yet</p>
          <p className="text-xs mt-1 text-white/15">Orders appear after clients pay their quotes</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-white/40 uppercase tracking-wide border-b border-white/10">
                <th className="text-left py-3 pr-4 font-medium">Order</th>
                <th className="text-left py-3 pr-4 font-medium">Client</th>
                <th className="text-left py-3 pr-4 font-medium">Service</th>
                <th className="text-right py-3 pr-4 font-medium">Total</th>
                <th className="text-right py-3 pr-4 font-medium">Paid</th>
                <th className="text-center py-3 pr-4 font-medium">Payment</th>
                <th className="text-center py-3 pr-4 font-medium">Status</th>
                <th className="text-right py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-white/3 transition-colors">
                  <td className="py-3 pr-4">
                    <p className="font-mono text-xs text-white/60">{o.order_number}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">{o.quote_number}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-white font-medium">{o.client_name}</p>
                    <p className="text-xs text-white/45">{o.client_email}</p>
                  </td>
                  <td className="py-3 pr-4 text-white/60 text-xs">{o.service_name || '—'}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-white">
                    ${Number(o.total_amount || 0).toFixed(2)}
                  </td>
                  <td className="py-3 pr-4 text-right text-white/60">
                    ${Number(o.amount_paid || 0).toFixed(2)}
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PAYMENT_BADGE[o.payment_status] || 'bg-white/10 text-white/40'}`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[o.status] || 'bg-white/10 text-white/40'}`}>
                      {o.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {o.status !== 'completed' && o.status !== 'cancelled' && (
                      <button
                        onClick={() => handleComplete(o.id)}
                        disabled={completing === o.id}
                        className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-300 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <FiCheckCircle size={12} />
                        {completing === o.id ? 'Saving…' : 'Complete'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SuperAdminLayout>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SuperAdminLayout from './SuperAdminLayout'
import { FiMessageSquare, FiDollarSign, FiBell, FiTrash2 } from 'react-icons/fi'
import { useNotifications } from '../../context/NotificationContext'

const TAB_ALL     = 'all'
const TAB_CHAT    = 'chat'
const TAB_PAYMENT = 'payment'

export default function SuperAdminNotificationsPage() {
  const navigate = useNavigate()
  const { notifications, totalUnread, clearNewPayments, paymentNotifs, chatNotifs } = useNotifications() || {}
  const [tab, setTab] = useState(TAB_ALL)

  const allNotifs = notifications || []
  const visible = tab === TAB_ALL     ? allNotifs
                : tab === TAB_CHAT    ? allNotifs.filter(n => n.type === 'chat')
                : allNotifs.filter(n => n.type === 'payment')

  const chatCount    = allNotifs.filter(n => n.type === 'chat').length
  const paymentCount = allNotifs.filter(n => n.type === 'payment').length

  const DOT_ICON = {
    chat:    <FiMessageSquare size={14} className="text-blue-400" />,
    payment: <FiDollarSign    size={14} className="text-green-400" />,
  }

  return (
    <SuperAdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiBell size={22} className="text-red-400" /> Notifications
          </h1>
          <p className="text-white/35 text-sm mt-0.5">
            {totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
          </p>
        </div>
        {(paymentCount > 0) && (
          <button
            onClick={clearNewPayments}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 border border-white/10 px-3 py-1.5 rounded-xl transition-colors"
          >
            <FiTrash2 size={13} /> Clear payments
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white/[0.03] rounded-xl p-1 w-fit border border-white/5">
        {[
          { id: TAB_ALL,     label: 'All',      count: allNotifs.length },
          { id: TAB_CHAT,    label: 'Messages', count: chatCount },
          { id: TAB_PAYMENT, label: 'Payments', count: paymentCount },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-red-900/40 text-red-300 border border-red-900/40'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-red-900/60 text-red-200' : 'bg-white/10 text-white/50'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-white/5 bg-[#0d0d0d] overflow-hidden">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <FiBell size={40} className="mb-3 text-white/10" />
            <p className="text-sm">No notifications here</p>
          </div>
        ) : (
          visible.map((n, i) => (
            <div
              key={n.key}
              onClick={() => {
                if (n.type === 'chat') navigate('/superadmin/chat', { state: { openCaseId: n.case_id } })
              }}
              className={`flex items-start gap-4 px-6 py-4 border-b border-white/[0.04] transition-colors ${
                n.type === 'chat' ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'
              } ${i === visible.length - 1 ? 'border-b-0' : ''}`}
            >
              {/* Icon */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                n.type === 'chat' ? 'bg-blue-900/30' : 'bg-green-900/30'
              }`}>
                {DOT_ICON[n.type]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-white/90 text-sm font-medium">{n.title}</p>
                <p className="text-white/45 text-xs mt-0.5 truncate">{n.body}</p>
                {n.amount && (
                  <p className="text-green-400 text-sm font-semibold mt-1">{n.amount}</p>
                )}
              </div>

              {/* Time + action */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="text-white/25 text-xs">{n.time}</span>
                {n.type === 'chat' && (
                  <span className="text-blue-400/60 text-[11px] hover:text-blue-400 transition-colors">
                    Open chat →
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent payments full list */}
      {tab !== TAB_CHAT && paymentNotifs && paymentNotifs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
            All Recent Payments
          </h2>
          <div className="rounded-2xl border border-white/5 bg-[#0d0d0d] overflow-hidden">
            {paymentNotifs.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-4 px-6 py-3.5 border-b border-white/[0.04] ${
                  i === paymentNotifs.length - 1 ? 'border-b-0' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-green-900/25 flex items-center justify-center flex-shrink-0">
                  <FiDollarSign size={13} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm font-medium truncate">{p.user_name}</p>
                  <p className="text-white/35 text-xs truncate">{p.service_name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-green-400 text-sm font-semibold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency || 'USD' }).format(p.amount / 100)}
                  </p>
                  <p className="text-white/25 text-xs mt-0.5">
                    {new Date(p.paid_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SuperAdminLayout>
  )
}

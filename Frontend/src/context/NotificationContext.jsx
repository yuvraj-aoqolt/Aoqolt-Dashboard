/**
 * NotificationContext
 * Polls chat conversations (unread counts) + recent payments every 15s.
 * Only active when the logged-in user is superadmin.
 */
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatAPI, paymentsAPI } from '../api'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

// ── helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function fmtAmount(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100)
}

// ── provider ──────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superadmin'

  const [chatNotifs, setChatNotifs]       = useState([])   // { case_id, admin_name, unread_count, last_message_at }
  const [paymentNotifs, setPaymentNotifs] = useState([])   // { id, user_name, service_name, amount, currency, paid_at }
  // Track which payment IDs we have already "seen" on first load so we only badge new ones
  const seenPaymentIds = useRef(new Set())
  const [newPayments, setNewPayments]     = useState([])   // subset with truly new payments
  const pollRef = useRef(null)

  const fetchAll = useCallback(async () => {
    if (!isSuperAdmin) return
    try {
      const [convRes, payRes] = await Promise.all([
        chatAPI.getConversations(),
        paymentsAPI.recentPayments(),
      ])
      const convs = convRes.data?.data || []
      const pays  = payRes.data?.data  || []

      // Chat: keep only those with unread messages
      setChatNotifs(convs.filter(c => c.unread_count > 0))

      // Payments: on first load, seed "seen" so everything looks old
      const fetchedIds = new Set(pays.map(p => p.id))
      if (seenPaymentIds.current.size === 0) {
        // first fetch — mark all as seen, no badge
        seenPaymentIds.current = fetchedIds
        setPaymentNotifs(pays)
        setNewPayments([])
      } else {
        const fresh = pays.filter(p => !seenPaymentIds.current.has(p.id))
        fresh.forEach(p => seenPaymentIds.current.add(p.id))
        setPaymentNotifs(pays)
        if (fresh.length > 0) setNewPayments(prev => [...fresh, ...prev].slice(0, 50))
      }
    } catch { /* silent */ }
  }, [isSuperAdmin])

  useEffect(() => {
    if (!isSuperAdmin) return
    fetchAll()
    pollRef.current = setInterval(fetchAll, 15000)
    return () => clearInterval(pollRef.current)
  }, [isSuperAdmin, fetchAll])

  const totalUnread = chatNotifs.reduce((s, c) => s + c.unread_count, 0) + newPayments.length

  // Build unified notification list for the dropdown
  const notifications = [
    ...chatNotifs.map(c => ({
      type: 'chat',
      key: `chat-${c.case_id}`,
      dot: 'bg-blue-400',
      title: `${c.unread_count} new message${c.unread_count > 1 ? 's' : ''}`,
      body: `${c.admin_name} · ${c.service_name}`,
      time: timeAgo(c.last_message_at),
      case_id: c.case_id,
    })),
    ...newPayments.map(p => ({
      type: 'payment',
      key: `pay-${p.id}`,
      dot: 'bg-green-400',
      title: 'Payment received',
      body: `${p.user_name} — ${p.service_name}`,
      amount: fmtAmount(p.amount, p.currency),
      time: timeAgo(p.paid_at),
    })),
  ]

  const clearNewPayments = () => setNewPayments([])

  return (
    <NotificationContext.Provider value={{
      notifications,
      chatNotifs,
      paymentNotifs,
      newPayments,
      totalUnread,
      clearNewPayments,
      refresh: fetchAll,
      timeAgo,
      fmtAmount,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}

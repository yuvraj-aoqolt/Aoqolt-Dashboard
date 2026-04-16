/**
 * NotificationContext
 * Polls chat conversations (unread counts) + recent payments every 15s.
 * Also polls partial-overdue sales orders (15+ days since first partial payment) every 5 min.
 * Only active when the logged-in user is superadmin.
 */
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatAPI, paymentsAPI, salesAPI } from '../api'
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

function fmtDollar(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(amount) || 0)
}

// ── provider ──────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superadmin'

  const [chatNotifs, setChatNotifs]         = useState([])
  const [paymentNotifs, setPaymentNotifs]   = useState([])
  const [partialNotifs, setPartialNotifs]   = useState([])   // overdue partial payment orders

  const seenPaymentIds = useRef(new Set())
  const [newPayments, setNewPayments]       = useState([])
  const pollRef        = useRef(null)
  const partialPollRef = useRef(null)

  // ── fetch chat + recent payments (every 15 s) ─────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!isSuperAdmin) return
    try {
      const [convRes, payRes] = await Promise.all([
        chatAPI.getConversations(),
        paymentsAPI.recentPayments(),
      ])
      const convs = convRes.data?.data || []
      const pays  = payRes.data?.data  || []

      setChatNotifs(convs.filter(c => c.unread_count > 0))

      const fetchedIds = new Set(pays.map(p => p.id))
      if (seenPaymentIds.current.size === 0) {
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

  // ── fetch partial-overdue orders (every 5 min) ────────────────────────────
  const fetchPartial = useCallback(async () => {
    if (!isSuperAdmin) return
    try {
      const res = await salesAPI.partialOverdue()
      setPartialNotifs(res.data?.data || [])
    } catch { /* silent */ }
  }, [isSuperAdmin])

  useEffect(() => {
    if (!isSuperAdmin) return
    fetchAll()
    fetchPartial()
    pollRef.current        = setInterval(fetchAll,    15000)
    partialPollRef.current = setInterval(fetchPartial, 5 * 60 * 1000)
    return () => {
      clearInterval(pollRef.current)
      clearInterval(partialPollRef.current)
    }
  }, [isSuperAdmin, fetchAll, fetchPartial])

  const totalUnread = chatNotifs.reduce((s, c) => s + c.unread_count, 0)
    + newPayments.length
    + partialNotifs.length

  // ── unified notification list ─────────────────────────────────────────────
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
    ...partialNotifs.map(o => ({
      type: 'partial',
      key: `partial-${o.id}`,
      dot: 'bg-orange-400',
      title: `Partial payment overdue — ${o.days_overdue} day${o.days_overdue !== 1 ? 's' : ''}`,
      body: `${o.client_name} · ${o.service_name || o.order_number}`,
      amount: `${fmtDollar(o.amount_paid, o.currency)} of ${fmtDollar(o.total_amount, o.currency)}`,
      time: timeAgo(o.partial_since),
      order_id: o.id,
      order_number: o.order_number,
    })),
  ]

  const clearNewPayments = () => setNewPayments([])

  return (
    <NotificationContext.Provider value={{
      notifications,
      chatNotifs,
      paymentNotifs,
      newPayments,
      partialNotifs,
      totalUnread,
      clearNewPayments,
      refresh: fetchAll,
      refreshPartial: fetchPartial,
      timeAgo,
      fmtAmount,
      fmtDollar,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}

/**
 * NotificationContext
 * Uses TanStack Query with refetchInterval for polling.
 * - New centralized notifications API: every 10s
 * - Chat + payments (legacy): every 15s (backup)
 * - Partial-overdue orders: every 5 min
 * Only active when the logged-in user is superadmin.
 */
import { createContext, useContext, useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { chatAPI, paymentsAPI, salesAPI, notificationsAPI } from '../api'
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
  const queryClient  = useQueryClient()

  const seenPaymentIds = useRef(new Set())
  const [newPayments, setNewPayments] = useState([])

  // ── NEW: Centralized notifications from backend (poll every 10s) ─────────
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn:  () => notificationsAPI.recent().then(r => r.data || { data: [], total_unread: 0 }),
    enabled:  isSuperAdmin,
    refetchInterval: isSuperAdmin ? 10_000 : false,
    staleTime: 8_000,
  })

  const backendNotifications = notificationsData?.data || []
  const backendTotalUnread = notificationsData?.total_unread || 0

  // ── Chat conversations: poll every 15 s (backup/legacy) ──────────────────
  const { data: chatData = [] } = useQuery({
    queryKey: ['notifications', 'chat'],
    queryFn:  () => chatAPI.getConversations().then(r => r.data?.data || []),
    enabled:  isSuperAdmin,
    refetchInterval: isSuperAdmin ? 15_000 : false,
    staleTime: 10_000,
  })

  // ── Recent payments: poll every 15 s ─────────────────────────────────────
  const { data: paymentData = [] } = useQuery({
    queryKey: ['notifications', 'payments'],
    queryFn:  () => paymentsAPI.recentPayments().then(r => r.data?.data || []),
    enabled:  isSuperAdmin,
    refetchInterval: isSuperAdmin ? 15_000 : false,
    staleTime: 10_000,
  })

  // ── Partial-overdue orders: poll every 5 min ──────────────────────────────
  const { data: partialData = [] } = useQuery({
    queryKey: ['notifications', 'partial'],
    queryFn:  () => salesAPI.partialOverdue().then(r => r.data?.data || []),
    enabled:  isSuperAdmin,
    refetchInterval: isSuperAdmin ? 5 * 60_000 : false,
    staleTime: 4 * 60_000,
  })

  // ── Track new payments (first poll seeds the set; later polls detect new) ─
  useEffect(() => {
    if (!isSuperAdmin || !paymentData.length) return
    const fetchedIds = new Set(paymentData.map(p => p.id))
    if (seenPaymentIds.current.size === 0) {
      seenPaymentIds.current = fetchedIds
      setNewPayments([])
    } else {
      const fresh = paymentData.filter(p => !seenPaymentIds.current.has(p.id))
      fresh.forEach(p => seenPaymentIds.current.add(p.id))
      if (fresh.length > 0) setNewPayments(prev => [...fresh, ...prev].slice(0, 50))
    }
  }, [paymentData, isSuperAdmin])

  const chatNotifs    = chatData.filter(c => c.unread_count > 0)
  const paymentNotifs = paymentData
  const partialNotifs = partialData

  // ── Convert backend notifications to unified format ───────────────────────
  const convertedNotifications = backendNotifications.map(n => {
    const dotColor = {
      'CHAT': 'bg-blue-400',
      'PAYMENT': 'bg-green-400',
      'BOOKING': 'bg-purple-400',
      'CASE_UPDATE': 'bg-yellow-400',
      'PARTIAL_OVERDUE': 'bg-orange-400',
      'ADMIN_ACTION': 'bg-red-400',
      'SYSTEM': 'bg-gray-400',
    }[n.notification_type] || 'bg-blue-400'

    return {
      type: n.notification_type.toLowerCase(),
      key: `notif-${n.id}`,
      id: n.id,
      dot: dotColor,
      title: n.title,
      body: n.message,
      amount: n.metadata?.amount ? fmtDollar(n.metadata.amount, n.metadata.currency || 'USD') : null,
      time: n.time_ago || timeAgo(n.created_at),
      case_id: n.case_id,
      booking_id: n.booking_id,
      payment_id: n.payment_id,
      order_id: n.order_id,
      is_read: n.is_read,
    }
  })

  // Use backend count if available, otherwise fall back to legacy counting
  const totalUnread = backendTotalUnread > 0 
    ? backendTotalUnread 
    : chatNotifs.reduce((s, c) => s + c.unread_count, 0) + newPayments.length + partialNotifs.length

  // ── Unified notification list (prioritize backend, show legacy as backup) ─
  const notifications = convertedNotifications.length > 0 
    ? convertedNotifications
    : [
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

  const markAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markRead(notificationId)
      queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] })
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllRead()
      queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] })
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] })
    queryClient.invalidateQueries({ queryKey: ['notifications', 'chat'] })
    queryClient.invalidateQueries({ queryKey: ['notifications', 'payments'] })
  }

  const refreshPartial = () =>
    queryClient.invalidateQueries({ queryKey: ['notifications', 'partial'] })

  const val = useMemo(() => ({
    notifications,
    chatNotifs,
    paymentNotifs,
    newPayments,
    partialNotifs,
    totalUnread,
    clearNewPayments,
    markAsRead,
    markAllAsRead,
    refresh,
    refreshPartial,
    timeAgo,
    fmtAmount,
    fmtDollar,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [notifications, chatNotifs, paymentNotifs, newPayments, partialNotifs, totalUnread])

  return (
    <NotificationContext.Provider value={val}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}

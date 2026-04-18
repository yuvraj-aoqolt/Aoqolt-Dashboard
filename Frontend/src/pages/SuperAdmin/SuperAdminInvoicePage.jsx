import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiSearch, FiDownload, FiX,
  FiCheckCircle, FiClock, FiAlertCircle, FiRefreshCw,
  FiFilter, FiEye, FiShoppingCart,
} from 'react-icons/fi'
import SuperAdminLayout from './SuperAdminLayout'
import { paymentsAPI, salesAPI } from '../../api'

// ── Status maps ────────────────────────────────────────────────────────────

const STATUS_META = {
  succeeded:  { label: 'Paid',        cls: 'text-green-400 bg-green-400/10',   Icon: FiCheckCircle },
  pending:    { label: 'Pending',     cls: 'text-yellow-400 bg-yellow-400/10', Icon: FiClock       },
  processing: { label: 'Processing',  cls: 'text-blue-400 bg-blue-400/10',     Icon: FiClock       },
  partial:    { label: 'Partial',     cls: 'text-orange-400 bg-orange-400/10', Icon: FiClock       },
  failed:     { label: 'Failed',      cls: 'text-red-400 bg-red-400/10',       Icon: FiAlertCircle },
  refunded:   { label: 'Refunded',    cls: 'text-purple-400 bg-purple-400/10', Icon: FiRefreshCw   },
  cancelled:  { label: 'Cancelled',   cls: 'text-white/30 bg-white/5',         Icon: FiX           },
}

// Sales order payment_status → unified status key
const ORDER_STATUS_MAP = { paid: 'succeeded', unpaid: 'pending', partial: 'partial' }

// ── Normalise both types into a single shape ───────────────────────────────

function normalizePayment(p) {
  return {
    ...p,
    _type:            'booking',
    _ref:             p.payment_number,
    _amountDollars:   p.amount / 100,
    _date:            p.paid_at || p.created_at,
    status:           p.status,
    customer_name:    p.customer_name || '',
    customer_email:   p.customer_email || p.user_email || '',
  }
}

function normalizeOrder(o) {
  const status = ORDER_STATUS_MAP[o.payment_status] || 'pending'
  const amountDollars = parseFloat(o.total_amount) || 0
  return {
    ...o,
    _type:            'sales',
    _ref:             o.order_number,
    _amountDollars:   amountDollars,
    _date:            o.completed_at || o.updated_at || o.created_at,
    // unify field names expected by drawer / invoice generator
    payment_number:   o.order_number,
    amount_display:   `$${amountDollars.toFixed(2)}`,
    status,
    gateway:          'Sales Order',
    payment_method:   '',
    paid_at:          o.completed_at || null,
    service_name:     o.service_name || o.quote_title || '',
    service_type:     '',
    customer_name:    o.client_name || '',
    customer_email:   o.client_email || '',
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Invoice HTML generator ─────────────────────────────────────────────────

function generateInvoiceHTML(p) {
  const nowStr    = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const sm        = STATUS_META[p.status] || STATUS_META.pending
  const isSales   = p._type === 'sales'
  const amountStr = `$${p._amountDollars.toFixed(2)}`
  const refLabel  = isSales ? 'Order Number' : 'Payment #'
  const quoteLine = isSales && p.quote_number
    ? `<div class="info-row"><span class="info-label">Quote #</span><span class="info-value mono">${p.quote_number}</span></div>`
    : ''
  const gatewayLine = isSales
    ? ''
    : `<div class="info-row"><span class="info-label">Gateway</span><span class="info-value" style="text-transform:capitalize;">${p.gateway || 'Stripe'}</span></div>
       ${p.payment_method ? `<div class="info-row"><span class="info-label">Method</span><span class="info-value" style="text-transform:capitalize;">${p.payment_method}</span></div>` : ''}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${p.payment_number}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff}
    .page{max-width:760px;margin:0 auto;padding:48px 40px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
    .brand{font-size:28px;font-weight:900;color:#dc2626;letter-spacing:-0.5px}
    .brand span{color:#1a1a2e}
    .tagline{font-size:11px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin-top:2px}
    .type-badge{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;padding:3px 10px;border-radius:20px;background:${isSales ? '#ede9fe' : '#fef2f2'};color:${isSales ? '#7c3aed' : '#dc2626'};margin-top:8px;display:inline-block}
    .invoice-label{text-align:right}
    .invoice-label h2{font-size:22px;font-weight:700;color:#1a1a2e}
    .invoice-label .num{font-size:14px;color:#6b7280;margin-top:4px;font-family:monospace}
    .divider{height:2px;background:linear-gradient(90deg,#dc2626,#fca5a5,transparent);margin-bottom:36px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:36px}
    .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;margin-bottom:10px}
    .info-row{display:flex;flex-direction:column;margin-bottom:8px}
    .info-label{font-size:11px;color:#9ca3af;margin-bottom:1px}
    .info-value{font-size:13px;color:#1a1a2e;font-weight:500}
    .info-value.mono{font-family:monospace;font-size:12px;color:#374151}
    table{width:100%;border-collapse:collapse;margin-bottom:28px}
    thead tr{background:#fef2f2}
    th{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af}
    td{padding:12px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;color:#374151}
    .total-row{background:#fef2f2}
    .total-row td{font-size:15px;font-weight:700;color:#1a1a2e;border-bottom:none}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
    .badge-green{background:#dcfce7;color:#16a34a}
    .badge-yellow{background:#fef9c3;color:#a16207}
    .badge-orange{background:#ffedd5;color:#c2410c}
    .badge-red{background:#fee2e2;color:#dc2626}
    .badge-purple{background:#f3e8ff;color:#7c3aed}
    .footer{border-top:1px solid #e5e7eb;padding-top:24px;display:flex;justify-content:space-between;align-items:center}
    .footer-note{font-size:11px;color:#9ca3af}
    .footer-brand{font-size:13px;font-weight:700;color:#dc2626}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:24px}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">Aoq<span>olt</span></div>
      <span class="type-badge">${isSales ? 'Sales Order' : 'Booking Payment'}</span>
    </div>
    <div class="invoice-label">
      <h2>INVOICE</h2>
      <div class="num">${p.payment_number}</div>
      <div class="num" style="margin-top:4px;color:#9ca3af;">Issued: ${nowStr}</div>
    </div>
  </div>
  <div class="divider"></div>
  <div class="grid2">
    <div>
      <div class="section-title">Billed To</div>
      <div class="info-row"><span class="info-value" style="font-size:15px;font-weight:700;">${p.customer_name || p.customer_email}</span></div>
      <div class="info-row"><span class="info-label">Email</span><span class="info-value">${p.customer_email || '—'}</span></div>
      ${p.customer_phone ? `<div class="info-row"><span class="info-label">Phone</span><span class="info-value">${p.customer_phone}</span></div>` : ''}
      ${p.customer_city ? `<div class="info-row"><span class="info-label">Location</span><span class="info-value">${p.customer_city}${p.customer_country ? ', ' + p.customer_country : ''}</span></div>` : ''}
    </div>
    <div>
      <div class="section-title">Reference Details</div>
      <div class="info-row"><span class="info-label">${refLabel}</span><span class="info-value mono">${p.payment_number}</span></div>
      ${p.booking_ref && !isSales ? `<div class="info-row"><span class="info-label">Booking ID</span><span class="info-value mono">${p.booking_ref}</span></div>` : ''}
      ${quoteLine}
      ${p.case_number ? `<div class="info-row"><span class="info-label">Case #</span><span class="info-value mono">${p.case_number}</span></div>` : ''}
      <div class="info-row"><span class="info-label">Date</span><span class="info-value">${fmtTime(p.paid_at || p.created_at)}</span></div>
      ${gatewayLine}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${p.service_name || (isSales ? (p.quote_title || 'Sales Service') : 'Spiritual Service')}</td>
        <td style="text-align:right;">${amountStr} ${(p.currency || 'USD').toUpperCase()}</td>
      </tr>
      ${isSales && p.amount_paid && parseFloat(p.amount_paid) < p._amountDollars
        ? `<tr><td style="color:#9ca3af;font-size:12px;">Amount Paid (Partial)</td><td style="text-align:right;color:#9ca3af;">$${parseFloat(p.amount_paid).toFixed(2)}</td></tr>`
        : ''}
      <tr class="total-row">
        <td><strong>Total</strong></td>
        <td style="text-align:right;">${amountStr} ${(p.currency || 'USD').toUpperCase()}</td>
      </tr>
    </tbody>
  </table>
  <div style="margin-bottom:32px;">
    <span class="badge ${p.status === 'succeeded' ? 'badge-green' : p.status === 'refunded' ? 'badge-purple' : p.status === 'failed' ? 'badge-red' : p.status === 'partial' ? 'badge-orange' : 'badge-yellow'}">
      ${sm.label}
    </span>
  </div>
  <div class="footer">
    <div class="footer-note">Thank you for your trust in Aoqolt.<br/>For queries, contact support.</div>
    <div class="footer-brand">Aoqolt</div>
  </div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
}

function downloadInvoice(p) {
  const win = window.open('', '_blank')
  if (win) { win.document.write(generateInvoiceHTML(p)); win.document.close() }
}

// ── Detail Drawer ──────────────────────────────────────────────────────────

function DetailDrawer({ payment: p, onClose }) {
  if (!p) return null
  const sm   = STATUS_META[p.status] || STATUS_META.pending
  const Icon = sm.Icon
  const isSales = p._type === 'sales'
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md h-full overflow-y-auto glass border-l border-white/8 shadow-2xl p-7 flex flex-col gap-5"
          style={{ backgroundColor: 'var(--color-dark-2, #0f0f0f)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-lg">{p.payment_number}</p>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg ${isSales ? 'bg-purple-900/30 text-purple-400' : 'bg-red-900/30 text-red-400'}`}>
                  {isSales ? 'Sales' : 'Booking'}
                </span>
              </div>
              <p className="text-white/35 text-xs mt-0.5">{fmtTime(p._date)}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors">
              <FiX size={16} />
            </button>
          </div>

          <div className="glass rounded-2xl p-5 flex items-center justify-between border border-white/5">
            <div>
              <p className="text-white/40 text-xs mb-1">Amount</p>
              <p className="text-white text-2xl font-bold">{p.amount_display}</p>
              <p className="text-white/25 text-xs mt-0.5">{(p.currency || 'USD').toUpperCase()} · {p.gateway || 'Stripe'}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${sm.cls}`}>
              <Icon size={12} /> {sm.label}
            </span>
          </div>

          <Section title="Customer">
            <Row label="Name"    value={p.customer_name || '—'} />
            <Row label="Email"   value={p.customer_email || '—'} />
            <Row label="Phone"   value={p.customer_phone || '—'} />
            <Row label="City"    value={p.customer_city || '—'} />
            <Row label="Country" value={p.customer_country || '—'} />
          </Section>

          <Section title="Service & Reference">
            <Row label="Service"    value={p.service_name || p.quote_title || '—'} />
            {!isSales && <Row label="Service Type" value={(p.service_type || '—').replace(/_/g, ' ')} caps />}
            {!isSales && <Row label="Booking ID"   value={p.booking_ref || '—'} mono />}
            {isSales  && <Row label="Quote #"      value={p.quote_number || '—'} mono />}
            <Row label="Case #" value={p.case_number || '—'} mono />
          </Section>

          <Section title="Payment">
            <Row label={isSales ? 'Order #' : 'Payment #'} value={p.payment_number} mono />
            {!isSales && <Row label="Gateway" value={p.gateway || '—'} caps />}
            {!isSales && p.payment_method && <Row label="Method" value={p.payment_method} caps />}
            {isSales && <Row label="Order Status"   value={p.status} caps />}
            {isSales && <Row label="Amount Paid"    value={`$${parseFloat(p.amount_paid || 0).toFixed(2)}`} />}
            <Row label="Created"  value={fmtTime(p.created_at)} />
            <Row label="Paid At"  value={fmtTime(p.paid_at)} />
          </Section>

          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => downloadInvoice(p)}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold py-3 rounded-xl shadow-lg shadow-red-900/30 mt-auto"
          >
            <FiDownload size={15} /> Download Invoice PDF
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-2">{title}</p>
      <div className="glass rounded-xl border border-white/5 divide-y divide-white/5">{children}</div>
    </div>
  )
}

function Row({ label, value, mono, caps }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-white/35 text-xs">{label}</span>
      <span className={`text-white/80 text-xs font-medium text-right max-w-[55%] truncate ${mono ? 'font-mono' : ''} ${caps ? 'capitalize' : ''}`}>
        {value}
      </span>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['all', 'succeeded', 'partial', 'pending', 'processing', 'failed', 'refunded', 'cancelled']
const TYPE_FILTERS   = ['all', 'booking', 'sales']

export default function SuperAdminInvoicePage() {
  const [allRecords, setAllRecords] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter]     = useState('all')
  const [selected, setSelected]         = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      paymentsAPI.allPayments(),
      salesAPI.listOrders(),
    ]).then(([paymentsRes, ordersRes]) => {
      const bookingPayments = paymentsRes.status === 'fulfilled'
        ? (Array.isArray(paymentsRes.value.data) ? paymentsRes.value.data : paymentsRes.value.data?.results || []).map(normalizePayment)
        : []
      const salesOrders = ordersRes.status === 'fulfilled'
        ? (Array.isArray(ordersRes.value.data) ? ordersRes.value.data : ordersRes.value.data?.results || ordersRes.value.data?.data || []).map(normalizeOrder)
        : []
      // merge and sort newest first
      const merged = [...bookingPayments, ...salesOrders].sort(
        (a, b) => new Date(b._date) - new Date(a._date)
      )
      setAllRecords(merged)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return allRecords.filter((p) => {
      if (typeFilter !== 'all'   && p._type  !== typeFilter)   return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        (p.payment_number   || '').toLowerCase().includes(q) ||
        (p.customer_name    || '').toLowerCase().includes(q) ||
        (p.customer_email   || '').toLowerCase().includes(q) ||
        (p.booking_ref      || '').toLowerCase().includes(q) ||
        (p.case_number      || '').toLowerCase().includes(q) ||
        (p.service_name     || '').toLowerCase().includes(q) ||
        (p.quote_number     || '').toLowerCase().includes(q)
      )
    })
  }, [allRecords, statusFilter, typeFilter, search])

  // Summary stats (by dollar amount, both types normalised)
  const paidRecords     = allRecords.filter((p) => p.status === 'succeeded')
  const totalRevenue    = paidRecords.reduce((s, p) => s + p._amountDollars, 0)
  const paidCount       = paidRecords.length
  const pendingCount    = allRecords.filter((p) => ['pending', 'processing', 'partial'].includes(p.status)).length
  const salesOrderCount = allRecords.filter((p) => p._type === 'sales').length

  // Filtered revenue
  const filteredRevenue = filtered
    .filter((p) => p.status === 'succeeded')
    .reduce((s, p) => s + p._amountDollars, 0)

  return (
    <SuperAdminLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-white/35 text-sm mt-1">Complete payment history — bookings & sales orders</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total Revenue',    value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, sub: 'All paid transactions' },
          { label: 'Paid Invoices',    value: paidCount,       sub: 'Booking + sales payments' },
          { label: 'Pending / Partial',value: pendingCount,    sub: 'Awaiting full payment' },
          { label: 'Sales Orders',     value: salesOrderCount, sub: 'From sales quotes' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass rounded-2xl border border-white/5 p-5"
          >
            <p className="text-white/40 text-xs uppercase tracking-wider font-medium mb-2">{card.label}</p>
            <p className="text-white text-2xl font-bold leading-none mb-1">{card.value}</p>
            <p className="text-white/25 text-xs">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        {/* Search */}
        <div className="relative">
          <FiSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, booking ID, case #, order #, quote #, service..."
            className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-9 py-2.5 text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-red-600/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <FiX size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {/* Type filter */}
          <div className="flex items-center gap-2">
            <FiShoppingCart size={12} className="text-white/25" />
            {TYPE_FILTERS.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  typeFilter === t ? 'bg-red-600 text-white' : 'bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10'
                }`}
              >
                {t === 'all' ? 'All Types' : t === 'booking' ? 'Bookings' : 'Sales Orders'}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <FiFilter size={12} className="text-white/25" />
            {STATUS_FILTERS.map((s) => {
              const meta = STATUS_META[s]
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                    statusFilter === s ? 'bg-red-600 text-white' : 'bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10'
                  }`}
                >
                  {s === 'all' ? 'All Status' : meta?.label || s}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-2xl border border-white/5 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="border-b border-white/6">
                {['Type', 'Ref #', 'Date', 'Customer', 'Service', 'Case / Booking', 'Location', 'Amount', 'Status', ''].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-white/30 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/4">
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="py-3.5 px-4">
                        <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: j === 3 ? 120 : 60 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-white/25 text-sm">
                    {search || statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'No matching records found.'
                      : 'No payment records yet.'}
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => {
                  const sm   = STATUS_META[p.status] || STATUS_META.pending
                  const Icon = sm.Icon
                  const isSales = p._type === 'sales'
                  return (
                    <motion.tr
                      key={p._ref + p._type}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.025, 0.5) }}
                      className="border-b border-white/4 hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Type badge */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg ${isSales ? 'bg-purple-900/25 text-purple-400' : 'bg-red-900/25 text-red-400'}`}>
                          {isSales ? 'Sales' : 'Booking'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-white/50 whitespace-nowrap">{p.payment_number}</td>
                      <td className="py-3.5 px-4 text-white/45 text-xs whitespace-nowrap">{fmt(p._date)}</td>
                      <td className="py-3.5 px-4">
                        <p className="text-white/80 text-sm font-medium leading-snug">{p.customer_name || '—'}</p>
                        <p className="text-white/30 text-xs">{p.customer_email || '—'}</p>
                      </td>
                      <td className="py-3.5 px-4 text-white/60 text-sm max-w-[140px] truncate">{p.service_name || p.quote_title || '—'}</td>
                      <td className="py-3.5 px-4">
                        {p.case_number && <p className="font-mono text-xs text-white/40">{p.case_number}</p>}
                        {!isSales && p.booking_ref && <p className="font-mono text-xs text-white/25">{p.booking_ref}</p>}
                        {isSales && p.quote_number && <p className="font-mono text-xs text-white/25">{p.quote_number}</p>}
                        {!p.case_number && !p.booking_ref && !p.quote_number && <span className="text-white/20 text-xs">—</span>}
                      </td>
                      <td className="py-3.5 px-4 text-white/40 text-xs whitespace-nowrap">
                        {[p.customer_city, p.customer_country].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-white font-semibold text-sm whitespace-nowrap">{p.amount_display}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${sm.cls}`}>
                          <Icon size={11} /> {sm.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setSelected(p)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
                          >
                            <FiEye size={14} />
                          </button>
                          <button
                            onClick={() => downloadInvoice(p)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                          >
                            <FiDownload size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-white/25 text-xs">
              {filtered.length} of {allRecords.length} records
              {typeFilter !== 'all' && ` · ${typeFilter === 'sales' ? 'Sales Orders' : 'Booking Payments'} only`}
            </p>
            <p className="text-white/25 text-xs">
              Filtered paid total: <span className="text-white/45 font-semibold">
                ${filteredRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>
        )}
      </motion.div>

      {selected && <DetailDrawer payment={selected} onClose={() => setSelected(null)} />}
    </SuperAdminLayout>
  )
}

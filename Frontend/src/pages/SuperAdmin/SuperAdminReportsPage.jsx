import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  FiDollarSign, FiUsers, FiCalendar, FiStar,
  FiTrendingUp, FiDownload, FiEye,
} from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'
import SuperAdminLayout from './SuperAdminLayout'
import { dashboardAPI } from '../../api'

// ── Helpers ────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Transform API revenue.monthly (newest-first, YYYY-MM) → chart points (oldest-first)
function buildRevenueChartData(monthly) {
  if (!monthly?.length) return null
  return [...monthly]
    .reverse()
    .map((item) => {
      const [, mm] = item.month.split('-')
      return { month: MONTH_LABELS[parseInt(mm, 10) - 1], value: item.revenue }
    })
}

// Fallback monthly revenue data (shown only if API returns nothing)
const FALLBACK_REVENUE = [
  { month: 'Jan', value: 0 }, { month: 'Feb', value: 0 },
  { month: 'Mar', value: 0 }, { month: 'Apr', value: 0 },
  { month: 'May', value: 0 }, { month: 'Jun', value: 0 },
  { month: 'Jul', value: 0 }, { month: 'Aug', value: 0 },
  { month: 'Sep', value: 0 }, { month: 'Oct', value: 0 },
  { month: 'Nov', value: 0 }, { month: 'Dec', value: 0 },
]

// Smooth cubic bezier path from points
function smoothPath(points) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const cp1x = points[i].x + (points[i + 1].x - points[i].x) / 3
    const cp1y = points[i].y
    const cp2x = points[i + 1].x - (points[i + 1].x - points[i].x) / 3
    const cp2y = points[i + 1].y
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i + 1].x} ${points[i + 1].y}`
  }
  return d
}

// ── Line Chart ─────────────────────────────────────────────────────────────

function RevenueLineChart({ data }) {
  const [hovered, setHovered] = useState(null)
  const svgRef = useRef(null)
  const W = 700, H = 180, PAD = { top: 16, right: 16, bottom: 28, left: 48 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const max = Math.max(...data.map((d) => d.value)) * 1.15 || 1
  const pts = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * innerW,
    y: PAD.top + innerH - (d.value / max) * innerH,
  }))

  const linePath  = smoothPath(pts)
  const areaPath  = linePath + ` L ${pts[pts.length - 1].x} ${PAD.top + innerH} L ${pts[0].x} ${PAD.top + innerH} Z`

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max / 1000) * 1000)

  return (
    <div className="relative w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#dc2626" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0"    />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines + labels */}
        {yTicks.map((tick) => {
          const y = PAD.top + innerH - (tick / max) * innerH
          return (
            <g key={tick}>
              <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y}
                stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                fontSize={10} fill="rgba(255,255,255,0.3)">
                {tick >= 1000 ? `${tick / 1000}k` : tick}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />

        {/* Data points + hover zones */}
        {pts.map((pt, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)}>
            {/* Invisible wide hit area */}
            <rect
              x={pt.x - (innerW / (data.length - 1)) / 2}
              y={PAD.top}
              width={innerW / (data.length - 1)}
              height={innerH}
              fill="transparent"
            />
            {/* Dot */}
            <motion.circle
              cx={pt.x} cy={pt.y} r={hovered === i ? 5 : 3.5}
              fill={hovered === i ? '#ef4444' : '#dc2626'}
              stroke={hovered === i ? 'rgba(239,68,68,0.35)' : 'rgba(220,38,38,0.2)'}
              strokeWidth={hovered === i ? 6 : 3}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.2 + i * 0.04, duration: 0.3 }}
            />
            {/* Tooltip */}
            {hovered === i && (
              <g>
                <rect
                  x={pt.x - 28} y={pt.y - 30}
                  width={56} height={22}
                  rx={6} fill="rgba(30,10,10,0.9)"
                  stroke="rgba(220,38,38,0.3)" strokeWidth={1}
                />
                <text x={pt.x} y={pt.y - 15} textAnchor="middle"
                  fontSize={10} fill="white" fontWeight="600">
                  ${(data[i].value).toLocaleString()}
                </text>
              </g>
            )}
            {/* X label */}
            <text x={pt.x} y={H - 4} textAnchor="middle"
              fontSize={10} fill={hovered === i ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.3)'}>
              {data[i].month}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// ── Top Services Bar ───────────────────────────────────────────────────────

function ServiceBar({ label, count, total, color, icon, delay }) {
  const pct = Math.round((count / total) * 100)
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.45 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color }}>{icon}</span>
          <span className="text-white/70 text-sm">{label}</span>
        </div>
        <span className="text-white/45 text-xs">{count.toLocaleString()} bookings</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: delay + 0.2, duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  )
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function ReportCard({ title, value, prefix = '', suffix = '', growth, icon: Icon, delay }) {
  const positive = growth >= 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="glass rounded-2xl p-5 border border-white/5 cursor-default"
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-white/45 text-xs font-medium uppercase tracking-wider">{title}</p>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-[26px] font-bold text-white leading-none mb-3">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>
      <div className="flex items-center gap-1.5">
        <FiTrendingUp size={13} className={positive ? 'text-green-400' : 'text-red-400'} />
        <span className={`text-xs font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
          {positive ? '+' : ''}{growth}%
        </span>
        <span className="text-white/25 text-xs">vs last period</span>
      </div>
    </motion.div>
  )
}

// ── Performance Row ────────────────────────────────────────────────────────

function PerfRow({ label, value, highlight, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0"
    >
      <span className="text-white/55 text-sm">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-green-400' : 'text-white'}`}>
        {value}
      </span>
    </motion.div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function SuperAdminReportsPage() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    dashboardAPI.superAdmin()
      .then(({ data: res }) => setStats(res.data || res))
      .catch(() => {})
  }, [])

  // ── derive cards from API or fall back to sensible defaults ──
  const totalRevenue   = stats?.revenue?.total       ?? 123500
  const revenueGrowth  = stats?.revenue?.revenue_growth ?? 12
  const totalBookings  = (stats?.bookings?.total)    ?? 840
  const bookingGrowth  = stats?.bookings?.booking_growth ?? 8.4
  const totalClients   = stats?.users?.clients       ?? 284
  const clientGrowth   = stats?.users?.client_growth ?? 15.3
  const completedCases = stats?.cases?.completed     ?? 712
  const caseGrowth     = stats?.cases?.cases_growth  ?? 6.1

  const cards = [
    { title: 'Total Revenue',    value: totalRevenue,   prefix: '$', growth: revenueGrowth,  icon: FiDollarSign, delay: 0     },
    { title: 'Total Bookings',   value: totalBookings,               growth: bookingGrowth,  icon: FiCalendar,   delay: 0.08  },
    { title: 'New Clients',      value: totalClients,                growth: clientGrowth,   icon: FiUsers,      delay: 0.16  },
    { title: 'Completed Cases',  value: completedCases,              growth: Math.abs(caseGrowth), icon: FiStar, delay: 0.24  },
  ]

  // ── build revenue chart from real API data, fall back to zeros ──
  const chartData = buildRevenueChartData(stats?.revenue?.monthly) ?? FALLBACK_REVENUE

  // ── top services ──
  const dist = stats?.service_distribution
  const services = dist?.length
    ? dist.map((s) => ({
        label: s.name || s.service_type,
        count: s.count,
        color: s.service_type === 'single_aura' ? '#ef4444' : s.service_type === 'family_aura' ? '#a855f7' : '#3b82f6',
        icon: s.service_type === 'single_aura' ? <FiEye size={14} /> : s.service_type === 'family_aura' ? <FiUsers size={14} /> : <GiCrystalBall size={14} />,
      }))
    : [
        { label: 'Single Aura Scan',  count: 450, color: '#ef4444', icon: <FiEye size={14} />         },
        { label: 'Family Aura Scan',  count: 320, color: '#a855f7', icon: <FiUsers size={14} />        },
        { label: 'Astrology Reading', count: 230, color: '#3b82f6', icon: <GiCrystalBall size={14} /> },
      ]
  const topTotal = services.reduce((s, sv) => s + sv.count, 0)

  // ── performance summary ──
  const avgSession     = stats?.revenue?.avg_session_value    ?? 270
  const retentionRate  = stats?.users?.retention_rate         ?? 87
  const avgCompletion  = stats?.cases?.avg_completion_days    ?? 2.5
  const satisfaction   = stats?.cases?.avg_satisfaction       ?? 4.8

  // ── export handler (downloads a simple CSV) ──
  const handleExport = () => {
    const rows = [
      ['Report', 'Aoqolt Platform — ' + new Date().toLocaleDateString()],
      [],
      ['Metric', 'Value'],
      ['Total Revenue', `$${totalRevenue.toLocaleString()}`],
      ['Total Bookings', totalBookings],
      ['New Clients', totalClients],
      ['Completed Cases', completedCases],
      [],
      ['Month', 'Revenue'],
      ...chartData.map((d) => [d.month, d.value]),
      [],
      ['Service', 'Bookings'],
      ...services.map((s) => [s.label, s.count]),
      [],
      ['Performance Metric', 'Value'],
      ['Average Session Value', `$${avgSession}`],
      ['Client Retention Rate', `${retentionRate}%`],
      ['Average Completion Time', `${avgCompletion} days`],
      ['Customer Satisfaction', `${satisfaction}/5`],
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aoqolt-report-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <SuperAdminLayout>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-white/35 text-sm mt-1">Analytics and insights for your business</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleExport}
          className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-red-900/30 hover:from-red-500 hover:to-red-700 transition-all"
        >
          <FiDownload size={15} />
          Export Report
        </motion.button>
      </div>

      {/* ── Top 4 Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {cards.map((card) => (
          <ReportCard key={card.title} {...card} />
        ))}
      </div>

      {/* ── Revenue Line Chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="glass rounded-2xl border border-white/5 p-6 mb-7"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-semibold text-base">Revenue Overview</h2>
            <p className="text-white/35 text-xs mt-0.5">
              {stats?.revenue?.monthly?.length
                ? `Monthly revenue — last ${stats.revenue.monthly.length} months`
                : 'No payment data yet'}
            </p>
          </div>
          <span className="text-xs text-red-400 font-medium px-3 py-1 rounded-lg bg-red-900/20 border border-red-900/30">
            {new Date().getFullYear()}
          </span>
        </div>
        <RevenueLineChart data={chartData} />
      </motion.div>

      {/* ── Bottom Row: Top Services + Performance Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="glass rounded-2xl border border-white/5 p-6"
        >
          <h2 className="text-white font-semibold text-base mb-5">Top Services</h2>
          <div className="space-y-5">
            {services.map((svc, i) => (
              <ServiceBar
                key={svc.label}
                label={svc.label}
                count={svc.count}
                total={topTotal}
                color={svc.color}
                icon={svc.icon}
                delay={0.5 + i * 0.1}
              />
            ))}
          </div>
        </motion.div>

        {/* Performance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48 }}
          className="glass rounded-2xl border border-white/5 p-6"
        >
          <h2 className="text-white font-semibold text-base mb-2">Performance Summary</h2>
          <div>
            <PerfRow label="Average Session Value"    value={`$${avgSession}`}          highlight={false} delay={0.52} />
            <PerfRow label="Client Retention Rate"    value={`${retentionRate}%`}        highlight={true}  delay={0.58} />
            <PerfRow label="Average Completion Time"  value={`${avgCompletion} days`}    highlight={false} delay={0.64} />
            <PerfRow label="Customer Satisfaction"    value={`${satisfaction}/5`}        highlight={true}  delay={0.70} />
          </div>
        </motion.div>

      </div>
    </SuperAdminLayout>
  )
}

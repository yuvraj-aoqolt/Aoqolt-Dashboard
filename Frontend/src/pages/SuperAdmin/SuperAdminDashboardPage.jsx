import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { dashboardAPI, bookingsAPI } from '../../api'
import SuperAdminLayout from './SuperAdminLayout'
import LoadingScreen from '../../components/LoadingScreen'
import {
  FiUsers, FiEye, FiFolder, FiDollarSign,
  FiTrendingUp, FiTrendingDown, FiMoreHorizontal,
  FiUserPlus,
} from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'

// ── Helpers ────────────────────────────────────────────────────────────────

function buildServiceDist(dist) {
  const COLOR_MAP = {
    single_aura: 'var(--color-service-single)',
    family_aura: 'var(--color-service-family)',
    astrology:   'var(--color-service-astrology)',
  }
  const LABEL_MAP = {
    single_aura: 'Single Aura',
    family_aura: 'Family Aura',
    astrology:   'Astrology',
  }
  if (dist?.length) {
    return dist.map((s) => ({
      label:      LABEL_MAP[s.service_type] || s.name,
      percentage: s.percentage,
      count:      s.count,
      color:      COLOR_MAP[s.service_type] || '#6b7280',
    }))
  }
  return [
    { label: 'Single Aura', percentage: 35, count: 294, color: 'var(--color-service-single)' },
    { label: 'Family Aura', percentage: 40, count: 336, color: 'var(--color-service-family)' },
    { label: 'Astrology',   percentage: 25, count: 210, color: 'var(--color-service-astrology)' },
  ]
}

const STATUS_META = {
  pending:         { label: 'Pending',    cls: 'text-yellow-400 bg-yellow-400/10' },
  payment_pending: { label: 'Pay. Pend.', cls: 'text-orange-400 bg-orange-400/10' },
  completed:       { label: 'Completed',  cls: 'text-green-400  bg-green-400/10'  },
  cancelled:       { label: 'Cancelled',  cls: 'text-red-400   bg-red-400/10'     },
  in_progress:     { label: 'In Progress',cls: 'text-blue-400  bg-blue-400/10'    },
}

const SERVICE_ICON = {
  single_aura: <FiEye size={13} />,
  family_aura: <FiUsers size={13} />,
  astrology:   <GiCrystalBall size={13} />,
}

function initials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
}

// ── StatsCard ──────────────────────────────────────────────────────────────

function StatsCard({ title, value, icon: Icon, iconBg, growth, valuePrefix = '', delay = 0 }) {
  const positive = growth >= 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="rounded-2xl p-5 border border-white/5 cursor-default glass"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-white/45 text-xs font-medium uppercase tracking-wider leading-none">{title}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={17} className="text-white" />
        </div>
      </div>
      <p className="text-[26px] font-bold text-white leading-none mb-3">
        {valuePrefix}{typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <div className="flex items-center gap-1.5">
        {positive ? (
          <FiTrendingUp size={13} className="text-green-400 flex-shrink-0" />
        ) : (
          <FiTrendingDown size={13} className="text-red-400 flex-shrink-0" />
        )}
        <span className={`text-xs font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
          {positive ? '+' : ''}{growth}%
        </span>
        <span className="text-white/25 text-xs">vs last 30d</span>
      </div>
    </motion.div>
  )
}

// ── Bar Chart ──────────────────────────────────────────────────────────────

function ClientsBarChart({ data, rangeKey }) {
  const [hovered, setHovered] = useState(null)
  const max = Math.max(...data.map((d) => d.count), 1)

  // Which bar is "current" — highlight the relevant active bar per range
  const now = new Date()
  const currentDay   = now.toLocaleString('en', { weekday: 'short' })   // e.g. 'Sat'
  const currentWeek  = `W${Math.ceil(now.getDate() / 7)}`               // e.g. 'W3'
  const currentMonthShort = now.toLocaleString('en', { month: 'short' }) // e.g. 'Mar'

  const getIsActive = (item) => {
    if (rangeKey === 'week')  return item.month === currentDay
    if (rangeKey === 'month') return item.month === currentWeek
    return item.month === currentMonthShort
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-end gap-1.5 flex-1 pb-2">
        {data.map((item, i) => {
          const pct = Math.max((item.count / max) * 100, 4)
          const isActive = getIsActive(item)
          const isHovered = hovered === i
          return (
            <div
              key={item.month}
              className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer group"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute -top-8 bg-white/10 backdrop-blur px-2 py-1 rounded-lg text-white text-xs font-semibold pointer-events-none z-10 whitespace-nowrap"
                  >
                    {item.count} clients
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="relative w-full flex flex-col justify-end" style={{ height: 140 }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${pct}%` }}
                  transition={{ delay: i * 0.06, duration: 0.5, ease: 'easeOut' }}
                  className="w-full rounded-t-md transition-colors duration-200"
                  style={{
                    background: isActive
                      ? 'linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                      : isHovered
                        ? 'var(--color-bar-hover)'
                        : 'var(--color-bar-inactive)',
                    boxShadow: isActive ? '0 0 12px var(--color-bar-active-shadow)' : 'none',
                  }}
                />
              </div>
              <span
                className={`text-[11px] font-medium transition-colors ${
                  isActive ? 'text-red-400' : 'text-white/35 group-hover:text-white/60'
                }`}
              >
                {item.month}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Pie Chart ──────────────────────────────────────────────────────────────

function ServicePieChart({ segments }) {
  const [hovered, setHovered] = useState(null)
  const total = segments.reduce((s, i) => s + i.count, 0)

  let cumulative = 0
  const stops = segments.map((seg) => {
    const start = cumulative
    cumulative += seg.percentage
    return `${seg.color} ${start}% ${cumulative}%`
  })

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Donut */}
      <div className="relative w-44 h-44 flex-shrink-0">
        <div
          className="absolute inset-0 rounded-full transition-all duration-300"
          style={{ background: `conic-gradient(${stops.join(', ')})` }}
        />
        {/* Inner circle */}
        <div
          className="absolute inset-[30px] rounded-full flex flex-col items-center justify-center bg-sidebar"
        >
          <p className="text-xl font-bold text-white leading-none">
            {hovered !== null ? `${segments[hovered].percentage}%` : total.toLocaleString()}
          </p>
          <p className="text-[10px] text-white/35 mt-1 uppercase tracking-wider">
            {hovered !== null ? segments[hovered].label : 'TOTAL'}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full space-y-2">
        {segments.map((seg, i) => (
          <div
            key={seg.label}
            className="flex items-center justify-between cursor-pointer group transition-opacity"
            style={{ opacity: hovered !== null && hovered !== i ? 0.45 : 1 }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-white/70 text-xs">{seg.label}</span>
            </div>
            <span className="text-white/50 text-xs font-medium">{seg.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Recent Bookings ────────────────────────────────────────────────────────

function BookingsTable({ bookings }) {
  const [openMenu, setOpenMenu] = useState(null)
  const AVATAR_COLORS = [
    'var(--color-avatar-1)',
    'var(--color-avatar-2)',
    'var(--color-avatar-3)',
    'var(--color-avatar-4)',
    'var(--color-avatar-5)',
    'var(--color-avatar-6)',
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b border-white/6">
            {['Booking ID', 'Client Name', 'Service', 'Date', 'Status', 'Action'].map((h) => (
              <th key={h} className="text-left py-3 px-4 text-white/35 text-[11px] font-semibold uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookings.map((b, i) => {
            const meta = STATUS_META[b.status] || STATUS_META.pending
            const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
            return (
              <motion.tr
                key={b.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-white/4 hover:bg-white/3 transition-colors group"
              >
                <td className="py-3.5 px-4 text-white/50 text-sm font-mono">{b.booking_id}</td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {initials(b.full_name)}
                    </div>
                    <span className="text-white/80 text-sm">{b.full_name}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 text-white/60 text-sm">
                    <span className="text-white/30">{SERVICE_ICON[b.service_type]}</span>
                    {b.service_name}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-white/45 text-sm">{b.created_at}</td>
                <td className="py-3.5 px-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${meta.cls}`}>
                    {meta.label}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="relative flex items-center gap-2">
                    {b.status === 'pending' ? (
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors active:scale-95">
                        <FiUserPlus size={12} /> Assign
                      </button>
                    ) : (
                      <button
                        onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-colors"
                      >
                        <FiMoreHorizontal size={16} />
                      </button>
                    )}
                    <AnimatePresence>
                      {openMenu === b.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -4 }}
                          transition={{ duration: 0.12 }}
                          className="absolute right-0 top-8 w-36 rounded-xl border border-white/8 shadow-xl z-20 overflow-hidden"
                          style={{ backgroundColor: 'var(--color-dark-2)' }}
                        >
                          {['Edit', 'Cancel', 'View'].map((action) => (
                            <button
                              key={action}
                              onClick={() => setOpenMenu(null)}
                              className="w-full text-left px-3 py-2 text-white/60 hover:text-white hover:bg-white/5 text-xs transition-colors"
                            >
                              {action}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { key: 'week',     label: 'This Week'  },
  { key: 'month',    label: 'This Month' },
  { key: 'year',     label: 'This Year'  },
  { key: 'lifetime', label: 'Lifetime'   },
]

function buildChartData(stats, rangeKey) {
  const now       = new Date()
  const thisYear  = now.getFullYear()
  const thisYearStr = String(thisYear)

  if (rangeKey === 'week') {
    const daily = stats?.users?.daily_registrations
    if (daily?.length) return daily.map((d) => ({ month: d.day, count: d.count }))
    // fallback: empty 7-day skeleton
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    return days.map((d) => ({ month: d, count: 0 }))
  }

  if (rangeKey === 'month') {
    const weekly = stats?.users?.weekly_registrations
    if (weekly?.length) return weekly.map((w) => ({ month: w.week, count: w.count }))
    return [{ month: 'W1', count: 0 }, { month: 'W2', count: 0 }, { month: 'W3', count: 0 }, { month: 'W4', count: 0 }]
  }

  const allMonthly = stats?.users?.monthly_registrations || [
    { month: 'Jan', count: 38 }, { month: 'Feb', count: 55 },
    { month: 'Mar', count: 72 }, { month: 'Apr', count: 148 },
    { month: 'May', count: 91 }, { month: 'Jun', count: 64 },
  ]

  if (rangeKey === 'year') {
    const yearData = allMonthly.filter((r) => !r.year_month || r.year_month?.startsWith(thisYearStr))
    return (yearData.length ? yearData : allMonthly).map((r) => ({ month: r.month, count: r.count }))
  }

  // lifetime — show all
  return allMonthly.map((r) => ({ month: r.month, count: r.count }))
}

function chartSubtitle(rangeKey) {
  const now = new Date()
  if (rangeKey === 'week')  return 'Daily registrations — current week'
  if (rangeKey === 'month') return 'Weekly registrations — current month'
  if (rangeKey === 'year')  return `Monthly registrations — ${now.getFullYear()}`
  return 'All-time monthly registrations'
}

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('year')
  const [rangeOpen, setRangeOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: res } = await dashboardAPI.superAdmin()
        const d = res.data || res
        setStats(d)
        setBookings(d.recent_bookings || [])
      } catch {
        // fallback: fetch basic booking list
        try {
          const { data } = await bookingsAPI.allBookings()
          setBookings((Array.isArray(data) ? data : data.results || []).slice(0, 8))
        } catch { /* silent */ }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />

  // Build chart data
  const chartData   = buildChartData(stats, range)
  const serviceDist = buildServiceDist(stats?.service_distribution)

  // Stats cards
  const cards = [
    {
      title: 'Total Clients',
      value: stats?.users?.clients ?? 1284,
      icon: FiUsers,
      iconBg: 'bg-gradient-to-br from-indigo-600 to-indigo-900',
      growth: stats?.users?.client_growth ?? 12,
    },
    {
      title: 'Pending Aura Scans',
      value: stats?.bookings?.pending ?? 42,
      icon: FiEye,
      iconBg: 'bg-gradient-to-br from-red-600 to-red-900',
      growth: stats?.bookings?.pending_growth ?? 5.2,
    },
    {
      title: 'Active Cases',
      value: stats?.cases?.working ?? 156,
      icon: FiFolder,
      iconBg: 'bg-gradient-to-br from-sky-600 to-sky-900',
      growth: stats?.cases?.cases_growth ?? -2.4,
    },
    {
      title: 'Monthly Revenue',
      value: stats?.revenue?.last_30_days ?? 12850,
      valuePrefix: '$',
      icon: FiDollarSign,
      iconBg: 'bg-gradient-to-br from-emerald-600 to-emerald-900',
      growth: stats?.revenue?.revenue_growth ?? 18,
    },
  ]

  return (
    <SuperAdminLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

        {/* Page header */}
        {/* <div className="mb-7">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-white/35 text-sm mt-1">Welcome back — full platform overview</p>
        </div> */}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
          {cards.map((card, i) => (
            <StatsCard key={card.title} {...card} delay={i * 0.07} />
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-7">
          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 rounded-2xl border border-white/5 p-5 glass"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-white font-semibold text-base">Clients per Month</h2>
                <p className="text-white/35 text-xs mt-0.5">{chartSubtitle(range)}</p>
              </div>
              {/* Pill filter tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--color-input-bg)' }}>
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setRange(opt.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      range === opt.key
                        ? 'text-white shadow-sm'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                    style={range === opt.key ? { backgroundColor: 'var(--color-dark-3)' } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <ClientsBarChart data={chartData} rangeKey={range} />
          </motion.div>

          {/* Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-white/5 p-5 glass"
          >
            <div className="mb-5">
              <h2 className="text-white font-semibold text-base">Service Distribution</h2>
              <p className="text-white/35 text-xs mt-0.5">Total</p>
            </div>
            <ServicePieChart segments={serviceDist} />
          </motion.div>
        </div>

        {/* Recent Bookings Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-white/5 overflow-hidden glass"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
            <h2 className="text-white font-semibold text-base">Recent Bookings</h2>
            <Link
              to="/superadmin/bookings"
              className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
            >
              View All Bookings →
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="py-16 text-center text-white/25 text-sm">No recent bookings</div>
          ) : (
            <BookingsTable bookings={bookings} />
          )}
        </motion.div>

      </motion.div>
    </SuperAdminLayout>
  )
}

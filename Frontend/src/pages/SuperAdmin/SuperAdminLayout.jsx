import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiMenu, FiX, FiLogOut, FiBell, FiSearch,
  FiGrid, FiUsers, FiCalendar, FiMessageSquare,
  FiFileText, FiShoppingBag, FiDollarSign, FiBarChart2,
  FiShield, FiSettings, FiChevronDown, FiUser, FiList,
} from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'
import { useAuth } from '../../context/AuthContext'

const MAIN_NAV = [
  { to: '/superadmin',                   icon: FiGrid,         label: 'Dashboard',        end: true },
  { to: '/superadmin/clients',           icon: FiUsers,        label: 'Clients' },
  { to: '/superadmin/bookings',          icon: FiCalendar,     label: 'Bookings' },
  { to: '/superadmin/aura-assignments',  icon: GiCrystalBall,  label: 'Aura Assignments' },
  { to: '/superadmin/chat',              icon: FiMessageSquare,label: 'Chat' },
  { to: '/superadmin/sales-quotes',      icon: FiFileText,     label: 'Sales Quotes' },
  { to: '/superadmin/sales-orders',      icon: FiShoppingBag,  label: 'Sales Orders' },
  { to: '/superadmin/invoice',           icon: FiDollarSign,   label: 'Invoice' },
  { to: '/superadmin/reports',           icon: FiBarChart2,    label: 'Reports' },
]

const BOTTOM_NAV = [
  { to: '/superadmin/admins',   icon: FiShield,   label: 'Admins' },
  { to: '/superadmin/settings', icon: FiSettings, label: 'Settings' },
]

const MOCK_NOTIFS = [
  { title: 'New booking received',  body: 'Julian Anderson — Deep Aura Mapping',      time: '2m ago',  dot: 'bg-yellow-400' },
  { title: 'Payment confirmed',     body: 'Sarah Chen — Family Aura Cleansing',       time: '15m ago', dot: 'bg-green-400' },
  { title: 'New message',           body: 'Elena Rodriguez sent a message',           time: '1h ago',  dot: 'bg-blue-400' },
  { title: 'Case assigned',         body: 'Admin Priya assigned case #C-1042',        time: '3h ago',  dot: 'bg-purple-400' },
]

function NavItem({ to, icon: Icon, label, end, onNav }) {
  return (
    <NavLink
      to={to} end={end}
      onClick={onNav}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
          isActive
            ? 'bg-red-900/30 text-red-400 border border-red-900/40'
            : 'text-white/50 hover:text-white hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={17}
            className={isActive ? 'text-red-400' : 'text-white/35 group-hover:text-white/70 transition-colors'}
          />
          {label}
        </>
      )}
    </NavLink>
  )
}

export default function SuperAdminLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sideOpen, setSideOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const notifRef = useRef(null)
  const profileRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const SidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-900/30">
            <span className="text-white font-black text-[10px] font-display tracking-tight">AOQ</span>
          </div>
          <div>
            <h2 className="font-display font-bold text-white text-[15px] leading-tight">Aoqolt</h2>
            <span className="text-[11px] text-red-400 font-medium leading-none">Spiritual Insights</span>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {MAIN_NAV.map((item) => (
          <NavItem key={item.to} {...item} onNav={() => setSideOpen(false)} />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-white/5 space-y-0.5 flex-shrink-0">
        {BOTTOM_NAV.map((item) => (
          <NavItem key={item.to} {...item} onNav={() => setSideOpen(false)} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-dark">
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:flex flex-col w-60 fixed inset-y-0 left-0 z-40 border-r border-white/5 bg-sidebar"
      >
        {SidebarContent}
      </aside>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {sideOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 lg:hidden backdrop-blur-sm"
              onClick={() => setSideOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="fixed inset-y-0 left-0 w-60 z-50 border-r border-white/5 lg:hidden flex flex-col bg-sidebar"
            >
              <button
                onClick={() => setSideOpen(false)}
                className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors z-10"
              >
                <FiX size={20} />
              </button>
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen">
        {/* Top navbar */}
        <header
          className="sticky top-0 z-30 h-16 border-b border-white/5 flex items-center px-4 lg:px-6 gap-3 flex-shrink-0"
          style={{ backgroundColor: 'var(--color-bg-header)', backdropFilter: 'blur(20px)' }}
        >
          {/* Hamburger (mobile) */}
          <button className="lg:hidden text-white/50 hover:text-white/80 transition-colors mr-1" onClick={() => setSideOpen(true)}>
            <FiMenu size={21} />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-sm relative">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
            <input
              type="text"
              placeholder="Search insights, clients or reports..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-[13px] text-white placeholder:text-white/25 outline-none transition-colors"
              style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.18)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-input-border)')}
            />
          </div>

          <div className="flex-1" />

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/8"
              style={{ backgroundColor: 'var(--color-input-bg)' }}
            >
              <FiBell size={17} className="text-white/60" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 w-80 rounded-2xl border border-white/8 shadow-2xl overflow-hidden z-50"
                  style={{ backgroundColor: 'var(--color-dark-2)' }}
                >
                  <div className="px-4 py-3 border-b border-white/6">
                    <p className="text-white text-sm font-semibold">Notifications</p>
                    <p className="text-white/30 text-xs mt-0.5">{MOCK_NOTIFS.length} unread</p>
                  </div>
                  {MOCK_NOTIFS.map((n, i) => (
                    <div
                      key={i}
                      className="px-4 py-3 border-b border-white/4 cursor-pointer transition-colors hover:bg-white/4"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white/80 text-xs font-medium">{n.title}</p>
                          <p className="text-white/40 text-xs truncate mt-0.5">{n.body}</p>
                        </div>
                        <span className="text-white/25 text-xs flex-shrink-0 mt-0.5">{n.time}</span>
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-2.5 text-center">
                    <button className="text-red-400 text-xs hover:text-red-300 transition-colors font-medium">
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-white text-[13px] font-semibold leading-none">{user?.full_name || 'Super Admin'}</p>
                <p className="text-white/40 text-[11px] mt-0.5 leading-none">Chief Intuitive</p>
              </div>
              <FiChevronDown size={13} className="text-white/30 hidden sm:block" />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 w-52 rounded-2xl border border-white/8 shadow-2xl overflow-hidden z-50"
                  style={{ backgroundColor: 'var(--color-dark-2)' }}>
                  <div className="px-4 py-3 border-b border-white/6">
                    <p className="text-white text-xs font-semibold truncate">{user?.full_name}</p>
                    <p className="text-white/40 text-xs truncate mt-0.5">{user?.email}</p>
                  </div>
                  {[
                    { icon: FiUser,     label: 'Profile',  cb: () => navigate('/superadmin/settings') },
                    { icon: FiSettings, label: 'Settings', cb: () => navigate('/superadmin/settings') },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => { setProfileOpen(false); item.cb() }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/5 text-xs transition-colors"
                    >
                      <item.icon size={13} /> {item.label}
                    </button>
                  ))}
                  <div className="border-t border-white/6" />
                  <button
                    onClick={() => { setProfileOpen(false); logout() }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-900/10 text-xs transition-colors"
                  >
                    <FiLogOut size={13} /> Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 lg:p-8">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}

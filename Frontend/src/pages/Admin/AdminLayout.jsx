import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { MdDashboard, MdMenu, MdClose } from 'react-icons/md'
import { MdLogout } from 'react-icons/md'
import {
  FiMessageSquare, FiBell,
  FiSearch, FiCheckCircle, FiBriefcase, FiInbox,
} from 'react-icons/fi'

const ADMIN_NAV = [
  { to: '/admin',       icon: <MdDashboard size={19} />,    label: 'Dashboard'  },
  { to: '/admin/cases', icon: <FiInbox size={17} />,         label: 'Assigned',  exact: false },
  { to: '/admin/work',  icon: <FiBriefcase size={17} />,     label: 'Working',   exact: false },
  { to: '/admin/done',  icon: <FiCheckCircle size={17} />,   label: 'Completed', exact: false },
  { to: '/admin/chat',  icon: <FiMessageSquare size={17} />, label: 'Chat',      exact: false },
]


export default function AdminLayout({ children, pageTitle = 'Baba Dashboard' }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')

  const handleLogout = async () => { await logout(); navigate('/') }

  const isActive = (to, exact = true) =>
    exact ? location.pathname === to : location.pathname.startsWith(to)

  const NavItem = ({ to, icon, label, exact = true, onClick }) => {
    const active = isActive(to, exact)
    return (
      <Link
        to={to}
        onClick={() => { setSidebarOpen(false); onClick?.() }}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
          ${active
            ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
            : 'text-white/45 hover:text-white hover:bg-white/6'
          }`}
      >
        <span className={active ? 'text-white' : 'text-white/35'}>{icon}</span>
        {label}
      </Link>
    )
  }

  // Avatar: use uploaded image or coloured initial
  const avatarUrl = user?.avatar
  const userInitial = user?.full_name?.[0]?.toUpperCase() || 'A'

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#111111]">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/Aoqolt logo 1-01-02.png" alt="Aoqolt" className="h-8 w-8 object-contain" />
          <div>
            <span className="text-white font-display font-bold text-base tracking-wider leading-none block">
              Aoqolt
            </span>
            <span className="text-red-500 text-[10px] italic leading-none">Spiritual Insights</span>
          </div>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {ADMIN_NAV.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 pt-3 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-white/45 hover:text-white hover:bg-red-600/20 transition-all duration-150"
        >
          <MdLogout size={18} className="text-white/35" />
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-48 lg:fixed lg:inset-y-0 border-r border-white/5">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/70 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -220 }} animate={{ x: 0 }} exit={{ x: -220 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 w-52 z-50 lg:hidden border-r border-white/5"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main area ── */}
      <div className="flex-1 lg:ml-48 flex flex-col min-h-screen">

        {/* Top header */}
        <header className="sticky top-0 z-30 bg-[#111111] border-b border-white/5 px-4 sm:px-6 h-14 flex items-center gap-4">

          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="lg:hidden text-white/50 hover:text-white transition-colors mr-1"
          >
            {sidebarOpen ? <MdClose size={22} /> : <MdMenu size={22} />}
          </button>

          {/* Page title */}
          <h1 className="text-white font-semibold text-base whitespace-nowrap hidden sm:block">
            {pageTitle}
          </h1>

          {/* Search */}
          <div className="flex-1 max-w-sm mx-auto relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search insights, clients or reports..."
              className="w-full bg-white/5 border border-white/8 focus:border-white/20 rounded-lg pl-9 pr-4 py-2 text-white/70 placeholder:text-white/25 outline-none transition-all text-xs"
            />
          </div>

          {/* Right: bell + user */}
          <div className="flex items-center gap-3 ml-auto">
            <button className="relative text-white/40 hover:text-white/80 transition-colors">
              <FiBell size={18} />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-white text-xs font-medium leading-tight">{user?.full_name || 'Admin'}</p>
                <p className="text-white/35 text-[10px] leading-tight">Chief Intuitive</p>
              </div>
              {avatarUrl ? (
                <img src={avatarUrl} alt={user?.full_name} className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/10">
                  {userInitial}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

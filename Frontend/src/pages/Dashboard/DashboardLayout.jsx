import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import {
  MdDashboard, MdCalendarToday, MdFolder, MdPerson, MdLogout, MdMenu, MdClose
} from 'react-icons/md'
import { FiArrowLeft } from 'react-icons/fi'

const CLIENT_NAV = [
  { to: '/dashboard', icon: <MdDashboard size={20} />, label: 'Overview' },
  { to: '/dashboard/bookings', icon: <MdCalendarToday size={20} />, label: 'My Bookings' },
  { to: '/dashboard/cases', icon: <MdFolder size={20} />, label: 'My Cases' },
  { to: '/dashboard/profile', icon: <MdPerson size={20} />, label: 'Profile' },
]

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const NavItem = ({ to, icon, label }) => {
    const active = location.pathname === to
    return (
      <Link
        to={to}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
          active
            ? 'bg-red-900/30 text-red-400 border border-red-900/40'
            : 'text-white/50 hover:text-white hover:bg-white/5'
        }`}
      >
        <span className={active ? 'text-red-400' : 'text-white/35'}>{icon}</span>
        {label}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">A</span>
          </div>
          <span className="text-white font-display font-bold text-lg tracking-wider">
            AO<span className="text-red-500">QOLT</span>
          </span>
        </Link>
      </div>

      {/* User info */}
      <div className="p-4 mx-3 mt-4 glass rounded-xl border border-red-900/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-700 to-red-900 rounded-full flex items-center justify-center text-white font-bold">
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">{user?.full_name}</p>
            <span className="inline-block text-xs bg-red-900/30 text-red-400/80 border border-red-900/30 px-2 py-0.5 rounded-full capitalize">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {CLIENT_NAV.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
          <FiArrowLeft size={18} /> Back to Site
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400/70 hover:text-red-400 hover:bg-red-900/20 transition-all"
        >
          <MdLogout size={20} /> Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-sidebar border-r border-white/5">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-72 bg-sidebar border-r border-white/5 z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile Topbar */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-white/5 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white transition-colors">
            <MdMenu size={24} />
          </button>
          <span className="text-white font-display font-bold tracking-wider">
            AO<span className="text-red-500">QOLT</span>
          </span>
          <div className="w-8 h-8 bg-gradient-to-br from-red-700 to-red-900 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

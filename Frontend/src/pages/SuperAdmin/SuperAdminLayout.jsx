import { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMenu, FiX, FiHome, FiList, FiUsers, FiArrowLeft, FiLogOut, FiBookOpen } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/superadmin',          icon: FiHome,     label: 'Dashboard', end: true },
  { to: '/superadmin/bookings', icon: FiBookOpen, label: 'Bookings' },
  { to: '/superadmin/cases',    icon: FiList,     label: 'All Cases' },
  { to: '/superadmin/users',    icon: FiUsers,    label: 'Users' },
]

export default function SuperAdminLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-6 py-7 border-b border-white/5">
        <h2 className="font-display font-bold text-white text-lg">Aoqolt</h2>
        <span className="text-xs text-yellow-400/70 font-medium uppercase tracking-widest">Super Admin</span>
      </div>
      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-900/30' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`
            }>
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/5 space-y-2">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-900 flex items-center justify-center text-white text-xs font-bold">
            {user?.full_name?.charAt(0) || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-xs font-medium truncate">{user?.full_name}</p>
            <p className="text-white/25 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={() => navigate('/')}
          className="w-full flex items-center gap-2 px-4 py-2 text-white/30 hover:text-white/60 text-xs transition-colors rounded-lg hover:bg-white/5">
          <FiArrowLeft size={13} /> Back to Site
        </button>
        <button onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2 text-red-500/60 hover:text-red-400 text-xs transition-colors rounded-lg hover:bg-red-900/10">
          <FiLogOut size={13} /> Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-black">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white/[0.02] border-r border-white/5 fixed inset-y-0 left-0 z-40">
        {SidebarContent}
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-black/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4">
        <h2 className="font-display font-bold text-white text-base">Super Admin</h2>
        <button onClick={() => setOpen(true)} className="text-white/50"><FiMenu size={20} /></button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 lg:hidden" onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 w-64 z-50 bg-[#0a0a0a] border-r border-white/5 lg:hidden">
              <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-white/30 hover:text-white/60">
                <FiX size={20} />
              </button>
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 p-6">
        {children || <Outlet />}
      </main>
    </div>
  )
}

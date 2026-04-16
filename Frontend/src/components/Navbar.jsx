import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiMenu, FiX, FiLogOut, FiEdit2, FiList } from 'react-icons/fi'
import { MdDashboard } from 'react-icons/md'

// Prefetch login/register chunks the moment the user hovers the nav links.
// By the time they click, the JS is already in cache — zero perceived lag.
const prefetchAuth = () => {
  import('../pages/Auth/LoginPage')
  import('../pages/Auth/RegisterPage')
}

export default function Navbar() {
  const { isAuthenticated, user, logout, isAdmin, isSuperAdmin, isGuest } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const dashboardPath = isSuperAdmin ? '/superadmin' : '/admin'

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/services', label: 'Services' },
    { to: '/blogs', label: 'Blog' },
  ]

  return (
    <nav
      className={`nav-entrance fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-[var(--color-bg-navbar)] backdrop-blur-xl border-b border-red-900/20 shadow-lg shadow-red-950/20'
          : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src="/Aoqolt logo 1-01-02.png"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 object-contain flex-shrink-0"
            />
            <span className="text-white font-display font-bold text-xl tracking-wider">
              AO<span className="text-red-500">QOLT</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors relative group ${location.pathname === link.to ? 'text-red-400' : 'text-white/70 hover:text-white'
                  }`}
              >
                {link.label}
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 bg-red-500 transition-all duration-300 ${location.pathname === link.to ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                />
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition-all"
                >
                  <div className="w-7 h-7 bg-gradient-to-br from-red-600 to-red-900 rounded-full flex items-center justify-center text-xs font-bold">
                    {user?.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-white/80 text-sm max-w-24 truncate">{user?.full_name}</span>
                </button>

                {dropdownOpen && (
                  <div className="dropdown-enter absolute right-0 mt-2 w-52 glass-dark rounded-xl overflow-hidden z-20 shadow-xl shadow-black/50">
                    <div className="p-3 border-b border-white/5">
                      <p className="text-xs text-white/40 uppercase tracking-wider">Signed in as</p>
                      <p className="text-white text-sm font-medium truncate">{isGuest ? 'Guest' : user?.full_name}</p>
                      <span className="inline-block mt-1 text-xs bg-red-900/40 text-red-400 border border-red-900/50 px-2 py-0.5 rounded-full capitalize">
                        {isGuest ? 'guest' : user?.role}
                      </span>
                    </div>
                    <div className="p-1">
                      {!isGuest && (isAdmin || isSuperAdmin) && (
                        <Link
                          to={dashboardPath}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 text-sm transition-all"
                        >
                          <MdDashboard size={16} />
                          Dashboard
                        </Link>
                      )}
                      {!isGuest && (isSuperAdmin || user?.can_manage_blogs) && (
                        <>
                          <Link
                            to="/blogs/my"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 text-sm transition-all"
                          >
                            <FiList size={15} />
                            My Blogs
                          </Link>
                          <Link
                            to="/blogs/create"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 text-sm transition-all"
                          >
                            <FiEdit2 size={15} />
                            Write Post
                          </Link>
                        </>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900/20 text-sm transition-all"
                      >
                        <FiLogOut size={15} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  onMouseEnter={prefetchAuth}
                  className="text-white/70 hover:text-white text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onMouseEnter={prefetchAuth}
                  className="btn-primary text-sm py-2 px-5"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-white/70 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu — CSS max-height transition instead of framer-motion */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[500px]' : 'max-h-0'
          }`}
      >
        <div className="bg-[var(--color-bg-navbar-mobile)] backdrop-blur-xl border-t border-red-900/20 px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${location.pathname === link.to
                  ? 'bg-red-900/30 text-red-400 border border-red-900/40'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/5">
            {isAuthenticated ? (
              <>
                {!isGuest && (isAdmin || isSuperAdmin) && (
                  <Link
                    to={dashboardPath}
                    className="block px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Dashboard
                  </Link>
                )}
                {!isGuest && (isSuperAdmin || user?.can_manage_blogs) && (
                  <>
                    <Link
                      to="/blogs/my"
                      className="block px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all"
                    >
                      My Blogs
                    </Link>
                    <Link
                      to="/blogs/create"
                      className="block px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all"
                    >
                      Write Post
                    </Link>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-900/20 transition-all"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="block mt-2 btn-primary text-center text-sm py-3"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

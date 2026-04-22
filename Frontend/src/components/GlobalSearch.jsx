import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiX, FiUser, FiCalendar, FiFileText, FiMail, FiPhone, FiMapPin } from 'react-icons/fi'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../api'

export default function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Use TanStack Query for search with debouncing
  const { data: searchData, isLoading } = useQuery({
    queryKey: ['global-search', query],
    queryFn: async () => {
      if (query.trim().length < 2) return { bookings: [], cases: [], users: [] }
      const { data } = await dashboardAPI.globalSearch(query)
      return data?.data || { bookings: [], cases: [], users: [] }
    },
    enabled: query.trim().length >= 2,
    staleTime: 10000, // 10 seconds
    refetchOnWindowFocus: false,
  })

  // Transform backend data to display format
  const searchResults = query.trim().length >= 2 ? transformResults(searchData) : []

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (!isOpen || searchResults.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % searchResults.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (searchResults[selectedIndex]) {
          handleResultClick(searchResults[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, searchResults, selectedIndex])

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleResultClick = (result) => {
    setIsOpen(false)
    setQuery('')
    navigate(result.path)
  }

  const handleClear = () => {
    setQuery('')
    setSelectedIndex(0)
    inputRef.current?.focus()
  }

  return (
    <div className="flex-1 max-w-sm relative" ref={dropdownRef}>
      <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
        placeholder={isLoading ? "Loading search data..." : "Search bookings, cases, clients, email, phone..."}
        className="w-full pl-9 pr-9 py-2 rounded-xl text-[13px] text-white placeholder:text-white/25 outline-none transition-colors"
        style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}
        onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.18)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--color-input-border)')}
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors z-10"
        >
          <FiX size={14} />
        </button>
      )}

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-white/8 shadow-2xl overflow-hidden z-50 max-h-[420px] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-dark-2)' }}
          >
            <div className="px-3 py-2 border-b border-white/6">
              <p className="text-white/40 text-xs">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="py-1">
              {searchResults.map((result, index) => (
                <button
                  key={result.key}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full px-4 py-3 flex items-start gap-3 transition-colors text-left ${
                    selectedIndex === index ? 'bg-white/8' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <result.icon size={16} className="text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{result.title}</p>
                    <p className="text-white/40 text-xs mt-0.5 truncate">{result.subtitle}</p>
                    {result.matches.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {result.matches.map((match, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/8"
                          >
                            <match.icon size={9} />
                            {match.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/8">
                      {result.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No results message */}
      <AnimatePresence>
        {isOpen && query.trim().length >= 2 && searchResults.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-white/8 shadow-2xl overflow-hidden z-50"
            style={{ backgroundColor: 'var(--color-dark-2)' }}
          >
            <div className="px-4 py-6 text-center">
              <FiSearch size={28} className="mx-auto text-white/15 mb-2" />
              <p className="text-white/30 text-sm">No results found for "{query}"</p>
              <p className="text-white/20 text-xs mt-1">
                Try searching by booking ID, case number, email, phone, or client name
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      <AnimatePresence>
        {isOpen && query.trim().length >= 2 && isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-white/8 shadow-2xl overflow-hidden z-50"
            style={{ backgroundColor: 'var(--color-dark-2)' }}
          >
            <div className="px-4 py-6 text-center">
              <div className="w-5 h-5 border-2 border-white/10 border-t-red-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-white/30 text-sm">Loading search data...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Transform Backend Results to Display Format ──────────────────────────

function transformResults(data) {
  if (!data) return []
  
  const results = []
  const { bookings = [], cases = [], users = [] } = data

  // Transform Bookings
  bookings.forEach((booking) => {
    const matches = booking.matched_fields?.map(field => {
      const iconMap = {
        booking_id: FiFileText,
        name: FiUser,
        email: FiMail,
        phone: FiPhone,
        location: FiMapPin,
      }
      return {
        icon: iconMap[field.type] || FiFileText,
        label: field.value
      }
    }) || []

    results.push({
      key: `booking-${booking.id}`,
      type: 'Booking',
      icon: FiCalendar,
      title: booking.booking_id || 'Booking',
      subtitle: `${booking.full_name || 'Unknown'} • ${booking.service_name || 'Service'}`,
      matches: matches.slice(0, 3),
      path: `/superadmin/bookings`,
    })
  })

  // Transform Cases
  cases.forEach((caseItem) => {
    const matches = caseItem.matched_fields?.map(field => {
      const iconMap = {
        case_number: FiFileText,
        name: FiUser,
        email: FiMail,
        phone: FiPhone,
        booking_id: FiCalendar,
      }
      return {
        icon: iconMap[field.type] || FiFileText,
        label: field.value
      }
    }) || []

    results.push({
      key: `case-${caseItem.id}`,
      type: 'Case',
      icon: FiFileText,
      title: caseItem.case_number || 'Case',
      subtitle: `${caseItem.client_name || 'Unknown'} • ${caseItem.status || 'Status unknown'}`,
      matches: matches.slice(0, 3),
      path: `/superadmin/aura-assignments`,
    })
  })

  // Transform Users (Clients)
  users.forEach((user) => {
    const matches = user.matched_fields?.map(field => {
      const iconMap = {
        name: FiUser,
        email: FiMail,
        phone: FiPhone,
      }
      return {
        icon: iconMap[field.type] || FiUser,
        label: field.value
      }
    }) || []

    results.push({
      key: `user-${user.id}`,
      type: 'Client',
      icon: FiUser,
      title: user.full_name || user.email,
      subtitle: user.email || 'Client',
      matches: matches.slice(0, 3),
      path: `/superadmin/clients`,
    })
  })

  return results.slice(0, 15) // Limit to 15 results
}

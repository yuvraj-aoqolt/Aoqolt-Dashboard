import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-dark flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-[var(--color-bg-auth-from)] to-dark items-center justify-center overflow-hidden">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(var(--color-auth-grid) 1px, transparent 1px),linear-gradient(90deg, var(--color-auth-grid) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
        {/* Orbs */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1.6, 0.8] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 left-1/3 w-72 h-72 bg-red-900/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.6, 1.0, 0.6] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-1/2 right-1/3 w-64 h-64 bg-red-700/15 rounded-full blur-3xl"
        />

        <div className="relative z-10 text-center px-12">
          {/* <Link to="/" className="flex items-center gap-2 justify-center mb-12">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-900 rounded-xl flex items-center justify-center">
              <span className="text-white font-display font-bold">A</span>
            </div>
            <span className="text-white font-display font-bold text-2xl tracking-wider">
              AO<span className="text-red-500">QOLT</span>
            </span>
          </Link> */}

          <img
            src="/Aoqolt logo 1-01-02.png"
            alt="Aoqolt"
            className="w-100 h-80 mx-auto -mt-30 mb-5 object-contain drop-shadow-2xl"
          />

          <h2 className="font-display text-3xl font-bold text-white mb-3">
            Unlock Your Energy
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs mx-auto">
            Join thousands who have discovered their spiritual path through Aoqolt's expert readings.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 justify-center mb-10 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">A</span>
            </div>
            <span className="text-white font-display font-bold text-xl tracking-wider">
              AO<span className="text-red-500">QOLT</span>
            </span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-display text-3xl font-bold text-white mb-2 text-center lg:text-left">{title}</h1>
            {subtitle && <p className="text-white/40 text-sm mb-4 text-center lg:text-left">{subtitle}</p>}
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

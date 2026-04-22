import { Link } from 'react-router-dom'

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex" style={{ background: '#111111' }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-[45%] relative items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, #0a0a0a 0%, #1a0000 55%, #6b0000 100%)' }}
      >
        {/* Orbs */}
        <div className="auth-orb-1 absolute top-1/4 left-1/4 w-80 h-80 bg-red-900/25 rounded-full blur-3xl" />
        <div className="auth-orb-2 absolute bottom-1/3 right-1/4 w-72 h-72 bg-red-700/20 rounded-full blur-3xl" />

        <div className="relative z-10 text-center px-12">
          <img
            src="/Aoqolt logo 1-01-02.png"
            alt="Aoqolt"
            width="400"
            height="320"
            className="w-96 h-80 mx-auto object-contain drop-shadow-2xl"
            fetchPriority="high"
          />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10" style={{ background: '#000000' }}>
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 justify-center mb-8 lg:hidden">
            <span className="text-white font-display font-bold text-xl tracking-wider">
              AO<span className="text-red-500">QOLT</span>
            </span>
          </Link>

          {/* Card */}
          <div
            className="rounded-2xl px-8 py-8"
            style={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <h1 className="font-display text-3xl font-bold text-white mb-1">{title}</h1>
            {subtitle && <p className="text-white text-sm mb-6">{subtitle}</p>}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

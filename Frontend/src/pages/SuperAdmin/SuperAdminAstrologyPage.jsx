import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SuperAdminLayout from './SuperAdminLayout'
import { GiCrystalBall } from 'react-icons/gi'
import { FiArrowRight } from 'react-icons/fi'

export default function SuperAdminAstrologyPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate('/superadmin/sessions', { replace: true }), 800)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <SuperAdminLayout>
      <div className="flex flex-col items-center justify-center gap-6 py-24">
        <div className="w-20 h-20 rounded-2xl bg-purple-900/20 border border-purple-900/30 flex items-center justify-center">
          <GiCrystalBall size={36} className="text-purple-400" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-bold text-white mb-2">Astrology</h2>
          <p className="text-white/40 text-sm leading-relaxed">
            Astrology bookings and appointments are now managed inside the Sessions module.
          </p>
          <p className="text-white/20 text-xs mt-1">Redirecting you there�</p>
        </div>
        <button
          onClick={() => navigate('/superadmin/sessions')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-purple-700 hover:bg-purple-600 text-white transition-colors"
        >
          Go to Sessions
          <FiArrowRight size={14} />
        </button>
      </div>
    </SuperAdminLayout>
  )
}

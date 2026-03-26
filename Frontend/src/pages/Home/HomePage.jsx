import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { FiArrowRight, FiStar, FiZap, FiEye, FiUsers } from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'
import { MdAutoAwesome } from 'react-icons/md'
import { useServices } from '../../context/ServicesContext'
import { useAuth } from '../../context/AuthContext'
import { bookingsAPI } from '../../api'

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 4 + 1,
  delay: Math.random() * 5,
  duration: Math.random() * 8 + 4,
}))

const SERVICES_PREVIEW = [
  {
    service_type: 'single_aura',
    icon: <FiEye size={28} />,
    title: 'Single Aura Reading',
    desc: 'Deep personal energy field analysis revealing your unique vibrational signature.',
    color: 'from-red-900/40 to-rose-900/20',
    glow: 'shadow-red-900/20',
  },
  {
    service_type: 'family_aura',
    icon: <FiUsers size={28} />,
    title: 'Family Aura Reading',
    desc: 'Comprehensive energetic analysis for your entire family dynamic.',
    color: 'from-red-900/30 to-orange-900/20',
    glow: 'shadow-orange-900/20',
  },
  {
    service_type: 'astrology',
    icon: <GiCrystalBall size={28} />,
    title: 'Astrology Reading',
    desc: 'Celestial birth chart analysis unlocking your cosmic blueprint.',
    color: 'from-red-900/30 to-purple-900/20',
    glow: 'shadow-purple-900/20',
  },
]

const TESTIMONIALS = [
  { name: 'Sarah M.', role: 'Client', text: 'The aura reading completely transformed my understanding of my energy. Absolutely life-changing experience.', stars: 5 },
  { name: 'James K.', role: 'Client', text: 'My family aura session revealed patterns I never recognized. The insights were profound and accurate.', stars: 5 },
  { name: 'Elena R.', role: 'Client', text: 'The astrology reading was remarkably precise. I found clarity and direction I had been searching for.', stars: 5 },
]

const STATS = [
  { value: '5,000+', label: 'Readings Completed' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '50+', label: 'Countries Served' },
  { value: '10+', label: 'Years Experience' },
]

export default function HomePage() {
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 600], [0, -100])
  const opacity = useTransform(scrollY, [0, 400], [1, 0])
  const navigate = useNavigate()
  const { services } = useServices()
  const { isAuthenticated } = useAuth()

  const handleServiceClick = async (serviceType) => {
    const service = services.find((s) => s.service_type === serviceType)
    if (!service) {
      navigate('/services')
      return
    }
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/services/${service.id}`, serviceId: service.id } })
      return
    }
    try {
      const { data } = await bookingsAPI.initiate(service.id)
      const payload = data.data || data
      if (!payload.token) {
        navigate('/services')
        return
      }
      navigate(`/booking/${payload.token}`)
    } catch {
      navigate('/services')
    }
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          {/* Gradient orbs */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-700/15 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 12, repeat: Infinity, delay: 2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-950/10 rounded-full blur-3xl"
          />

          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(var(--color-grid-line) 1px, transparent 1px),
                linear-gradient(90deg, var(--color-grid-line) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />

          {/* Floating particles */}
          {PARTICLES.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full bg-red-500"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                opacity: 0.3,
              }}
              animate={{
                y: [-20, 20],
                opacity: [0.1, 0.4, 0.1],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            />
          ))}
        </div>

        {/* Hero content */}
        <motion.div style={{ y: y1, opacity }} className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-red-950/40 border border-red-900/50 rounded-full px-4 py-1.5 mb-8 text-red-400 text-xs font-medium tracking-wider uppercase"
            >
              <MdAutoAwesome size={12} />
              Spiritual Awakening Awaits You
              <MdAutoAwesome size={12} />
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.9 }}
              className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold text-white leading-[1.05] mb-6"
            >
              Discover Your
              <br />
              <span className="gradient-text">Energy Field</span>
            </motion.h1>

            {/* Sub-heading */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-white/50 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-12"
            >
              Professional aura readings and astrology sessions that illuminate your
              path, heal your energy, and connect you to your higher purpose.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/services">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-semibold text-base px-8 py-4 rounded-xl shadow-lg shadow-red-900/40 transition-all duration-300 red-glow group"
                >
                  Explore Services
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <FiArrowRight size={18} />
                  </motion.span>
                </motion.button>
              </Link>

              <Link to="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-red-500/40 text-white/80 hover:text-white font-semibold text-base px-8 py-4 rounded-xl transition-all duration-300"
                >
                  <FiZap size={16} className="text-red-400" />
                  Start Free
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Floating orb visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="mt-20 relative inline-block"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="w-48 h-48 sm:w-64 sm:h-64 mx-auto relative"
            >
              {/* Orbiting ring */}
              <div className="absolute inset-0 rounded-full border border-red-600/30" />
              <div className="absolute inset-4 rounded-full border border-red-500/20" />
              {/* Core orb */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-8 rounded-full bg-gradient-to-br from-red-700 to-red-950 shadow-2xl shadow-red-900/50 flex items-center justify-center"
              >
                <GiCrystalBall className="text-white/80" size={48} />
              </motion.div>
              {/* Sparks */}
              {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-red-500"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${deg}deg) translateX(90px) translateY(-4px)`,
                  }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <span className="text-white/25 text-xs tracking-widest uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-5 h-8 border border-white/15 rounded-full flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-1.5 bg-red-500 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────── */}
      <section className="py-16 border-y border-red-900/10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="font-display text-3xl sm:text-4xl font-bold gradient-text mb-1">
                  {stat.value}
                </p>
                <p className="text-white/40 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES PREVIEW ──────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs text-red-400 uppercase tracking-widest font-medium">Our Services</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mt-3 mb-4">
              Choose Your Path
            </h2>
            <p className="text-white/40 max-w-lg mx-auto">
              Each service is tailored to provide deep insight and transformative guidance for your unique journey.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {SERVICES_PREVIEW.map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -8 }}
                onClick={() => handleServiceClick(service.service_type)}
                className={`relative glass rounded-2xl p-8 cursor-pointer group overflow-hidden shadow-xl ${service.glow}`}
              >
                {/* Gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative z-10">
                  <div className="w-14 h-14 bg-red-900/30 border border-red-900/50 rounded-2xl flex items-center justify-center text-red-400 mb-6 group-hover:bg-red-900/50 group-hover:shadow-lg group-hover:shadow-red-900/30 transition-all duration-300">
                    {service.icon}
                  </div>
                  <h3 className="font-display text-xl font-semibold text-white mb-3">{service.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed mb-6">{service.desc}</p>
                  <span className="inline-flex items-center gap-1 text-red-400 group-hover:text-red-300 text-sm font-medium transition-colors group/link">
                    Book Now
                    <FiArrowRight size={14} className="transform group-hover/link:translate-x-1 transition-transform" />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/services">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary inline-flex items-center gap-2 text-base px-10 py-4"
              >
                View All Services
                <FiArrowRight size={18} />
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gradient-to-b from-transparent to-sidebar">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs text-red-400 uppercase tracking-widest font-medium">Process</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mt-3 mb-4">
              How It Works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Choose Service', desc: 'Browse our spiritual services and select the one that resonates with your needs.' },
              { step: '02', title: 'Book & Pay', desc: 'Complete your booking form and securely process your payment.' },
              { step: '03', title: 'Analysis', desc: 'Our expert practitioners analyze your energy field with precision.' },
              { step: '04', title: 'Receive Insights', desc: 'Get your detailed report and chat directly with your assigned practitioner.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                {i < 3 && (
                  <div className="hidden md:block absolute top-8 right-0 w-full h-px bg-gradient-to-r from-red-900/50 to-transparent translate-x-1/2 z-0" />
                )}
                <div className="relative z-10 glass rounded-2xl p-6">
                  <div className="font-display text-4xl font-black text-red-900/40 mb-4">{item.step}</div>
                  <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs text-red-400 uppercase tracking-widest font-medium">Testimonials</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mt-3">
              What Clients Say
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass rounded-2xl p-6"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <FiStar key={j} size={14} className="fill-red-500 text-red-500" />
                  ))}
                </div>
                <p className="text-white/60 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-red-700 to-red-900 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{t.name}</p>
                    <p className="text-white/30 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-950/60 to-[#1a0000] border border-red-900/40 p-12 sm:p-16 text-center"
          >
            {/* BG glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-glass-border),transparent_70%)]" />

            <div className="relative z-10">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="inline-block text-red-500/40 mb-6"
              >
                <GiCrystalBall size={48} />
              </motion.div>
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
                Begin Your Journey Today
              </h2>
              <p className="text-white/50 max-w-md mx-auto mb-10">
                Take the first step towards understanding your energy and unlocking your spiritual potential.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/services">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    className="btn-primary inline-flex items-center gap-2 text-base px-10 py-4"
                  >
                    Explore Services <FiArrowRight />
                  </motion.button>
                </Link>
                <Link to="/register">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 border border-white/20 hover:border-red-600/50 text-white/80 hover:text-white px-10 py-4 rounded-xl font-semibold transition-all"
                  >
                    Create Account
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

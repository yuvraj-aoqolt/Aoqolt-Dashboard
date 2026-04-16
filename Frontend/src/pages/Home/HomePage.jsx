import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiArrowRight, FiStar, FiZap, FiEye, FiUsers, FiBookOpen,
  FiCalendar, FiChevronLeft, FiChevronRight, FiShield, FiGlobe, FiAward,
} from 'react-icons/fi'
import { GiCrystalBall } from 'react-icons/gi'
import { MdAutoAwesome } from 'react-icons/md'
import { format } from 'date-fns'
import { useServices } from '../../context/ServicesContext'
import { useAuth } from '../../context/AuthContext'
import { bookingsAPI, blogsAPI } from '../../api'
/* ── Static data ─────────────────────────────────────────── */
// Blog preview cache — 5-min TTL, avoids re-fetch on back-navigation
const BLOG_PREVIEW_KEY = 'aoqolt_blog_preview'
const BLOG_PREVIEW_TTL = 5 * 60 * 1000
function getBlogPreviewCache() {
  try {
    const raw = sessionStorage.getItem(BLOG_PREVIEW_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > BLOG_PREVIEW_TTL) { sessionStorage.removeItem(BLOG_PREVIEW_KEY); return null }
    return data
  } catch { return null }
}

// Particles defined once at module level — positions never change between renders
const PARTICLES = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2.5 + 1,
  delay: `${(i / 25) * 8}s`,
  duration: `${Math.random() * 8 + 8}s`,
  color: i % 3 === 0 ? '#dc2626' : i % 3 === 1 ? '#ef4444' : '#f87171',
}))

const SERVICES_PREVIEW = [
  {
    service_type: 'single_aura',
    icon: <FiEye size={28} />,
    title: 'Single Aura Reading',
    desc: 'Deep personal energy field analysis revealing your unique vibrational signature.',
    color: 'from-red-900/50 to-rose-900/30',
    accent: '#dc2626',
  },
  {
    service_type: 'family_aura',
    icon: <FiUsers size={28} />,
    title: 'Family Aura Reading',
    desc: 'Comprehensive energetic analysis for your entire family dynamic.',
    color: 'from-orange-900/40 to-red-900/30',
    accent: '#ea580c',
  },
  {
    service_type: 'astrology',
    icon: <GiCrystalBall size={28} />,
    title: 'Astrology Reading',
    desc: 'Celestial birth chart analysis unlocking your cosmic blueprint.',
    color: 'from-purple-900/40 to-red-900/30',
    accent: '#9333ea',
  },
]

const TESTIMONIALS = [
  { name: 'Sarah M.', role: 'Client', text: 'The aura reading completely transformed my understanding of my energy. Absolutely life-changing experience.', stars: 5 },
  { name: 'James K.', role: 'Client', text: 'My family aura session revealed patterns I never recognized. The insights were profound and accurate.', stars: 5 },
  { name: 'Elena R.', role: 'Client', text: 'The astrology reading was remarkably precise. I found clarity and direction I had been searching for.', stars: 5 },
  { name: 'Priya S.', role: 'Client', text: 'I was skeptical at first, but the session left me speechless. Every detail was spot on.', stars: 5 },
  { name: 'Marco D.', role: 'Client', text: 'A profound experience that helped me understand my purpose and align with my higher self.', stars: 5 },
]

const STATS = [
  { value: '5000', display: '5,000+', label: 'Readings Completed', suffix: '+' },
  { value: '98',   display: '98%',    label: 'Satisfaction Rate',  suffix: '%' },
  { value: '50',   display: '50+',    label: 'Countries Served',   suffix: '+' },
  { value: '10',   display: '10+',    label: 'Years Experience',   suffix: '+' },
]

const FEATURES = [
  {
    icon: <FiShield size={22} />,
    title: 'Certified Practitioners',
    desc: 'All our readers are vetted, trained professionals with years of spiritual practice.',
  },
  {
    icon: <FiGlobe size={22} />,
    title: 'Global Reach',
    desc: 'Sessions available worldwide via our digital platform, anytime and anywhere.',
  },
  {
    icon: <FiAward size={22} />,
    title: 'Personalized Reports',
    desc: 'Every reading is unique — detailed PDF reports delivered directly to you.',
  },
  {
    icon: <MdAutoAwesome size={22} />,
    title: 'Ongoing Support',
    desc: 'Chat directly with your practitioner after your session for follow-up clarity.',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Choose Service', desc: 'Browse our spiritual services and select the one that resonates with your needs.' },
  { step: '02', title: 'Book & Pay',    desc: 'Complete your booking form and securely process your payment.' },
  { step: '03', title: 'Analysis',      desc: 'Our expert practitioners analyze your energy field with precision.' },
  { step: '04', title: 'Receive Insights', desc: 'Get your detailed report and chat directly with your assigned practitioner.' },
]

/* ── Reveal — attaches IntersectionObserver to a div ref ── */
function Reveal({ className = '', delay = 0, children, as: Tag = 'div', ...props }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.disconnect() } },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
      {...props}
    >
      {children}
    </Tag>
  )
}

/* ── 3-D tilt card ───────────────────────────────────────── */
function TiltCard({ children, className, onClick }) {
  const ref = useRef(null)

  const onMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`
  }, [])

  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)'
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={className}
      style={{ transition: 'transform 0.15s ease-out', willChange: 'transform' }}
    >
      {children}
    </div>
  )
}

/* ── StatItem ────────────────────────────────────────────── */
function StatItem({ stat, delay }) {
  return (
    <Reveal delay={delay} className="text-center group">
      <p className="font-display text-4xl sm:text-5xl font-black gradient-text mb-1 tabular-nums">
        {stat.display}
      </p>
      <p className="text-white/40 text-sm tracking-wide">{stat.label}</p>
    </Reveal>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { services } = useServices()
  const { isAuthenticated } = useAuth()
  const [latestBlogs, setLatestBlogs] = useState(() => getBlogPreviewCache() || [])

  /* ── testimonial carousel ── */
  const [tIdx, setTIdx] = useState(0)
  const [tDir, setTDir] = useState(1)
  useEffect(() => {
    const id = setInterval(() => {
      setTDir(1)
      setTIdx((p) => (p + 1) % TESTIMONIALS.length)
    }, 4500)
    return () => clearInterval(id)
  }, [])
  const prevT = () => { setTDir(-1); setTIdx((p) => (p - 1 + TESTIMONIALS.length) % TESTIMONIALS.length) }
  const nextT = () => { setTDir(1);  setTIdx((p) => (p + 1) % TESTIMONIALS.length) }

  /* ── how-it-works active step ── */
  const [activeStep, setActiveStep] = useState(null)

  /* ── blogs — fetched once, cached in sessionStorage ── */
  useEffect(() => {
    if (getBlogPreviewCache()) return  // serve from cache on re-visits
    blogsAPI.list({ page: 1, page_size: 3 })
      .then(({ data }) => {
        const blogs = data.results || []
        setLatestBlogs(blogs)
        try {
          sessionStorage.setItem(BLOG_PREVIEW_KEY, JSON.stringify({ data: blogs, ts: Date.now() }))
        } catch {}
      })
      .catch(() => {})
  }, [])

  const handleServiceClick = async (serviceType) => {
    const service = services.find((s) => s.service_type === serviceType)
    if (!service) { navigate('/services'); return }
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/services/${service.id}`, serviceId: service.id } })
      return
    }
    try {
      const { data } = await bookingsAPI.initiate(service.id)
      const payload = data.data || data
      navigate(payload.token ? `/booking/${payload.token}` : '/services')
    } catch { navigate('/services') }
  }

  return (
    <div className="min-h-screen bg-dark overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

        {/* Background layers — all CSS-animated, zero JS cost */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Pulsing orbs */}
          <div className="hero-orb-1 absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-900/20 rounded-full blur-3xl" />
          <div className="hero-orb-2 absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-700/15 rounded-full blur-3xl" />
          <div className="hero-orb-3 absolute top-1/2 left-1/2 w-[700px] h-[700px] bg-red-950/20 rounded-full blur-3xl" />

          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `
                linear-gradient(var(--color-grid-line) 1px, transparent 1px),
                linear-gradient(90deg, var(--color-grid-line) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />

          {/* Particles — CSS animated, no Framer Motion instances */}
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              className="hero-particle absolute rounded-full"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                background: p.color,
                animationDuration: p.duration,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>

        {/* Hero content — split layout */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-4 py-28 lg:py-20">

          {/* ── Left: Text + CTAs ── */}
          <div className="flex-1 text-center lg:text-left">

            {/* Eyebrow */}
            <span className="inline-block text-red-500/75 text-[11px] font-semibold uppercase tracking-[0.35em] mb-8">
              Spiritual Insights
            </span>

            {/* Headline */}
            <div className="overflow-hidden mb-8">
              <h1 className="font-display leading-none">
                <span className="block text-[clamp(3.2rem,7.5vw,7rem)] font-black text-white tracking-tight">
                  Discover
                </span>
                <span className="block text-[clamp(3.2rem,7.5vw,7rem)] font-black text-white/15 tracking-tight -mt-2">
                  Your
                </span>
                <span className="block text-[clamp(2.6rem,6vw,5.5rem)] font-black gradient-text tracking-tight -mt-1">
                  Energy Field
                </span>
              </h1>
            </div>

            {/* Divider */}
            <div className="h-px w-14 bg-gradient-to-r from-red-600 to-transparent mb-8 mx-auto lg:mx-0" />

            {/* Subheading */}
            <p className="text-white/45 text-base sm:text-lg max-w-md mx-auto lg:mx-0 leading-relaxed mb-10">
              Professional aura readings and astrology sessions that illuminate your
              path, heal your energy, and connect you to your higher purpose.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link to="/services">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  className="relative flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold text-base px-9 py-4 rounded-xl shadow-lg shadow-red-900/40 overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  Explore Services
                  <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
                    <FiArrowRight size={18} />
                  </motion.span>
                </motion.button>
              </Link>

              <Link to="/register">
                {/* <motion.button
                  whileHover={{ scale: 1.05, borderColor: 'rgba(239,68,68,0.5)' }}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-2 bg-white/5 border border-white/15 text-white/80 hover:text-white font-semibold text-base px-9 py-4 rounded-xl transition-colors duration-300"
                >
                  <FiZap size={16} className="text-red-400" />
                  Start Free
                </motion.button> */}
              </Link>
            </div>
          </div>

          {/* ── Right: Aoqolt Logo ── */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-[440px] lg:h-[440px] flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-red-900/15 blur-3xl pointer-events-none" />
              <img
                src="/Aoqolt logo 1-01-02.png"
                alt="Aoqolt"
                fetchPriority="high"
                className="relative z-10 w-52 h-52 sm:w-64 sm:h-64 lg:w-[360px] lg:h-[360px] object-contain drop-shadow-[0_0_80px_rgba(220,38,38,0.5)]"
              />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-white/20 text-[10px] tracking-[0.3em] uppercase">Scroll</span>
          <div className="scroll-bob w-5 h-9 border border-white/15 rounded-full flex items-start justify-center pt-2">
            <div className="w-1 h-2 bg-red-500 rounded-full" />
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="py-20 border-y border-red-900/10 bg-gradient-to-r from-red-950/5 via-transparent to-red-950/5">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {STATS.map((stat, i) => (
              <StatItem key={i} stat={stat} delay={i * 0.12} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────── */}
      <section className="py-28 px-4">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="text-xs text-red-400 uppercase tracking-[0.2em] font-medium">Our Services</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mt-3 mb-4">
              Choose Your Path
            </h2>
            <p className="text-white/40 max-w-lg mx-auto">
              Each service is tailored to provide deep insight and transformative guidance for your unique journey.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {SERVICES_PREVIEW.map((service, i) => (
              <Reveal key={i} delay={i * 0.1} className="">
                <TiltCard
                  className="relative glass rounded-2xl p-8 cursor-pointer group overflow-hidden h-full"
                  onClick={() => handleServiceClick(service.service_type)}
                >
                  {/* Gradient bg on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  {/* Accent glow on bottom edge */}
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: service.accent }}
                  />

                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-red-900/30 border border-red-900/50 rounded-2xl flex items-center justify-center text-red-400 mb-6 group-hover:bg-red-900/50 group-hover:shadow-lg group-hover:shadow-red-900/30 transition-all duration-300">
                      {service.icon}
                    </div>
                    <h3 className="font-display text-xl font-semibold text-white mb-3">{service.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed mb-6">{service.desc}</p>
                    <span className="inline-flex items-center gap-1 text-red-400 group-hover:text-red-300 text-sm font-medium transition-colors">
                      Book Now <FiArrowRight size={14} />
                    </span>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>

          <div className="text-center">
            <Link to="/services">
              <button className="btn-primary inline-flex items-center gap-2 text-base px-10 py-4">
                View All Services <FiArrowRight size={18} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-28 px-4 bg-gradient-to-b from-transparent via-sidebar/40 to-transparent">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="text-xs text-red-400 uppercase tracking-[0.2em] font-medium">Process</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mt-3">
              How It Works
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((item, i) => (
              <Reveal
                key={i}
                delay={i * 0.1}
                className="relative cursor-default"
                onMouseEnter={() => setActiveStep(i)}
                onMouseLeave={() => setActiveStep(null)}
              >
                {/* Connector line */}
                {i < 3 && (
                  <div className="hidden md:block absolute top-9 left-full w-4 h-px z-0 bg-gradient-to-r from-red-700/60 to-red-700/10 rounded-full" />
                )}

                <div
                  style={{ transform: activeStep === i ? 'translateY(-6px)' : 'translateY(0)', transition: 'transform 0.2s ease' }}
                  className={`relative z-10 rounded-2xl p-6 border transition-colors duration-300 ${
                    activeStep === i
                      ? 'bg-red-950/40 border-red-800/50'
                      : 'glass border-transparent'
                  }`}
                >
                  {/* Step circle */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-5 transition-all duration-300 ${
                    activeStep === i
                      ? 'bg-red-600 text-white shadow-lg shadow-red-900/50'
                      : 'bg-red-950/40 border border-red-900/40 text-red-500'
                  }`}>
                    {item.step}
                  </div>
                  <h3 className={`font-semibold mb-2 transition-colors duration-300 ${activeStep === i ? 'text-white' : 'text-white/80'}`}>
                    {item.title}
                  </h3>
                  <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ────────────────────────────────────── */}
      <section className="py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="text-xs text-red-400 uppercase tracking-[0.2em] font-medium">Why Us</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mt-3">
              Built on Trust &amp; Expertise
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((feat, i) => (
              <Reveal
                key={i}
                delay={i * 0.08}
                className="glass rounded-2xl p-6 group cursor-default border border-transparent hover:border-red-900/30 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-red-950/50 border border-red-900/40 rounded-xl flex items-center justify-center text-red-400 mb-5 group-hover:bg-red-900/40 transition-all duration-300">
                  {feat.icon}
                </div>
                <h3 className="text-white font-semibold mb-2 text-sm">{feat.title}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{feat.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS CAROUSEL ────────────────────────────── */}
      <section className="py-28 px-4 bg-gradient-to-b from-transparent via-sidebar/30 to-transparent overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="text-xs text-red-400 uppercase tracking-[0.2em] font-medium">Testimonials</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mt-3">
              What Clients Say
            </h2>
          </Reveal>
          <div className="relative">
            <AnimatePresence mode="wait" custom={tDir}>
              <motion.div
                key={tIdx}
                custom={tDir}
                initial={{ opacity: 0, x: tDir * 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tDir * -80 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="glass rounded-3xl p-8 sm:p-10 text-center"
              >
                {/* Stars */}
                <div className="flex justify-center gap-1 mb-5">
                  {Array.from({ length: TESTIMONIALS[tIdx].stars }).map((_, j) => (
                    <FiStar key={j} size={16} className="fill-red-500 text-red-500" />
                  ))}
                </div>
                <p className="text-white/70 text-base sm:text-lg leading-relaxed italic mb-8">
                  "{TESTIMONIALS[tIdx].text}"
                </p>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-red-700 to-red-900 rounded-full flex items-center justify-center text-white font-bold">
                    {TESTIMONIALS[tIdx].name[0]}
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold text-sm">{TESTIMONIALS[tIdx].name}</p>
                    <p className="text-white/30 text-xs">{TESTIMONIALS[tIdx].role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Prev / Next */}
            <button
              onClick={prevT}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 sm:-translate-x-8 w-9 h-9 rounded-full bg-red-950/60 border border-red-900/40 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-900/60 transition-all"
            >
              <FiChevronLeft size={18} />
            </button>
            <button
              onClick={nextT}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 sm:translate-x-8 w-9 h-9 rounded-full bg-red-950/60 border border-red-900/40 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-900/60 transition-all"
            >
              <FiChevronRight size={18} />
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setTDir(i > tIdx ? 1 : -1); setTIdx(i) }}
                className={`rounded-full transition-all duration-300 ${i === tIdx ? 'w-6 h-2 bg-red-500' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── BLOG PREVIEW ─────────────────────────────────────── */}
      {latestBlogs.length > 0 && (
        <section className="py-28 px-4">
          <div className="max-w-6xl mx-auto">
            <Reveal className="text-center mb-14">
              <span className="text-xs text-red-400 uppercase tracking-[0.2em] font-medium">From Our Blog</span>
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mt-3 mb-4">
                Insights &amp; Wisdom
              </h2>
              <p className="text-white/40 max-w-lg mx-auto">
                Explore articles on aura reading, spiritual growth, and energetic well-being.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestBlogs.map((blog, i) => (
              <Reveal key={blog.id} delay={i * 0.1}>
                  <Link
                    to={`/blogs/${blog.slug}`}
                    className="group flex flex-col h-full rounded-2xl overflow-hidden border border-white/5 bg-white/[0.03] hover:border-red-900/40 hover:bg-white/5 transition-all duration-300"
                  >
                    <div className="aspect-video overflow-hidden bg-white/5 relative">
                      {blog.poster_image_url ? (
                        <img
                          src={blog.poster_image_url}
                          alt={blog.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10">
                          <FiBookOpen size={32} />
                        </div>
                      )}
                      {/* overlay on hover */}
                      <div className="absolute inset-0 bg-red-950/0 group-hover:bg-red-950/20 transition-colors duration-300" />
                    </div>

                    <div className="flex flex-col flex-1 p-5">
                      <div className="flex items-center gap-2 text-white/30 text-xs mb-3">
                        <FiCalendar size={11} />
                        <span>{format(new Date(blog.created_at), 'MMM d, yyyy')}</span>
                        {blog.author && (
                          <><span className="mx-1">·</span><span>{blog.author.full_name}</span></>
                        )}
                      </div>
                      <h3 className="text-white font-semibold text-base leading-snug mb-2 group-hover:text-red-400 transition-colors line-clamp-2">
                        {blog.title}
                      </h3>
                      {blog.description && (
                        <p className="text-white/35 text-sm line-clamp-3 flex-1">{blog.description}</p>
                      )}
                      <span className="mt-4 text-red-400 text-xs font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read More <FiArrowRight size={12} />
                      </span>
                    </div>
                  </Link>
              </Reveal>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                to="/blogs"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-red-900/40 text-red-400 hover:bg-red-900/10 transition-colors text-sm font-medium"
              >
                View All Articles <FiArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section className="py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-950/70 to-[#1a0000] border border-red-900/40 p-12 sm:p-16 text-center">
            {/* Multi-ring pulse — pure CSS */}
            <div className="ring-1 absolute inset-0 rounded-3xl border border-red-700/20 pointer-events-none" />
            <div className="ring-2 absolute inset-0 rounded-3xl border border-red-700/20 pointer-events-none" />
            <div className="ring-3 absolute inset-0 rounded-3xl border border-red-700/20 pointer-events-none" />

            <div className="relative z-10">
              <div className="crystal-spin inline-block text-red-500/50 mb-6">
                <GiCrystalBall size={52} />
              </div>

              <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
                Begin Your Journey Today
              </h2>
              <p className="text-white/50 max-w-md mx-auto mb-10 leading-relaxed">
                Take the first step towards understanding your energy and unlocking your spiritual potential.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/services">
                  <button className="btn-primary inline-flex items-center gap-2 text-base px-10 py-4">
                    Explore Services <FiArrowRight />
                  </button>
                </Link>
                <Link to="/register">
                  <button className="inline-flex items-center gap-2 border border-white/20 hover:border-red-600/50 text-white/80 hover:text-white px-10 py-4 rounded-xl font-semibold transition-all">
                    Create Account
                  </button>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  )
}



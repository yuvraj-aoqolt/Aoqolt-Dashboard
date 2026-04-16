import { Link } from 'react-router-dom'
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi'
import { FaTwitter, FaInstagram, FaFacebook } from 'react-icons/fa'
import { motion } from 'framer-motion'

export default function Footer() {
  return (
    <footer className="bg-[#080808] border-t border-red-900/20 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-red-600 to-red-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-display font-bold">A</span>
              </div>
              <span className="text-white font-display font-bold text-2xl tracking-wider">
                AO<span className="text-red-500">QOLT</span>
              </span>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              Unlock the secrets of your energy field. Professional aura readings and
              astrology services tailored for your spiritual journey.
            </p>
            <div className="flex gap-3 mt-6">
              {[{icon: FaTwitter, name: 'Twitter'}, {icon: FaInstagram, name: 'Instagram'}, {icon: FaFacebook, name: 'Facebook'}].map(({icon: Icon, name}, i) => (
                <motion.a
                  key={i}
                  href="#"
                  aria-label={name}
                  whileHover={{ scale: 1.15 }}
                  className="w-9 h-9 bg-white/5 hover:bg-red-900/30 border border-white/10 hover:border-red-900/50 rounded-lg flex items-center justify-center text-white/50 hover:text-red-400 transition-all"
                >
                  <Icon size={15} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-widest mb-4">Services</h3>
            <ul className="space-y-2">
              {['Single Aura Reading', 'Family Aura Reading', 'Astrology Reading', 'All Services'].map((item) => (
                <li key={item}>
                  <Link
                    to="/services"
                    className="text-white/40 hover:text-red-400 text-sm transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-widest mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-white/40 text-sm">
                <FiMail size={14} className="text-red-600" />
                support@aoqolt.com
              </li>
              <li className="flex items-center gap-2 text-white/40 text-sm">
                <FiPhone size={14} className="text-red-600" />
                +1 (555) 000-0000
              </li>
              <li className="flex items-center gap-2 text-white/40 text-sm">
                <FiMapPin size={14} className="text-red-600" />
                Available Worldwide
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/25 text-xs">
            © {new Date().getFullYear()} Aoqolt. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service'].map((item) => (
              <a key={item} href="#" className="text-white/25 hover:text-white/50 text-xs transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

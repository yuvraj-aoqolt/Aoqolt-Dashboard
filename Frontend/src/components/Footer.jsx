import { Link } from 'react-router-dom'
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi'
import { FaInstagram, FaFacebook, FaYoutube, FaLinkedin } from 'react-icons/fa'
import { motion } from 'framer-motion'

export default function Footer() {
  return (
    <footer className="bg-[#080808] border-t border-red-900/20 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img
                src="/Aoqolt logo 1-01-02.png"
                alt="Aoqolt"
                className="h-32 w-32 object-contain"
              />
            </Link>
            <p className="text-white text-sm leading-relaxed max-w-xs">
              Unlock the secrets of your energy field. Professional aura readings and
              astrology services for your growth and healing.
            </p>
            <div className="flex gap-3 mt-6">
              {[
                {icon: FaInstagram, name: 'Instagram', url: 'https://www.instagram.com/aoqolt?igsh=eHE0bTdyY3M4bWw0'},
                {icon: FaFacebook,  name: 'Facebook',  url: 'https://www.facebook.com/share/1NJf8hGzok/'},
                {icon: FaYoutube,   name: 'YouTube',   url: 'https://youtube.com/@aoqolt?si=2imFGqJBVkEtZoun'},
                {icon: FaLinkedin,  name: 'LinkedIn',  url: 'https://www.linkedin.com/company/aoqolt/'},
              ].map(({icon: Icon, name, url}, i) => (
                <motion.a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  whileHover={{ scale: 1.15 }}
                  className="w-9 h-9 bg-white/5 hover:bg-red-900/30 border border-white/10 hover:border-red-900/50 rounded-lg flex items-center justify-center text-white hover:text-red-500 transition-all"
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
              {['Single Aura Scan', 'Family Aura Scan', 'Astrology Session', 'All Services'].map((item) => (
                <li key={item}>
                  <Link
                    to="/services"
                    className="text-white hover:text-red-500 text-sm transition-colors"
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
              <li className="flex items-center gap-2 text-white text-sm">
                <FiMail size={14} className="text-red-600" />
                support@aoqolt.com
              </li>
              <li className="flex items-center gap-2 text-white text-sm">
                <FiPhone size={14} className="text-red-600 shrink-0" />
                <span><span className="text-red-500 font-medium">Canada:</span> +1 (437) 667-1588</span>
              </li>
              <li className="flex items-center gap-2 text-white text-sm">
                <FiPhone size={14} className="text-red-600 shrink-0" />
                <span><span className="text-red-500 font-medium">India:</span> +91 77195 33470</span>
              </li>
              <li className="flex items-center gap-2 text-white text-sm">
                <FiMapPin size={14} className="text-red-600" />
                Available Worldwide
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white text-xs">
            © {new Date().getFullYear()} Aoqolt. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service'].map((item) => (
              <a key={item} href="#" className="text-white hover:text-white text-xs transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Modes', href: '#modes' },
    { label: 'Chat', href: '#chat' },
    { label: 'Features', href: '#features' },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 [transform:translateZ(0)]"
    >
      <div
        className={`transition-all duration-500 ${
          scrolled
            ? 'border-b border-white/[0.06] bg-black/80 backdrop-blur-2xl'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          {/* Logo — small text for navbar */}
          <a href="#" className="group flex items-center">
            <Logo className="text-[15px] font-semibold tracking-[-0.03em] text-white transition-opacity duration-300 group-hover:opacity-80" />
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-4 py-2 text-[13px] text-white/45 hover:text-white transition-colors duration-300"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="#"
              className="text-[13px] text-white/45 hover:text-white transition-colors duration-300"
            >
              Sign in
            </a>
            <Link
              to="/loading?to=/app"
              className="btn-shine group relative text-[13px] font-medium px-5 py-2 rounded-full bg-white text-black hover:shadow-[0_0_24px_-6px_rgba(255,255,255,0.5)] transition-all duration-500"
            >
              Let's go
              <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5"
            aria-label="Menu"
          >
            <span className={`w-5 h-px bg-white transition-all duration-300 ${open ? 'translate-y-[3.5px] rotate-45' : ''}`} />
            <span className={`w-5 h-px bg-white transition-all duration-300 ${open ? '-translate-y-[3.5px] -rotate-45' : ''}`} />
          </button>
        </nav>

        {/* Mobile menu */}
        <motion.div
          initial={false}
          animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="md:hidden overflow-hidden border-t border-white/[0.06] bg-black/90 backdrop-blur-2xl"
        >
          <div className="px-6 py-4 flex flex-col gap-2">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2 text-[13px] text-white/55 hover:text-white transition-colors"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/loading?to=/app"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-white text-black text-[13px] font-medium"
            >
              let's go →
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}
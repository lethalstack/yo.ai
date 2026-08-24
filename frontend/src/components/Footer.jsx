import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const ease = [0.16, 1, 0.3, 1];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden">
      {/* Subtle top border */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Final CTA */}
      <div className="relative px-6 lg:px-10 pt-20 pb-16 lg:pt-24 lg:pb-20">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[240px] hero-glow pointer-events-none" />
        {/* Grid */}
        <div className="absolute inset-0 bg-grid mask-radial opacity-35 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease }}
          className="relative max-w-2xl mx-auto text-center"
        >
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease, delay: 0.08 }}
            className="text-2xl sm:text-3xl lg:text-3xl font-semibold tracking-[-0.04em] leading-[1.02] text-white"
          >
            you still here! seriously?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease, delay: 0.16 }}
            className="mt-5 text-white/45 text-[15px] font-light max-w-sm mx-auto leading-[1.6]"
          >
            no tour. no tutorial. just hit it.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease, delay: 0.24 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              to="/loading?to=/app"
              className="btn-shine group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-white text-black text-[13px] font-medium hover:shadow-[0_0_36px_-6px_rgba(255,255,255,0.5)] transition-all duration-500"
            >
              Let's go
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5">→</span>
            </Link>
           
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5">
            <a href="#" className="flex items-center">
              <Logo className="text-[12px] font-semibold tracking-[-0.03em] text-white/60" />
            </a>
            <span className="hidden sm:inline-block w-px h-3.5 bg-white/10" />
            <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/28">
              YOUR · OWN · AI
            </span>
          </div>

          {/* Credit */}
          <div className="flex items-center gap-2.5 text-[11px] text-white/35">
            <span>
              Designed &amp; Developed by Subhash
            </span>
            <span className="text-white/15">|</span>
            <span>© {new Date().getFullYear()} yo</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
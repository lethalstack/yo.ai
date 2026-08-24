import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const ease = [0.16, 1, 0.3, 1];

export default function Hero() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 35, damping: 25 });
  const sy = useSpring(my, { stiffness: 35, damping: 25 });

  const glowX = useTransform(sx, [-0.5, 0.5], [-50, 50]);
  const glowY = useTransform(sy, [-0.5, 0.5], [-25, 25]);
  const logoX = useTransform(sx, [-0.5, 0.5], [-4, 4]);
  const logoY = useTransform(sy, [-0.5, 0.5], [-2, 2]);
  const ringRotate = useTransform(sx, [-0.5, 0.5], [-3, 3]);

  // ====== Proximity wake / sleep ======
  const proximity = useMotionValue(0);
  const smoothProximity = useSpring(proximity, { stiffness: 40, damping: 30 });

  const sunkY = useTransform(smoothProximity, [0, 1], [5, 0]);
  const logoScale = useTransform(smoothProximity, [0, 1], [0.975, 1]);
  const logoFilter = useTransform(
  smoothProximity,
  (v) => {
    const b = 0.7 + v * 0.3;
    if (v < 0.005) return `brightness(${b})`;
    return `brightness(${b}) drop-shadow(0 0 ${v * 14}px rgba(255,255,255,${v * 0.2}))`;
  }
);
  const glowOpacity = useTransform(smoothProximity, [0, 1], [0.2, 1]);
  const depthShadowOpacity = useTransform(smoothProximity, [0, 1], [0.35, 0]);
  const logoContainerRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      mx.set(nx);
      my.set(ny);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [mx, my]);

  // Proximity tracking
  useEffect(() => {
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (isCoarsePointer || prefersReducedMotion) {
      proximity.set(1);
      return;
    }

    function onMove(e) {
      const el = logoContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threshold = 240;
      const raw = Math.max(0, 1 - dist / threshold);
      const p = raw * raw * (3 - 2 * raw); // smoothstep
      proximity.set(p);
    }

    function onLeave() {
      proximity.set(0);
    }

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [proximity]);

  // ====== "yo" dynamic 3D shadow ======
  const yoTextRef = useRef(null);
  const targetShadow = useRef({ x: 0, y: 0 });
  const currentShadow = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  function buildShadow(lx, ly) {
    return `
      drop-shadow(${1 + lx * 0.3}px ${1 + ly * 0.3}px 0 rgba(0,0,0,0.35))
      drop-shadow(${2 + lx * 0.6}px ${2 + ly * 0.6}px 0 rgba(0,0,0,0.28))
      drop-shadow(${3 + lx * 0.9}px ${3 + ly * 0.9}px 0 rgba(0,0,0,0.20))
      drop-shadow(${4 + lx * 1.4}px ${5 + ly * 1.4}px 8px rgba(0,0,0,0.35))
    `;
  }

  useEffect(() => {
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (isCoarsePointer || prefersReducedMotion) {
      if (yoTextRef.current) yoTextRef.current.style.filter = buildShadow(0, 0);
      return;
    }

    function onMove(e) {
      const svg = yoTextRef.current?.ownerSVGElement;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const reach = 300;
      const nx = Math.max(-1, Math.min(1, dx / reach));
      const ny = Math.max(-1, Math.min(1, dy / reach));
      targetShadow.current = { x: nx * 6, y: ny * 6 };
    }

    function tick() {
      const c = currentShadow.current;
      const t = targetShadow.current;
      c.x += (t.x - c.x) * 0.08;
      c.y += (t.y - c.y) * 0.08;
      if (yoTextRef.current) yoTextRef.current.style.filter = buildShadow(c.x, c.y);
      rafRef.current = requestAnimationFrame(tick);
    }

    window.addEventListener('mousemove', onMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-6">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid mask-radial pointer-events-none" />

      {/* Ambient glow — follows mouse subtly */}
      <motion.div
        style={{ x: glowX, y: glowY }}
        className="absolute top-[22%] left-1/2 -translate-x-1/2 w-[600px] h-[350px] hero-glow animate-glow-pulse pointer-events-none"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-10 text-center">

        {/* ====== LOGO — the main focus ====== */}
        <div className="relative inline-flex items-center justify-center mb-8">

          {/* ====== ORBIT SYSTEM ====== */}
          <motion.div
            style={{ rotate: ringRotate }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.6, ease, delay: 0.9 }}
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          >
            {/* Orbit 1 — outer path · clockwise */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square w-[calc(100%+0.68rem)] sm:w-[calc(100%+0.68rem)] lg:w-[calc(100%+0.68rem)]">
              <div className="absolute inset-0 rounded-full border border-white/[0.05]" />
              <div className="absolute inset-0" style={{ animation: 'spinSlow 36s linear infinite' }}>
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 312deg, rgba(255,255,255,0.28) 358.5deg, transparent 360deg)',
                    WebkitMaskImage:
                      'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 1px))',
                    maskImage:
                      'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 1px))',
                  }}
                />
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full bg-white"
                  style={{ boxShadow: '0 0 7px 1.5px rgba(255,255,255,0.7), 0 0 18px 4px rgba(255,255,255,0.22)' }}
                />
              </div>
            </div>

            {/* Orbit 2 — inner path · counter-clockwise */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square w-[calc(100%+0.06rem)] sm:w-[calc(100%+0.06rem)] lg:w-[calc(100%+1.68rem)]">
              <div className="absolute inset-0 rounded-full border border-white/[0.03]" />
              <div
                className="absolute inset-0"
                style={{ animation: 'spinSlow 30s linear infinite reverse', animationDelay: '-14s' }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.3) 1.5deg, transparent 48deg)',
                    WebkitMaskImage:
                      'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 1px))',
                    maskImage:
                      'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 1px))',
                  }}
                />
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full bg-white"
                  style={{ boxShadow: '0 0 7px 1.5px rgba(255,255,255,0.7), 0 0 18px 4px rgba(255,255,255,0.22)' }}
                />
              </div>
            </div>
          </motion.div>

          {/* Soft glow behind logo — dims when sunk, brightens on wake */}
          <motion.div
            style={{ opacity: glowOpacity }}
            className="absolute inset-0 -m-16 soft-glow pointer-events-none"
          />

          {/* Depth shadow — dark pool beneath the sunk logo, fades on wake */}
          <motion.div
            style={{ opacity: depthShadowOpacity }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-1 w-2/3 h-3 bg-black/40 blur-xl rounded-full pointer-events-none"
          />

          {/* Logo — with float + parallax */}
          <motion.div
            style={{ x: logoX, y: logoY }}
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.4, ease, delay: 0.15 }}
            className="relative animate-logo-float cursor-default"
          >
            {/* Proximity wake/sleep wrapper */}
            <motion.div
              ref={logoContainerRef}
              style={{ y: sunkY, scale: logoScale, filter: logoFilter }}
            >
              <svg
                viewBox="0 0 300 110"
                className="w-[210px] sm:w-[260px] lg:w-[330px] h-auto select-none"
                aria-label="yo"
                role="img"
              >
                <text
                  ref={yoTextRef}
                  x="150"
                  y="88"
                  textAnchor="middle"
                  fontFamily="'Geist Sans', system-ui, sans-serif"
                  fontWeight="600"
                  fontSize="100"
                  letterSpacing="-4"
                  fill="#ffffff"
                  style={{
                    filter: `
                      drop-shadow(1px 1px 0 rgba(0,0,0,0.35))
                      drop-shadow(2px 2px 0 rgba(0,0,0,0.28))
                      drop-shadow(3px 3px 0 rgba(0,0,0,0.20))
                      drop-shadow(4px 5px 8px rgba(0,0,0,0.35))
                    `,
                  }}
                >
                  yo
                </text>
              </svg>
            </motion.div>
          </motion.div>
        </div>

        {/* ====== TAGLINE ====== */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.5 }}
          className="text-[10px] sm:text-[11px] font-mono tracking-[0.32em] uppercase text-white/30"
        >
          SIMPLE{'  '}·{'  '}SMART{'  '}·{'  '}SMOOTH
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.65 }}
          className="mt-6 max-w-lg mx-auto text-[15px] sm:text-base text-white/45 leading-[1.65] font-light"
        >
          No perfect prompt required. just say it — yo keeps up.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.8 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            to="/loading?to=/app"
            className="btn-shine group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-white text-black text-[13px] font-medium hover:shadow-[0_0_36px_-6px_rgba(255,255,255,0.5)] transition-all duration-500"
          >
            Meet yo
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5">→</span>
          </Link>
          <a
            href="#modes"
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full border border-white/[0.12] bg-white/[0.02] backdrop-blur-sm text-[13px] text-white/65 hover:bg-white/[0.04] hover:border-white/20 transition-all duration-500"
          >
            see what it does
            <span className="inline-block text-white/20 transition-transform duration-300 group-hover:translate-x-0.5">↗</span>
          </a>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="absolute left-1/2 -translate-x-1/2 mt-12 hidden sm:flex flex-col items-center gap-2"
        >
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/15 font-mono">Scroll</span>
          <div className="w-px h-7 bg-gradient-to-b from-white/15 to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}
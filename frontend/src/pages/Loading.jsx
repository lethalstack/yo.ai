import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "../components/Logo";

const ease = [0.16, 1, 0.3, 1];

const HOLD_MS = 3000;   // how long the entrance animation plays before exiting
const EXIT_MS = 500;    // fade/scale-out duration before actually navigating

export default function Loading() {

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [exiting, setExiting] = useState(false);

  // only allow navigating into the app itself — never an arbitrary
  // external/open redirect via this param
  const rawTo = searchParams.get("to") || "/app";
  const to = rawTo.startsWith("/app") ? rawTo : "/app";

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), HOLD_MS);
    const navTimer = setTimeout(() => navigate(to, { replace: true }), HOLD_MS + EXIT_MS);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(navTimer);
    };
  }, [to, navigate]);

  return (
    <motion.div
      animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 1.03 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease }}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
    >

      {/* grid background, same language as the hero */}
      <div className="absolute inset-0 bg-grid mask-radial pointer-events-none" />

      {/* ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[340px] hero-glow animate-glow-pulse pointer-events-none" />

      <div className="relative flex flex-col items-center">

        {/* orbit ring, mirrors the hero logo treatment */}
        <div className="relative inline-flex items-center justify-center">

          <div className="absolute inset-0 -m-16 sm:-m-20 pointer-events-none animate-spin-slow">
            <div className="w-full h-full rounded-full border border-white/[0.05]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-[2px] h-[2px] rounded-full bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
            </div>
          </div>

          <div className="absolute inset-0 -m-10 soft-glow pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.88, filter: "blur(14px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, ease, delay: 0.1 }}
            className="relative logo-glow animate-logo-float"
          >
            <Logo className="text-5xl sm:text-6xl font-semibold tracking-[-0.04em] text-white" />
          </motion.div>

        </div>

        {/* tagline */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.55 }}
          className="mt-8 text-[11px] font-mono uppercase tracking-[0.3em] text-white/35"
        >
          let's figure this out.
        </motion.p>

        {/* loading dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="mt-5 flex items-center gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/50"
              style={{
                animation: `dotPulse 1.1s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </motion.div>

      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.25; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>

    </motion.div>
  );
}
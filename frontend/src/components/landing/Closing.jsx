import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import LogoFlat from "./LogoFlat";

const EASE = [0.16, 1, 0.3, 1];

export default function Closing() {
  const { theme, setTheme } = useTheme();

  const pill = (active) =>
    `w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
      active
        ? "border-[var(--yol-border-strong)] text-[var(--yol-fg)] bg-[var(--yol-surface-2)]"
        : "border-[var(--yol-border)] text-[var(--yol-faint)] hover:text-[var(--yol-muted)] hover:border-[var(--yol-border-strong)]"
    }`;

  return (
    <>
      {/* ── final CTA (unchanged) ── */}
            <section className="relative px-6 lg:px-10 pt-16 pb-10 overflow-hidden">
        <div className="yol-grid absolute inset-0 opacity-60 pointer-events-none"
          style={{
            WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 50% 50%, #000 20%, transparent 75%)",
            maskImage: "radial-gradient(ellipse 60% 70% at 50% 50%, #000 20%, transparent 75%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto text-center">
          

          <motion.h2
            initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-[2.9rem] font-semibold tracking-[-0.04em] leading-[1.05]"
          >
            YO belongs to you.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE, delay: 0.18 }}
            className="mt-4 text-[15px] text-[var(--yol-muted)] font-light"
          >
            no tour. no tutorial. just hit it.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE, delay: 0.26 }}
            className="mt-8"
          >
            <Link
              to="/loading?to=/app"
              className="btn-shine inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[var(--yol-accent)] text-[var(--yol-accent-fg)] text-[13px] font-medium hover:opacity-85 active:scale-[0.98] transition-all"
            >
              Open yo →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── floating bottom — ONE composition for all breakpoints ──
          padding matches the navbar at every size: px-6 mobile, lg:px-10 desktop */}
      <div className="px-6 lg:px-10 pt-0 pb-8 flex items-center justify-between">
        {/* left — theme pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme("light")}
            aria-label="Light theme"
            title="Light"
            className={pill(theme === "light")}
          >
            <Sun size={14} />
          </button>
          <button
            onClick={() => setTheme("dark")}
            aria-label="Dark theme"
            title="Dark"
            className={pill(theme === "dark")}
          >
            <Moon size={14} />
          </button>
        </div>

        {/* center — intentionally empty */}

        {/* right — identity */}
        <Link to="/" aria-label="yo — home" className="flex items-center">
          <LogoFlat size={20} />
        </Link>
      </div>
    </>
  );
}
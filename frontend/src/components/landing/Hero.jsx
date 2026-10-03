import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import LogoMark from "./LogoMark";

const EASE = [0.16, 1, 0.3, 1];

/* editorial corner annotation — phase marker + lines + inward connector */
function Rail({ num, label, lines, side, delay, className = "" }) {
  const reduce = useReducedMotion();
  const anim = reduce
    ? {}
    : {
        initial: { opacity: 0.0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, ease: EASE, delay },
      };
  const conn = reduce
    ? {}
    : {
        initial: { scaleX: 0 },
        animate: { scaleX: 1 },
        transition: { duration: 0.75, ease: EASE, delay: delay + 0.25 },
      };
  const fromLeft = side === "left";

  return (
    <motion.div {...anim} className={`absolute ${className}`} aria-hidden="true">
      <p className="text-[9.5px] font-mono uppercase tracking-[0.26em]">
        <span className="text-[var(--yol-faint)]">{num}</span>
        <span className="text-[var(--yol-faint)]"> / </span>
        <span className="text-[var(--yol-muted)]">{label}</span>
      </p>
      {lines.map((l, i) => (
        <p
          key={i}
          className={`mt-1.5 text-[11px] leading-[1.5] ${
            i === 0 ? "text-[var(--yol-muted)]" : "text-[var(--yol-faint)]"
          }`}
        >
          {l}
        </p>
      ))}
      {/* connector hairline toward center — varied lengths, intentional asymmetry */}
      <motion.span
        {...conn}
        className={`absolute top-[7px] hidden xl:block h-px bg-[var(--yol-border)] origin-left ${
          fromLeft ? "left-full ml-5 w-[96px]" : "right-full mr-5 origin-right w-[61px]"
        }`}
      />
      <span
        className={`absolute top-[4.5px] hidden xl:block w-px h-[7px] bg-[var(--yol-border)] ${
          fromLeft ? "left-full ml-[116px]" : "right-full mr-[81px]"
        }`}
      />
    </motion.div>
  );
}

export default function Hero() {
  const reduce = useReducedMotion();
  const r = (delay) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.65, ease: EASE, delay },
        };

  return (
    <section className="relative min-h-[86svh] flex items-start overflow-hidden pt-[20vh] pb-8">

      {/* ═══ four corner annotations — varied lengths/positions, editorial ═══ */}
      <Rail
        num="01" label="Ask"
        lines={["Ask anything.", "Adapt as you learn."]}
        side="left" delay={2.5}
        className="hidden xl:block top-[14%] left-12 max-w-[190px]"
      />
      <Rail
        num="02" label="Remember"
        lines={["Turn understanding into practice.", "Quizzes · Cards · Recall"]}
        side="right" delay={2.68}
        className="hidden xl:block top-[16%] right-16 max-w-[210px] text-right"
      />
      <Rail
        num="03" label="Understand"
        lines={["Explain → Example → Analogy → Check"]}
        side="left" delay={2.84}
        className="hidden xl:block bottom-[17%] left-12 max-w-[230px]"
      />
      <Rail
        num="04" label="Practice"
        lines={["Quiz → Cards → Recall"]}
        side="right" delay={2.97}
        className="hidden xl:block bottom-[12%] right-16 max-w-[200px] text-right"
      />

      

      {/* ═══ CENTER ═══ */}
      <div className="yol-container relative z-10">
        <div className="max-w-[640px] mx-auto text-center">
          <div className="mx-auto w-[min(38vw,150px)] translate-y-3">
          <LogoMark size={150} />
        </div>

          <motion.p {...r(1.98)} className="yol-eyebrow mt-10 sm:mt-12">
            YOUR · OWN · AI
          </motion.p>

          <motion.h1
  {...r(2.1)}
  className="yol-h1 mt-2.5 w-full max-w-[900px] mx-auto"
>
  Learn faster.
  <span className="block text-[var(--yol-fg)]/88 whitespace-nowrap">
    Make it stick longer.
  </span>
</motion.h1>

          <motion.p {...r(2.3)} className="yol-body mt-5 max-w-lg mx-auto">
            YO is an AI learning workspace that helps you understand concepts,
            learn from your own material, practice, and remember what you study.
          </motion.p>

          <motion.div
            {...r(2.42)}
            className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              to="/loading?to=/app"
              className="btn-shine w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[var(--yol-accent)] text-[var(--yol-accent-fg)] text-[14px] font-medium hover:opacity-85 active:scale-[0.98] transition-all min-h-[46px]"
            >
              Meet YO <span aria-hidden="true">→</span>
            </Link>
            <a
              href="#what"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full border border-[var(--yol-border-strong)] text-[14px] text-[var(--yol-muted)] hover:text-[var(--yol-fg)] hover:bg-[var(--yol-surface)] transition-all min-h-[46px]"
            >
              See how it works <span className="text-[var(--yol-faint)]" aria-hidden="true">↓</span>
            </a>
          </motion.div>

          {/* ═══ mobile flow line ═══ */}
          <motion.div
            {...r(2.6)}
            className="xl:hidden mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5"
            aria-label="Ask, understand, practice, remember"
          >
            {["Ask", "Understand", "Practice", "Remember"].map((w, i) => (
              <span key={w} className="flex items-center gap-2">
                {i > 0 && <span className="text-[var(--yol-faint)] text-[10px]">→</span>}
                <span className="text-[9px] font-mono uppercase tracking-[0.24em] text-[var(--yol-muted)]">
                  {w}
                </span>
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
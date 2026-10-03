import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { FileText, ArrowRight } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1];

const reveal = (d = 0) => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: EASE, delay: d },
});

/* thin directional connector — horizontal on desktop, vertical on mobile */
function Connector({ label, delay }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      {...reveal(delay)}
      className="flex lg:flex-col items-center justify-center gap-2 py-2 lg:py-0"
      aria-hidden="true"
    >
      <span className="hidden lg:block w-px h-10 bg-[var(--yol-border)]" />
      <span className="text-[8px] font-mono uppercase tracking-[0.24em] text-[var(--yol-faint)] lg:[writing-mode:vertical-rl]">
        {label}
      </span>
      <ArrowRight size={11} className="text-[var(--yol-faint)] rotate-90 lg:rotate-0" />
      <span className="hidden lg:block w-px flex-1 max-h-24 bg-[var(--yol-border)]" />
    </motion.div>
  );
}

const OUTPUTS = [
  { label: "Explain", desc: "Ask questions with the document as context." },
  { label: "Quiz", desc: "Test yourself from what you studied." },
  { label: "Cards", desc: "Turn key ideas into flashcards." },
];

export default function DropShowcase() {
  const reduce = useReducedMotion();
  const scan = reduce
    ? {}
    : {
        animate: { top: ["6%", "88%"] },
        transition: { duration: 1.5, ease: "easeInOut", delay: 0.7, repeat: 1, repeatType: "reverse" },
      };

  return (
    <section id="drop" className="yol-section relative">
      <div className="yol-container">
        {/* ── intro ── */}
        <div className="max-w-2xl">
          <motion.div {...reveal(0)} className="flex items-center gap-4">
            <span className="yol-eyebrow">Drop</span>
            <span className="flex-1 h-px bg-[var(--yol-border)]" />
          </motion.div>

          <motion.h2 {...reveal(0.06)} className="yol-h2 mt-5">
            Your material goes in.
            <span className="block text-[var(--yol-muted)]">Learning comes out.</span>
          </motion.h2>

          <motion.p {...reveal(0.12)} className="yol-body mt-5 max-w-lg">
            Drop your notes or PDF into YO. Ask questions, practice with quizzes,
            or turn what you studied into flashcards.
          </motion.p>
        </div>

        {/* ── transformation pipeline ── */}
        <motion.div
          {...reveal(0.1)}
          className="mt-14 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.25fr)] gap-4 lg:gap-8 items-center"
        >

          {/* INPUT — the document */}
          <div>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
              className="relative rounded-2xl border border-[var(--yol-border)] bg-[var(--yol-surface)] p-5 overflow-hidden max-w-md mx-auto lg:mx-0 lg:ml-auto"
            >
              {/* one-time scan line — text extraction */}
              <motion.span
                {...scan}
                className="absolute left-0 right-0 h-px bg-[var(--yol-fg)]/35 pointer-events-none"
              />

              <div className="flex items-center gap-4">
                <div className="w-11 h-11 shrink-0 rounded-xl border border-[var(--yol-border)] bg-[var(--yol-surface-2)] flex items-center justify-center">
                  <FileText size={18} className="text-[var(--yol-muted)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium truncate">
                    Operating Systems — Notes.pdf
                  </p>
                  {/* status: extracting → ready (one-shot crossfade) */}
                  <span className="relative block h-4 mt-0.5">
                    <motion.span
                      className="absolute inset-0 text-[11px] font-mono tracking-[0.14em] text-[var(--yol-faint)] uppercase"
                      initial={reduce ? { opacity: 0 } : { opacity: 1 }}
                      animate={reduce ? { opacity: 0 } : { opacity: [1, 1, 0] }}
                      transition={
                        reduce
                          ? { duration: 0.01, delay: 0 }
                          : { duration: 1.2, times: [0, 0.55, 0.7], delay: 1.3 }
                      }
                    >
                      extracting text…
                    </motion.span>
                    <motion.span
                      className="absolute inset-0 text-[11px] font-mono tracking-[0.14em] text-[var(--yol-muted)] uppercase"
                      initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                      animate={reduce ? { opacity: 1 } : { opacity: [0, 0, 1] }}
                      transition={
                        reduce
                          ? { duration: 0.01, delay: 0 }
                          : { duration: 1.2, times: [0, 0.55, 0.7], delay: 1.3 }
                      }
                    >
                      pdf · 24 pages · ready
                    </motion.span>
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.p
              {...reveal(0.4)}
              className="mt-3 text-center lg:text-right text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--yol-faint)]"
            >
              pdf + txt supported
            </motion.p>
          </div>

          {/* CONNECTOR — context flows to yo */}
          <Connector label="context" delay={0.5} />

          {/* CENTER — YO transformation node */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.7 }}
            className="flex flex-col items-center text-center py-4"
          >
            {/* small node — not a logo treatment */}
            <div className="w-14 h-14 rounded-2xl border border-[var(--yol-border-strong)] bg-[var(--yol-surface-2)] flex items-center justify-center">
              <span className="text-[13px] font-semibold tracking-[-0.02em]">YO</span>
            </div>
            <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.28em] text-[var(--yol-muted)]">
              Understands
            </p>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.28em] text-[var(--yol-muted)]">
              your material
            </p>
          </motion.div>

          {/* CONNECTOR — learning comes out */}
          <Connector label="learning" delay={0.9} />

          {/* OUTPUT — three connected destinations */}
          <div className="max-w-md w-full mx-auto lg:mx-0">
            {OUTPUTS.map((o, i) => (
              <motion.div
                key={o.label}
                initial={reduce ? false : { opacity: 0, x: 18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: EASE, delay: 1.15 + i * 0.14 }}
              >
                <Link
                  to="/loading?to=/app"
                  className="group flex items-center gap-5 py-4 border-b border-[var(--yol-border)] first:border-t transition-colors hover:bg-[var(--yol-surface)] px-3 -mx-3 rounded-lg"
                >
                  <span className="text-[10px] font-mono text-[var(--yol-faint)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold tracking-[-0.01em]">
                      {o.label}
                    </span>
                    <span className="block mt-0.5 text-[12px] text-[var(--yol-muted)] font-light leading-[1.5]">
                      {o.desc}
                    </span>
                  </span>
                  <ArrowRight
                    size={14}
                    className="shrink-0 text-[var(--yol-faint)] group-hover:text-[var(--yol-fg)] group-hover:translate-x-1 transition-all"
                  />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
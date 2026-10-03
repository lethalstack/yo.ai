import { Fragment, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

/* the two moments — one question, one material. both real product behavior. */
const MOMENTS = {
  question: {
    chip: "a question",
    user: '"I have an exam tomorrow and I don\'t know where to start."',
    yo: "okay. let's break it down and figure out where to start.",
  },
  notes: {
    chip: "your notes",
    user: "📄 DSA — Notes.pdf",
    yo: "got it. let's work through these notes together.",
  },
};
const ACTIONS = [
  { num: "01", label: "Explain", href: "#ask" },
  { num: "02", label: "Practice", href: "#learn" },
  { num: "03", label: "Quiz me", href: "#test" },
  { num: "04", label: "Remember", href: "#remember" },
];

const reveal = (d = 0) => ({
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.65, ease: EASE, delay: d },
});

export default function WhatIsYo() {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState("question");
  const m = MOMENTS[mode];

  /* the exchange crossfades as one unit — script fragment, not chat UI */
  const exchange = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };

  return (
    <section id="what" className="yol-section-tight relative">
      <div className="yol-container">
        <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)_minmax(0,3fr)] gap-10 lg:gap-12 items-start">

          {/* ═══ LEFT — the statement ═══ */}
          <div className="lg:sticky lg:top-24">
            <motion.div {...reveal(0)}>
              <span className="yol-eyebrow">What is YO</span>
              <span className="block w-12 h-px bg-[var(--yol-border)] mt-4" aria-hidden="true" />
            </motion.div>

            <motion.h2 {...reveal(0.06)} className="yol-h2 mt-5">
              YO is an AI learning workspace.
              <span className="block text-[var(--yol-muted)]">Not just another chatbot.</span>
            </motion.h2>

            <motion.p {...reveal(0.12)} className="yol-body mt-5 max-w-xs">
              Bring a question or your own notes. YO works through them with you.
            </motion.p>
          </div>

          {/* ═══ CENTER — the moment, staged as a script page ═══ */}
          <div>
            {/* input chips — what you bring */}
            <motion.div
              {...reveal(0.1)}
              className="flex items-center gap-2.5"
              role="tablist"
              aria-label="What you bring to YO"
            >
              {Object.entries(MOMENTS).map(([key, val]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={mode === key}
                  onClick={() => setMode(key)}
                  className={`px-3.5 py-1.5 rounded-lg text-[11px] font-mono tracking-[0.06em] border transition-colors ${
                    mode === key
                      ? "border-[var(--yol-border-strong)] bg-[var(--yol-surface)] text-[var(--yol-fg)]"
                      : "border-[var(--yol-border)] text-[var(--yol-faint)] hover:text-[var(--yol-muted)] hover:border-[var(--yol-border-strong)]"
                  }`}
                >
                  {val.chip}
                </button>
              ))}
            </motion.div>

            {/* the script page — margin hairline + exchange */}
            <motion.div {...reveal(0.18)} className="mt-7 mb-8 relative">
              {/* notebook margin rule — runs the full height of the exchange */}
              <span
                className="absolute left-0 top-1 bottom-1 w-px bg-[var(--yol-border)]"
                aria-hidden="true"
              />

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  {...exchange}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="pl-6"
                >
                  {/* user line */}
                  <div className="flex items-baseline gap-3">
                    <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--yol-faint)] shrink-0 w-8">
                      you
                    </span>
                    <p className="text-[14px] text-[var(--yol-muted)] font-light leading-[1.6]">
                      {m.user}
                    </p>
                  </div>

                  {/* yo line — the peak of the section */}
                  <div className="mt-6 flex items-baseline gap-3">
                    <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--yol-faint)] shrink-0 w-8">
                      yo
                    </span>
                    <p className="text-[18px] sm:text-[20px] font-medium tracking-[-0.01em] text-[var(--yol-fg)] leading-[1.5]">
                      {m.yo}
                      <span
                        className="cursor-stream inline-block ml-1"
                        style={{ height: "15px", background: "var(--yol-fg)", boxShadow: "none" }}
                      />
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* ═══ RIGHT — editorial action index ═══ */}
          <motion.nav
            {...reveal(0.2)}
            aria-label="What YO can do with your context"
            className="lg:pt-24 lg:text-right"
          >
            {/* mobile/tablet: horizontal wrap row; desktop: vertical index */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:flex-col lg:items-end lg:gap-y-0">
              {ACTIONS.map((a, i) => (
                <a
                  key={a.num}
                  href={a.href}
                  className={`group inline-flex items-baseline gap-1.5 text-[11px] font-mono uppercase tracking-[0.2em] transition-all ${
                    i > 0 ? "lg:mt-4" : ""
                  }`}
                >
                  <span className="text-[var(--yol-faint)] group-hover:text-[var(--yol-muted)] transition-colors">
                    {a.num} —
                  </span>
                  <span className="text-[var(--yol-muted)] group-hover:text-[var(--yol-fg)] group-hover:translate-x-1 lg:group-hover:translate-x-0 lg:group-hover:-translate-x-1 transition-transform">
                    {a.label}
                  </span>
                </a>
              ))}
            </div>

            {/* closer — bottom of the index on desktop, below on mobile */}
            <p className="mt-5 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--yol-faint)]">
              same conversation · same context
            </p>
          </motion.nav>
        </div>

                      {/* ── HOW YO WORKS — compact session strip ── */}
        <motion.div {...reveal(0.24)} className="mt-14 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="w-8 h-px bg-[var(--yol-border)]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--yol-muted)]">
              How YO works
            </span>
            <span className="w-8 h-px bg-[var(--yol-border)]" />
          </div>

          {/* four stages on one line — thin connectors between */}
          <div className="hidden sm:flex items-start">
            {["Ask", "Understand", "Practice", "Check"].map((s, i) => (
              <Fragment key={s}>
                {i > 0 && (
                  <div className="flex-1 flex flex-col items-center pt-[5px]" aria-hidden="true">
                    <motion.span
                      initial={reduce ? false : { scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, ease: EASE, delay: 0.3 + i * 0.12 }}
                      className="w-full h-px bg-[var(--yol-border-strong)] origin-left"
                    />
                    <span className="text-[var(--yol-faint)] text-[10px] mt-1">↓</span>
                  </div>
                )}
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, ease: EASE, delay: 0.2 + i * 0.12 }}
                  className="flex flex-col items-center text-center w-[88px] shrink-0"
                >
                  <span className="text-[9px] font-mono text-[var(--yol-faint)]">0{i + 1}</span>
                  <span className="mt-1.5 text-[12px] font-medium tracking-[-0.01em] text-[var(--yol-fg)]">
                    {s}
                  </span>
                </motion.div>
              </Fragment>
            ))}
          </div>

          {/* mobile — tight 2×2 */}
          <div className="sm:hidden grid grid-cols-2 gap-y-3 gap-x-2 text-center">
            {["Ask", "Understand", "Practice", "Check"].map((s, i) => (
              <div key={s}>
                <span className="text-[9px] font-mono text-[var(--yol-faint)]">0{i + 1}</span>
                <p className="mt-0.5 text-[12px] font-medium text-[var(--yol-fg)]">{s}</p>
              </div>
            ))}
          </div>

          <motion.p
            {...reveal(0.5)}
            className="mt-7 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--yol-faint)]"
          >
            one conversation · one context · all the way through
          </motion.p>
        </motion.div>

      </div>
    </section>
  );
}
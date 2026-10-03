import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

const MODES = [
  { slug: "chill", label: "Chill", emoji: "😎" },
  { slug: "exam", label: "Exam", emoji: "📚" },
  { slug: "coding", label: "Coding", emoji: "💻" },
  { slug: "interview", label: "Interview", emoji: "💼" },
];

const CONTENT = {
  chill: { sys: "YO — CHILL", meta: ["tone · relaxed", "no lectures"] },
  exam: { sys: "YO — EXAM", meta: ["one question at a time", "focused"] },
  coding: { sys: "YO — CODING", meta: ["explains the why", "code first"] },
  interview: { sys: "YO — INTERVIEW", meta: ["pushes back", "real pacing"] },
};

const reveal = (d = 0) => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: EASE, delay: d },
});

/* ── CHILL ── */
function ChillBody({ st }) {
  return (
    <div className="space-y-4">
      <motion.div {...st(0, 18)} className="flex justify-end">
        <div className="max-w-[78%] rounded-xl rounded-tr-[3px] border border-[var(--yol-border)] bg-[var(--yol-surface-2)] px-4 py-2.5 text-[13px] text-[var(--yol-fg)]">
          Can you explain why my program keeps crashing? 😩
        </div>
      </motion.div>
             <motion.div {...st(1, -18)} className="pl-4">
        <p className="max-w-[560px] text-[13.5px] leading-[1.7] text-[var(--yol-fg)] border-l-2 border-[var(--yol-border-strong)] pl-4">
          haha relax 😄 crashes look scary but they're basically your program
          tripping over its own shoelaces 👟 — usually one of three things:
          bad memory access, an error nobody caught, or the OS just pulling
          the plug 🔌
        </p>
      </motion.div>
      <motion.div {...st(2, -18)} className="pl-4">
        <p className="max-w-[560px] text-[13.5px] leading-[1.7] text-[var(--yol-fg)] border-l-2 border-[var(--yol-border-strong)] pl-4">
          tell me the language and paste the last thing on your screen 📋 —
          we'll narrow it down in one message, promise 😎
        </p>
      </motion.div>
    </div>
  );
}

/* ── EXAM ── */
function ExamBody({ st }) {
  const options = ["Paging", "Swapping", "Segmentation", "Defragmentation"];
  return (
    <div>
      <motion.p {...st(0)} className="text-[16px] sm:text-[17px] font-medium tracking-[-0.015em] leading-[1.45] max-w-lg">
        Which memory-management technique moves inactive pages out of RAM?
      </motion.p>
      <div className="mt-5 grid sm:grid-cols-2 gap-2 max-w-xl">
        {options.map((o, i) => (
          <motion.div
            key={o}
            {...st(1 + i * 0.4)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-[13px] ${
              i === 1
                ? "border-[var(--yol-border-strong)] bg-[var(--yol-surface-2)] text-[var(--yol-fg)]"
                : "border-[var(--yol-border)] text-[var(--yol-muted)]"
            }`}
          >
            <span className="text-[10px] font-mono text-[var(--yol-faint)]">{"ABCD"[i]}</span>
            {o}
          </motion.div>
        ))}
      </div>
      <motion.p {...st(3)} className="mt-4 text-[11.5px] text-[var(--yol-faint)]">
        Swapping — inactive pages sit on disk until they're needed again.
      </motion.p>
    </div>
  );
}

/* ── CODING ── */
function CodingBody({ st, reduce }) {
  return (
    <div className="grid sm:grid-cols-[1.15fr_1fr] gap-6">
      <motion.div {...st(0, -18)} className="relative rounded-xl border border-[var(--yol-border)] bg-[var(--yol-bg)] px-4 py-3.5 overflow-hidden">
        {!reduce && (
          <motion.span
            initial={{ top: "-4%" }}
            animate={{ top: ["-4%", "104%"] }}
            transition={{ duration: 0.9, ease: "easeInOut", delay: 0.55 }}
            className="absolute left-0 right-0 h-px bg-[var(--yol-fg)]/25 pointer-events-none"
          />
        )}
        <pre className="font-mono text-[11.5px] leading-[1.8] overflow-x-auto">
          <code>
            <span className="block"><span className="text-[var(--yol-fg)]">function</span> getUser(id) {"{"}</span>
            <span className="block">{"  "}fetch(<span className="text-[var(--yol-fg)]">"/api/user?id="</span> + id)</span>
            <span className="block">{"    "}.then(r {"=>"} r.json())</span>
            <span className="block">{"    "}.then(u {"=>"} u);</span>
            <span className="block">{"}"}</span>
            <span className="block mt-2">const user = getUser(7);</span>
            <span className="block text-[var(--yol-faint)]">{"// user → undefined"}</span>
          </code>
        </pre>
      </motion.div>
      <motion.div {...st(1, 18)} className="text-[13px] leading-[1.75] text-[var(--yol-muted)] space-y-3.5">
        <p>
          <span className="text-[var(--yol-fg)] font-medium">Nothing is returned.</span>{" "}
          <code className="font-mono text-[12px]">getUser</code> starts the fetch
          but never hands the result back — the function finishes before the
          network does.
        </p>
        <p>
          Either <code className="font-mono text-[12px]">return</code> the
          promise, or make it <code className="font-mono text-[12px]">async</code>{" "}
          and <code className="font-mono text-[12px]">await</code> it.
        </p>
      </motion.div>
    </div>
  );
}

/* ── INTERVIEW ── */
function InterviewBody({ st }) {
  return (
    <div className="space-y-4">
      <motion.div {...st(0, -18)} className="rounded-xl border border-[var(--yol-border-strong)] bg-[var(--yol-surface-2)] px-5 py-4">
        <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--yol-faint)] mb-2">
          interviewer
        </p>
        <p className="text-[15px] font-medium leading-[1.55]">
          Tell me about a time you debugged something with no obvious cause.
        </p>
      </motion.div>
      <motion.div {...st(1, 18)} className="rounded-xl border border-[var(--yol-border)] px-5 py-4">
        <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--yol-faint)] mb-2">
          candidate
        </p>
        <p className="text-[13px] text-[var(--yol-muted)] leading-[1.7]">
          I started with logs, ruled out the obvious, then bisected the change
          history until the failing commit surfaced.
        </p>
      </motion.div>
      <motion.p {...st(2)} className="text-[11.5px] text-[var(--yol-muted)]">
        Good. Now — what would you have checked first, and why?
      </motion.p>
    </div>
  );
}

const BODIES = { chill: ChillBody, exam: ExamBody, coding: CodingBody, interview: InterviewBody };

export default function ModesShowcase() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const tabRefs = useRef([]);

  function switchMode(i) {
    if (i === active) return;
    setDir(i > active ? 1 : -1);
    setActive(i);
  }

  const m = MODES[active];
  const c = CONTENT[m.slug];
  const Body = BODIES[m.slug];
  const st = (i, x = 0) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12, x },
    animate: { opacity: 1, y: 0, x: 0 },
    transition: { duration: 0.45, ease: EASE, delay: reduce ? 0 : 0.14 + i * 0.09 },
  });

  const ws = {
    enter: (d) => (reduce ? { opacity: 0 } : { opacity: 0, x: 28 * d, filter: "blur(4px)" }),
    center: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: (d) => (reduce ? { opacity: 0 } : { opacity: 0, x: -28 * d, filter: "blur(4px)" }),
  };

  return (
    <section id="modes" className="yol-section relative">
      <div className="yol-container">

        {/* ── intro ── */}
        <div className="max-w-2xl mx-auto text-center">
          <motion.div {...reveal(0)} className="flex items-center justify-center gap-4">
            <span className="w-10 h-px bg-[var(--yol-border)]" />
            <span className="yol-eyebrow">Modes</span>
            <span className="w-10 h-px bg-[var(--yol-border)]" />
          </motion.div>

          <motion.h2 {...reveal(0.06)} className="yol-h2 mt-5">
            Different mode.
            <span className="block text-[var(--yol-muted)]">Same YO.</span>
          </motion.h2>

          <motion.p {...reveal(0.12)} className="yol-body mt-5 max-w-md mx-auto">
            One workspace. Four ways to think, practice, and prepare.
          </motion.p>
        </div>

        {/* ═══ four independent controls — no enclosing container ═══ */}
        <motion.div
          {...reveal(0.15)}
          className="mt-10 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 max-w-full"
        >
          {MODES.map((mode, i) => {
            const isActive = i === active;
            return (
              <motion.button
                key={mode.slug}
                ref={(el) => { tabRefs.current[i] = el; }}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => switchMode(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") { e.preventDefault(); switchMode((active + 1) % MODES.length); }
                  if (e.key === "ArrowLeft") { e.preventDefault(); switchMode((active + MODES.length - 1) % MODES.length); }
                }}
                animate={{
                  backgroundColor: isActive ? "var(--yol-accent)" : "var(--yol-surface-2)",
                  color: isActive ? "var(--yol-accent-fg)" : "var(--yol-muted)",
                  borderColor: isActive ? "var(--yol-accent)" : "var(--yol-border)",
                }}
                whileHover={
                  isActive
                    ? { y: -2 }
                    : reduce
                      ? { color: "var(--yol-fg)", borderColor: "var(--yol-border-strong)" }
                      : { y: -2, color: "var(--yol-fg)", borderColor: "var(--yol-border-strong)" }
                }
                whileTap={{ scale: 0.97 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.35, ease: EASE }
                }
                className={`group relative inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full border bg-[var(--yol-surface-2)] text-[11px] sm:text-[12px] font-mono uppercase tracking-[0.14em] outline-none focus-visible:ring-1 focus-visible:ring-[var(--yol-fg)] cursor-pointer ${
                  isActive ? "shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className="text-[12px] leading-none transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                >
                  {mode.emoji}
                </span>
                {mode.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── the workspace — unchanged ── */}
        <motion.div {...reveal(0.2)} className="mt-8 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-[var(--yol-border)] bg-[var(--yol-surface)] overflow-hidden">
            {/* chrome */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-3.5 border-b border-[var(--yol-border)]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`sys-${m.slug}`}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -5 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="text-[10px] font-mono uppercase tracking-[0.26em] text-[var(--yol-muted)]"
                >
                  {c.sys}
                </motion.span>
              </AnimatePresence>
              <span className="text-[9px] font-mono tracking-[0.2em] text-[var(--yol-faint)]">
                {String(active + 1).padStart(2, "0")} / 04
              </span>
            </div>

                        {/* body — stable height; content slides directionally only */}
            <div className="px-6 sm:px-9 py-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={m.slug}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 * dir, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 * dir, filter: "blur(4px)" }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="min-h-[300px] sm:min-h-[320px] flex flex-col justify-center"
                >
                  <Body st={st} reduce={reduce} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* footer */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-3.5 border-t border-[var(--yol-border)]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`meta-${m.slug}`}
                  className="flex gap-5"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -5 }}
                  transition={{ duration: 0.28, ease: EASE, delay: 0.12 }}
                >
                  {c.meta.map((t) => (
                    <span key={t} className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--yol-faint)]">
                      {t}
                    </span>
                  ))}
                </motion.div>
              </AnimatePresence>
              <Link
                to={`/loading?to=${encodeURIComponent(`/app?mode=${m.slug}`)}`}
                className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--yol-muted)] hover:text-[var(--yol-fg)] transition-colors shrink-0"
              >
                open in yo →
              </Link>
            </div>
          </div>

          {/* quiet system annotation */}
          <motion.div {...reveal(0.25)} aria-hidden="true" className="mt-4 flex items-center justify-center gap-3">
            <span className="w-10 h-px bg-[var(--yol-border)]" />
            <span className="text-[9px] font-mono uppercase tracking-[0.24em] text-[var(--yol-faint)]">
              one system · four states
            </span>
            <span className="w-10 h-px bg-[var(--yol-border)]" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
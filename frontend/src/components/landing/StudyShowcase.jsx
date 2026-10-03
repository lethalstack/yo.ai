import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Check, Shuffle } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1];
const reveal = (d = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.75, ease: EASE, delay: d },
});
const PIPE = ["PDF", "YO", "QUIZ", "CARDS", "REMEMBER"];

export default function StudyShowcase() {
  const [flipped, setFlipped] = useState(false);

  return (
    <section id="study" className="relative px-6 lg:px-10 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto">
          <motion.span {...reveal()} className="text-[10px] font-mono tracking-[0.28em] text-[var(--yol-faint)] uppercase">Study</motion.span>
          <motion.h2 {...reveal(0.06)} className="mt-3 text-3xl sm:text-4xl lg:text-[2.6rem] font-semibold tracking-[-0.04em] leading-[1.08]">
            Drop your material.<br />
            <span className="text-[var(--yol-muted)]">YO understands it.</span>
          </motion.h2>
        </div>

        <motion.div {...reveal(0.1)} className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {PIPE.map((p, i) => (
            <div key={p} className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-lg text-[12px] font-mono tracking-[0.14em] border ${
                p === "YO"
                  ? "bg-[var(--yol-accent)] text-[var(--yol-accent-fg)] border-transparent"
                  : "border-[var(--yol-border)] text-[var(--yol-muted)]"
              }`}>{p}</span>
              {i < PIPE.length - 1 && <span className="text-[var(--yol-faint)] text-xs">→</span>}
            </div>
          ))}
        </motion.div>

        <div className="mt-12 grid lg:grid-cols-2 gap-6">
          {/* QUIZ mock — mirrors the real QuizModal */}
          <motion.div {...reveal(0.12)}
            className="rounded-2xl border border-[var(--yol-border)] bg-[var(--yol-surface)] p-6">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--yol-faint)]">
              <span className="tracking-[0.2em] uppercase">Quiz</span>
              <span>03 / 10 · 60%</span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-[var(--yol-surface-2)] overflow-hidden">
              <div className="h-full w-[30%] rounded-full bg-[var(--yol-fg)] opacity-60" />
            </div>
            <p className="mt-5 text-[15px] leading-relaxed">
              Which normal form eliminates transitive dependencies?
            </p>
            <div className="mt-4 space-y-2">
              {[
                { t: "1NF", s: "idle" },
                { t: "3NF", s: "correct" },
                { t: "2NF", s: "idle" },
                { t: "BCNF", s: "idle" },
              ].map((o, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-[13px] ${
                  o.s === "correct"
                    ? "border-[var(--yol-border-strong)] bg-[var(--yol-surface-2)]"
                    : "border-[var(--yol-border)] text-[var(--yol-muted)]"
                }`}>
                  <span className="text-[var(--yol-faint)] text-[11px]">{"ABCD"[i]}</span>
                  {o.t}
                  {o.s === "correct" && <Check size={14} className="ml-auto" />}
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12px] text-[var(--yol-faint)] font-mono tracking-[0.16em] uppercase">Generated from OS_Notes.pdf</p>
          </motion.div>

          {/* CARDS mock — actually flips */}
          <motion.div {...reveal(0.2)}
            className="rounded-2xl border border-[var(--yol-border)] bg-[var(--yol-surface)] p-6 flex flex-col">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--yol-faint)]">
              <span className="tracking-[0.2em] uppercase">Flashcards</span>
              <span className="flex items-center gap-1.5"><Shuffle size={12} /> shuffle</span>
            </div>

            <div className="yol-flip-scene flex-1 my-6 cursor-pointer select-none" onClick={() => setFlipped((f) => !f)}>
              <div className={`yol-flip relative h-56 ${flipped ? "flipped" : ""}`}>
                <div className="yol-flip-face absolute inset-0 rounded-2xl border border-[var(--yol-border)] bg-[var(--yol-surface-2)] flex items-center justify-center p-6 text-center">
                  <p className="text-[15px]">What is a deadlock?</p>
                </div>
                <div className="yol-flip-face yol-flip-back absolute inset-0 rounded-2xl bg-[var(--yol-accent)] text-[var(--yol-accent-fg)] flex items-center justify-center p-6 text-center">
                  <p className="text-[13px] leading-relaxed opacity-90">
                    Two or more processes each waiting for a resource held by the next — a circular wait with no way out.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-[11px] text-[var(--yol-faint)] font-mono tracking-[0.16em] uppercase">tap card to flip</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

const reveal = (d = 0) => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
  transition: { duration: 0.65, ease: EASE, delay: d },
});

/* one stage of the learning sequence — marker on the spine, content beside */
function Stage({ num, label, delay, children }) {
  return (
    <motion.div {...reveal(delay)} className="relative pl-10 sm:pl-14 pb-10 sm:pb-12 last:pb-0">
      {/* spine segment below the marker */}
      <span
        className="absolute left-[7px] sm:left-[11px] top-5 w-px h-[calc(100%-8px)] bg-[var(--yol-border)]"
        aria-hidden="true"
      />
      {/* node on the spine */}
      <span
        className="absolute left-0 sm:left-1 top-[3px] w-[15px] h-[15px] rounded-full border border-[var(--yol-border-strong)] bg-[var(--yol-bg)] flex items-center justify-center"
        aria-hidden="true"
      >
        <span className="w-[5px] h-[5px] rounded-full bg-[var(--yol-muted)]" />
      </span>

      <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-[var(--yol-faint)]">
        {num} <span className="text-[var(--yol-border-strong)]">/</span> {label}
      </p>

      <div className="mt-3.5">{children}</div>
    </motion.div>
  );
}

export default function LearnShowcase() {
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState(null);

  const OPTIONS = [
    { key: "A", text: "Server response time" },
    { key: "B", text: "Font size" },
    { key: "C", text: "Button color" },
  ];

  return (
    <section id="learn" className="yol-section relative">
      <div className="yol-container">
        <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] gap-10 lg:gap-16 items-start">

          {/* ═══ LEFT — statement (sticky while the sequence scrolls) ═══ */}
          <div className="lg:sticky lg:top-24">
            <motion.div {...reveal(0)} className="flex items-center gap-4">
              <span className="yol-eyebrow">Learn</span>
              <span className="flex-1 h-px bg-[var(--yol-border)]" />
            </motion.div>

            <motion.h2 {...reveal(0.06)} className="yol-h2 mt-5">
              Don't just get answers.
              <span className="block text-[var(--yol-muted)]">Understand what's happening.</span>
            </motion.h2>

            <motion.p {...reveal(0.12)} className="yol-body mt-5 max-w-md">
              When something doesn't make sense, YO breaks it down until the idea
              clicks — with context, examples, and a quick check.
            </motion.p>
          </div>

          {/* ═══ RIGHT — one continuous learning journey ═══ */}
          <div className="max-w-2xl">

            <Stage num="01" label="Question" delay={0.05}>
              <p className="text-[20px] sm:text-[24px] font-medium tracking-[-0.02em] leading-[1.3]">
                "Why is my API request taking 3 seconds?"
              </p>
            </Stage>

            <Stage num="02" label="Explain" delay={0.05}>
              <p className="yol-body max-w-xl">
                Your code isn't necessarily slow. The request has to travel to a
                server, wait for it to process the data, and then send the
                response back.
              </p>
            </Stage>

            <Stage num="03" label="Make it simple" delay={0.05}>
              <p className="yol-body max-w-xl">
                Think of it like ordering food. The kitchen might be fast —
                you're still waiting for the delivery.
              </p>
            </Stage>

            <Stage num="04" label="See it" delay={0.05}>
              <div className="rounded-xl border border-[var(--yol-border)] bg-[var(--yol-surface)] px-5 py-4 max-w-lg">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--yol-faint)] mb-2.5">
                  Measure first
                </p>
                <pre className="font-mono text-[12.5px] leading-[1.8] overflow-x-auto"><code>{`const start = Date.now();

await fetch("/api/user");

console.log(\`\${Date.now() - start}ms\`);`}</code></pre>
              </div>
            </Stage>

            <Stage num="05" label="Quick check" delay={0.05}>
              <div className="rounded-xl border border-[var(--yol-border)] bg-[var(--yol-surface)] px-5 py-4 max-w-lg">
                <p className="text-[15px] font-medium">What would you measure first?</p>

                <div className="mt-3.5 space-y-1.5">
                  {OPTIONS.map((o) => {
                    const answered = picked !== null;
                    const isCorrect = o.key === "A";
                    return (
                      <button
                        key={o.key}
                        onClick={() => !answered && setPicked(o.key)}
                        disabled={answered}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-left text-[13px] transition-colors ${
                          answered && isCorrect
                            ? "border-[var(--yol-border-strong)] bg-[var(--yol-surface-2)] text-[var(--yol-fg)]"
                            : answered
                              ? "border-[var(--yol-border)] text-[var(--yol-faint)] opacity-60"
                              : "border-[var(--yol-border)] text-[var(--yol-muted)] hover:border-[var(--yol-border-strong)] hover:text-[var(--yol-fg)]"
                        }`}
                      >
                        <span className="text-[10px] font-mono text-[var(--yol-faint)]">{o.key}</span>
                        {o.text}
                      </button>
                    );
                  })}
                </div>

                {picked !== null && (
                  <motion.p
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="mt-3.5 text-[13px] leading-[1.6]"
                  >
                    <span className="font-medium">A — server response time.</span>{" "}
                    <span className="text-[var(--yol-muted)]">
                      Start with where the delay actually happens.
                    </span>
                  </motion.p>
                )}
              </div>
            </Stage>
          </div>
        </div>
      </div>
    </section>
  );
}
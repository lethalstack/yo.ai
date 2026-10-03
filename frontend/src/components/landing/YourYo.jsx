import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";

const EASE = [0.16, 1, 0.3, 1];
const reveal = (d = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.7, ease: EASE, delay: d },
});

export default function YourYo() {
  const { theme, setTheme } = useTheme();

  return (
    <section id="you" className="relative px-6 lg:px-10 py-20">
      <div className="max-w-3xl mx-auto text-center">
        <motion.span {...reveal()} className="text-[10px] font-mono tracking-[0.28em] text-[var(--yol-faint)] uppercase">Your yo</motion.span>
        <motion.h2 {...reveal(0.06)} className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.04em]">
          it's yours. literally.
        </motion.h2>
        <motion.p {...reveal(0.12)} className="mt-4 text-[15px] text-[var(--yol-muted)] font-light max-w-md mx-auto leading-[1.65]">
          Your account, your conversations, your material, your theme. Signed in with Google or email — everything stays yours.
        </motion.p>

        <motion.div {...reveal(0.18)}
          className="mt-10 mx-auto max-w-sm rounded-2xl border border-[var(--yol-border)] bg-[var(--yol-surface)] p-5 text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[var(--yol-surface-2)] border border-[var(--yol-border)] flex items-center justify-center text-[15px] font-medium">S</div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium truncate">Subhash</p>
              <p className="text-[11px] text-[var(--yol-muted)] truncate">signed in with Google</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--yol-border)]">
            <p className="text-[9px] font-mono tracking-[0.22em] text-[var(--yol-faint)] uppercase mb-2">Appearance — try it</p>
            <div className="flex p-0.5 rounded-xl bg-[var(--yol-surface-2)] border border-[var(--yol-border)]">
              {["dark", "light"].map((t) => (
                <button key={t} onClick={() => setTheme(t)}
                  className={`flex-1 h-8 rounded-lg text-[12px] font-medium capitalize transition-colors ${
                    theme === t ? "bg-[var(--yol-accent)] text-[var(--yol-accent-fg)]" : "text-[var(--yol-muted)] hover:text-[var(--yol-fg)]"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {["export chats", "clear history", "your data, your control"].map((t) => (
              <span key={t} className="px-2.5 py-1 text-[10px] font-mono text-[var(--yol-faint)] border border-[var(--yol-border)] rounded-full">{t}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X, Download } from "lucide-react";
import LogoFlat from "./landing/LogoFlat";

/* Install prompt — desktop: card in the sidebar (variant="card").
   Mobile: centered glass dialog over a blurred page (variant="floating").
   Hidden once actually installed; X / "Not now" dismiss for the page view only. */
export default function InstallPill({ variant = "card" }) {
  const reduce = useReducedMotion();
  const [deferred, setDeferred] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [gone, setGone] = useState(() => {
    // hidden ONLY if actually installed — dismissal never persists
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    )
      return true;
    try {
      if (localStorage.getItem("yo-install-done") === "1") return true;
    } catch {}
    return false;
  });

  useEffect(() => {
    if (gone) return;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    function onPrompt(e) {
      e.preventDefault();
      setDeferred(e);
    }
    function onInstalled() {
      try {
        localStorage.setItem("yo-install-done", "1"); // permanent — installed
      } catch {}
      setGone(true);
    }

    if (!isIOS) {
      // pick up an event that fired before React was ready
      if (window.__yoInstallEvent) setDeferred(window.__yoInstallEvent);
      window.addEventListener("beforeinstallprompt", onPrompt);
    }
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [gone]);

  // installs through Chrome's own UI flip display-mode — react instantly
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = (e) => {
      if (e.matches) {
        try {
          localStorage.setItem("yo-install-done", "1");
        } catch {}
        setGone(true);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function dismiss() {
    setGone(true); // this mount only — back on every refresh until installed
  }

  async function install() {
    // real install: the captured event (component state or the global
    // early-capture in main.jsx). No event + iOS → reveal the Share guide.
    const evt = deferred || window.__yoInstallEvent || null;
    if (!evt) {
      setShowHint(true); // iOS — no prompt API exists; guide is the only path
      return;
    }

    evt.prompt();
    try {
      const choice = await evt.userChoice;
      if (choice?.outcome === "accepted") {
        try {
          localStorage.setItem("yo-install-done", "1"); // permanent — installed
        } catch {}
        setGone(true);
      }
    } catch {}
  }

  if (gone) return null;

  /* ── MOBILE — centered premium dialog over a blurred page ── */
  if (variant === "floating") {
    return (
      <div className="sm:hidden fixed inset-0 z-[90] flex items-center justify-center p-4">
        {/* backdrop — the page recedes: dimmed + heavily blurred */}
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/70"
          style={{
            WebkitBackdropFilter: "blur(20px) saturate(0.8)",
            backdropFilter: "blur(20px) saturate(0.8)",
          }}
        />

        {/* the card — sharp glass, centered, NOMI-scale */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-[min(86vw,340px)] rounded-[26px] border border-white/[0.08] bg-[#141416]/90 px-6 pt-8 pb-6 text-center shadow-[0_28px_70px_-24px_rgba(0,0,0,0.85)]"
          style={{
            WebkitBackdropFilter: "blur(28px)",
            backdropFilter: "blur(28px)",
          }}
        >
          {/* dismiss — subtle, comfortable target */}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X size={14} />
          </button>

          {/* YO mark — the existing geometry, in a tile like the reference */}
          <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border border-white/[0.06] bg-white/[0.04]">
            <LogoFlat size={38} />
          </div>

          <h3 className="mt-5 text-[19px] font-semibold text-white">
            Install YO
          </h3>
          <p className="mt-2.5 text-[13px] leading-relaxed text-gray-500">
            Bring YO closer to you — a focused space to learn, build, and think.
            One tap gives you the full experience
          </p>

          {/* primary CTA */}
          <button
            onClick={install}
            className="mt-6 w-full h-12 rounded-full bg-white text-black text-[14.5px] font-medium hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Install
          </button>

          {/* secondary */}
          <button
            onClick={dismiss}
            className="mt-3.5 text-[13px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Not now
          </button>

          {/* iOS only — revealed on tap, never part of the subtitle */}
          {showHint && (
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[11.5px] leading-snug text-gray-400">
              In Safari: tap <span className="text-gray-200">Share</span>, then
              choose <span className="text-gray-200">Add to Home Screen</span>.
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  /* ── DESKTOP — card inside the sidebar (unchanged) ── */
  return (
    <div className="hidden sm:block px-4 pb-2 shrink-0">
      <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          title="Dismiss"
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={12} />
        </button>

        <p className="text-[13px] font-medium text-white pr-6">Install yo</p>
        <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
          A faster, simpler way to use YO — one tap from your desktop.
        </p>

        <button
          onClick={install}
          disabled={!deferred}
          title={!deferred ? "Install becomes available shortly after the page loads" : undefined}
          className="mt-2.5 w-full h-8 rounded-xl bg-white text-black text-[12px] font-medium hover:opacity-85 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          <Download size={12} /> Install
        </button>
      </div>
    </div>
  );
}
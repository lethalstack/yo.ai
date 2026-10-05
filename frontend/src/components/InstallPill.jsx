import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Download, X } from "lucide-react";

/* Install prompt — desktop: card in the sidebar (variant="card").
   Mobile: centered glass prompt over a blurred/dimmed page (variant="floating").
   Hidden once actually installed; X dismisses for the current page view only. */
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

  // if the app gets installed through Chrome's own UI (no event reaches us),
  // the display-mode flips to standalone — react to that instantly
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
    // real install: use the captured event (component state, or the global
    // early-capture in main.jsx). No event → no fake success.
    const evt = deferred || window.__yoInstallEvent || null;
    if (!evt) return;

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

  /* ── MOBILE — centered glass prompt over a blurred page ── */
  if (variant === "floating") {
    return (
      <div className="sm:hidden fixed inset-0 z-[90] flex items-center justify-center p-4">
        {/* backdrop — dims + blurs the page behind, never the card */}
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/60"
          style={{
            WebkitBackdropFilter: "blur(14px) saturate(0.85)",
            backdropFilter: "blur(14px) saturate(0.85)",
          }}
        />

        {/* the card — sharp glass, centered */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-[300px] max-w-[calc(100vw-32px)] rounded-[24px] border border-white/[0.10] bg-[#141416]/90 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] overflow-hidden"
          style={{
            WebkitBackdropFilter: "blur(24px)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* dismiss — secondary, comfortable touch target */}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X size={14} />
          </button>

          {/* install action — the whole body is the real button */}
          <button
            onClick={install}
            className="w-full flex flex-col items-center px-6 pt-8 pb-7 text-center active:scale-[0.98] transition-transform"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.06]">
              <Download size={22} className="text-gray-100" />
            </span>
            <span className="mt-4 text-[16px] font-medium text-white">
              Install YO
            </span>
            <span className="mt-2 text-[12.5px] leading-relaxed text-gray-500">
              Use yo like a real app — just one tap away
            </span>

            {/* iOS only — revealed on tap; never part of the subtitle */}
            {showHint && (
              <span className="mt-4 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[11.5px] leading-snug text-gray-400">
                In Safari: tap <span className="text-gray-200">Share</span>, then
                choose <span className="text-gray-200">Add to Home Screen</span>.
              </span>
            )}
          </button>
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
          Use yo like a real app — one tap from your desktop.
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
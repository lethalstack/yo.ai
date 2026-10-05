import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, X } from "lucide-react";

/* Install prompt — desktop: card in the sidebar (variant="card").
   Mobile: floating toast on screen (variant="floating").
   Only renders when the browser can install; dismissal is remembered. */
export default function InstallPill({ variant = "card" }) {
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
      // Pick up the install event if it fired before React mounted.
      if (window.__yoInstallEvent) {
        setDeferred(window.__yoInstallEvent);
      }
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
    // one-tap: prompt immediately if we have the event;
    // otherwise pick up a late-arriving one and prompt in the same tap
    const evt = deferred || window.__yoInstallEvent || null;
    if (evt) {
      evt.prompt();
      const choice = await evt.userChoice;
      if (choice?.outcome === "accepted") {
        try {
          localStorage.setItem("yo-install-done", "1"); // permanent — installed
        } catch {}
        setGone(true);
      }
    }
  }

  if (gone) return null;

  /* ── MOBILE — premium floating install prompt ── */
  if (variant === "floating") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="sm:hidden fixed right-3 bottom-[88px] z-40 w-[min(86vw,300px)] flex flex-col items-end gap-2"
      >
        {showHint && (
          <div className="w-full rounded-xl border border-white/[0.10] bg-neutral-900/95 backdrop-blur-xl px-3.5 py-2.5 text-[11.5px] leading-snug text-gray-400 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.7)]">
            In Safari: tap <span className="text-gray-200">Share</span>, then
            choose <span className="text-gray-200">Add to Home Screen</span>.
          </div>
        )}

        <div className="relative w-full rounded-[20px] border border-white/[0.08] bg-[#111113] shadow-[0_18px_44px_-16px_rgba(0,0,0,0.75)] overflow-hidden">
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute top-2.5 right-2.5 z-10 w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X size={13} />
          </button>

          <button
            onClick={install}
            className="w-full flex flex-col items-center px-5 pt-6 pb-5 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05]">
              <Download size={20} className="text-white" />
            </span>
            <span className="mt-3 text-[15px] font-medium text-white">Install YO</span>
          </button>
        </div>
      </motion.div>
    );
  }

  /* ── DESKTOP — card inside the sidebar ── */
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
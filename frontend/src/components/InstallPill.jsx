import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

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

    if (!isIOS) window.addEventListener("beforeinstallprompt", onPrompt);
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
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice?.outcome === "accepted") {
        try {
          localStorage.setItem("yo-install-done", "1"); // permanent — installed
        } catch {}
        setGone(true);
      }
    }
  }

  if (gone) return null;

  /* ── MOBILE — floating toast, on screen, above the composer ── */
  if (variant === "floating") {
    return (
      <div className="sm:hidden fixed right-3 bottom-[84px] z-40 flex flex-col items-end gap-1.5">
        {showHint && (
          <div className="max-w-[240px] rounded-xl border border-white/[0.12] bg-neutral-900/95 backdrop-blur-xl px-3 py-2 text-[11px] leading-snug text-gray-400 shadow-2xl shadow-black/50">
            In Safari: tap <span className="text-gray-200">Share</span> ↓ , then
            choose <span className="text-gray-200">Add to Home Screen</span>.
          </div>
        )}
        <div className="flex items-center gap-2 rounded-full border border-white/[0.12] bg-neutral-900/95 backdrop-blur-xl pl-3 pr-1.5 py-1.5 shadow-2xl shadow-black/50">
          <Download size={13} className="shrink-0 text-gray-400" />
          <button
            onClick={install}
            className="text-[12.5px] font-medium text-white whitespace-nowrap"
          >
            Install yo
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>
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
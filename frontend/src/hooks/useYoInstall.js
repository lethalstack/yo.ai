import { useEffect, useState } from "react";

/* Shared install flow — one source of truth for the beforeinstallprompt
   event (global early-capture in main.jsx), installed-state, and the
   prompt()/iOS-hint action. Used by the navbar Install button and the
   landing floating pill. */
export default function useYoInstall() {
  const [deferred, setDeferred] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [isIOS] = useState(() => /iphone|ipad|ipod/i.test(navigator.userAgent));
  const [gone, setGone] = useState(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    try {
      if (localStorage.getItem("yo-install-done") === "1") return true;
    } catch {}
    return false;
  });

  useEffect(() => {
    if (gone) return;
    if (window.__yoInstallEvent) setDeferred(window.__yoInstallEvent);
    function onPrompt(e) {
      e.preventDefault();
      setDeferred(e);
    }
    function onInstalled() {
      try {
        localStorage.setItem("yo-install-done", "1");
      } catch {}
      setGone(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [gone]);

  function install() {
    const evt = deferred || window.__yoInstallEvent || null;
    if (!evt) {
      if (isIOS) setShowHint(true); // iOS — guide is the only path
      return; // no event yet → honest no-op
    }
    evt.prompt();
    evt.userChoice
      .then((choice) => {
        if (choice?.outcome === "accepted") {
          try {
            localStorage.setItem("yo-install-done", "1"); // permanent
            sessionStorage.removeItem("yo-install-dismissed");
          } catch {}
          setGone(true);
        }
      })
      .catch(() => {});
  }

  // dismiss = page-view only hide, shared by every install surface
  function dismiss() {
    setGone(true);
  }

  return { deferred, isIOS, showHint, gone, install, dismiss };
}

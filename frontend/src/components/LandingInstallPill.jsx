import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import useYoInstall from "../hooks/useYoInstall";

/* Landing floating install prompt — the sidebar InstallPill's card design.
   Drag by the card body (desktop mouse). Install button and ✕ are isolated:
   they stop propagation, so touching them never drags or cross-triggers. */

const PILL_EDGE = 12;

export default function LandingInstallPill() {
  const { deferred, isIOS, showHint, gone, install, dismiss } = useYoInstall();
  const [isMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  const [passed, setPassed] = useState(false);
  const [pos, setPos] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false); // appear after the page has loaded
  const pillRef = useRef(null);
  const drag = useRef(null);
  const justDragged = useRef(false);

  // reveal gate — only after the Guest Chat section (#ask) has been
  // scrolled fully past, on both desktop and mobile. Latched.
  useEffect(() => {
    if (gone) return;
    const section = document.getElementById("ask");
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && entry.boundingClientRect.bottom < 0) {
          setPassed(true);
          observer.disconnect();
        }
      },
      { threshold: 0 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [isMobile, gone]);



  // desktop drag — mouse only, starts from the card body, 6px dead zone,
  // clamped to the viewport. Touch never drags (mobile just taps buttons).
  function onBodyPointerDown(e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const rect = pillRef.current.getBoundingClientRect();
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
      moved: false,
    };
    pillRef.current.setPointerCapture(e.pointerId);
    setDragging(true);
  }
  function onBodyPointerMove(e) {
    const s = drag.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.moved && Math.hypot(dx, dy) < 6) return; // dead zone — still a click
    s.moved = true;
    e.preventDefault();
    const w = pillRef.current.offsetWidth;
    const h = pillRef.current.offsetHeight;
    setPos({
      x: Math.min(Math.max(PILL_EDGE, s.origX + dx), window.innerWidth - w - PILL_EDGE),
      y: Math.min(Math.max(PILL_EDGE, s.origY + dy), window.innerHeight - h - PILL_EDGE),
    });
  }
  function onBodyPointerUp() {
    const s = drag.current;
    drag.current = null;
    setDragging(false);
    if (s && s.moved) justDragged.current = true;
  }
  function onBodyClick() {
    // a drag release also emits click — swallow it, don't install
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    // plain tap on the card body does nothing (only Install installs)
  }

  if (gone) return null;
  if (!passed) return null;

  return (
    <div
      ref={pillRef}
      className={`fixed z-40 select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={
        pos
          ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
          : { right: "1.25rem", bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }
      }
      onPointerDown={onBodyPointerDown}
      onPointerMove={onBodyPointerMove}
      onPointerUp={onBodyPointerUp}
      onPointerCancel={onBodyPointerUp}
      onClick={onBodyClick}
    >
      {/* iOS hint — same classes as the sidebar InstallPill's hint */}
      {showHint && isIOS && (
        <div className="mb-2 max-w-[240px] rounded-xl border border-white/[0.12] bg-neutral-900/95 backdrop-blur-xl px-3 py-2 text-[11px] leading-snug text-gray-400 shadow-2xl shadow-black/50">
          In Safari: tap <span className="text-gray-200">Share</span>, then choose{" "}
          <span className="text-gray-200">Add to Home Screen</span>.
        </div>
      )}

      {/* the sidebar InstallPill's card — title, subtitle, white Install CTA */}
      <div className="relative w-[280px] rounded-2xl border border-white/[0.08] bg-[#161616] p-4 shadow-2xl shadow-black/50">
        {/* ✕ — dismiss. Fully isolated: no drag, no install, no bubbling. */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismiss(); // page-view only — returns on refresh until installed
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Dismiss"
          className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={13} />
        </button>

        <p className="text-[14px] font-medium text-white pr-6">Install yo</p>
        <p className="mt-1 text-[12px] leading-snug text-gray-500 pr-4">
          A faster, simpler way to use YO — one tap from your desktop.
        </p>

        {/* Install — the ONLY trigger for the native prompt. Isolated. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // never counted as a body click
            install();
          }}
          onPointerDown={(e) => e.stopPropagation()} // never starts a drag
          onPointerUp={(e) => e.stopPropagation()}
          className="mt-3.5 w-full h-10 rounded-full bg-white text-black text-[13px] font-medium hover:opacity-85 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download size={14} />
          Install
        </button>
      </div>
    </div>
  );
}
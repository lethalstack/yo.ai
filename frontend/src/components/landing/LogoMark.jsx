"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * LogoMark: the YO brand mark.
 *
 * One flat vector silhouette: a solid dome head and five rounded extensions
 * (short, medium, longest, medium, short). Both eyes are real negative space (an SVG mask),
 * so they always reveal whatever surface the logo sits on. Monochrome through currentColor:
 * white on dark, black on light.
 *
 * ENTRANCE (plays once per mount, ~3.1s, every stage clearly readable):
 *   1. EYES      two eyes pop into existence in the logo colour (white on dark, black on light),
 *                scale up past 1 and settle. The body is invisible.
 *   2. BODY      a COMPLETE, solid circle (the head's own radius, centred on the face) pops up around the
 *                eyes with a clear scale-pop, then holds fully visible before anything else happens.
 *                The pop-eyes then dissolve into the true negative-space eyes.
 *   3. LIQUID    only now the circle's bottom leaks: slits open upward from its lower edge while five
 *                drips pour out of it, thin neck first, thickening, staggered, centre first.
 *                The drips grow out of the circle itself, they are not separate pieces appearing below.
 *   4. SETTLE    the circle + drips are swapped for the original geometry (identical silhouette),
 *                then idle behaviours start.
 *
 * IDLE (starts only after the entrance):
 *   - EXTENSIONS  five separate paths drift up and down with their own timing (pure CSS).
 *   - GAZE        a <g> inside the mask holding both eyes; it slides a few units toward the pointer.
 *   - BLINK       each eye's `ry` is animated for ~150ms about every 4s. Both eyes together.
 *
 *   <LogoMark size={48} />
 *   <LogoMark size={24} animated={false} />   // fully static, no entrance
 *   <LogoMark size={24} intro={false} />      // idle behaviours, but no entrance
 *   <LogoMark size={64} alive={false} />      // entrance + extensions drift; no tracking, no blink
 *   <LogoMark size={96} track="local" />      // eyes follow the pointer only while it is over the logo
 *
 * Legacy props (`interactive`, `flip`) are accepted and ignored.
 */

/* ------------------------------------------------------------------ */
/* 1. GEOMETRY (measured from the reference, 200 x 200 box)             */
/* ------------------------------------------------------------------ */

const VIEWBOX = "0 0 200 200";

const HEAD_L = 36; // head spans x = 36..164, top at y = 12
const HEAD_W = 128;
const HEAD_CY = 76; // centre of the dome (radius = HEAD_W / 2)

// five extensions, left to right: outer, inner, centre (longest), inner, outer
const WIDTHS = [18, 18, 19, 18, 18];
const GAP = 9.25; // slit between extensions
const BOTTOMS = [137, 168.5, 188, 168.5, 137]; // resting bottom edge of each extension

const NOTCH_TOP = 105.5; // top of each slit (rounded cap)
const BODY_BOTTOM = 124; // the head block ends here, as short stubs
const EXT_TOP = 116; // extensions start inside the stubs, so they can slide without ever showing a seam

const EYE_Y = 74;
const EYE_DX = 28.4; // eye centres sit at x = 100 -/+ EYE_DX
const EYE_R = 10;
const FACE_Y = 74; // y used as the "face centre" for pointer direction

// x ranges of each extension
const EXTS = (() => {
  const out = [];
  let x = HEAD_L;
  for (const w of WIDTHS) {
    out.push([x, x + w]);
    x += w + GAP;
  }
  return out;
})();

// head block with the four slits cut into it (traced right to left)
const BODY_D = (() => {
  const r = GAP / 2;
  const capY = NOTCH_TOP + r;
  const right = HEAD_L + HEAD_W;
  let d = `M${HEAD_L} ${HEAD_CY}A${HEAD_W / 2} ${HEAD_W / 2} 0 0 1 ${right} ${HEAD_CY}V${BODY_BOTTOM}`;
  for (let i = EXTS.length - 1; i >= 0; i--) {
    const x0 = EXTS[i][0];
    d += `H${x0}`;
    if (i > 0) d += `V${capY}A${r} ${r} 0 0 0 ${x0 - GAP} ${capY}V${BODY_BOTTOM}`;
  }
  return d + "Z";
})();

// one extension: straight sides, fully rounded bottom
const extPath = ([x0, x1], bottom) => {
  const r = (x1 - x0) / 2;
  return `M${x0} ${EXT_TOP}V${bottom - r}A${r} ${r} 0 0 0 ${x1} ${bottom - r}V${EXT_TOP}Z`;
};
const EXT_PATHS = EXTS.map((e, i) => extPath(e, BOTTOMS[i]));

/* ------------------------------------------------------------------ */
/* 2. TUNING                                                            */
/* ------------------------------------------------------------------ */

// extensions: amplitude in viewBox units (about 2-3px at 100px), cycle seconds, phase seconds.
// Different values per extension, left and right deliberately unequal, so it never looks mirrored.
const EXT_AMP = [4, 5, 6, 5, 4];
const EXT_CYCLE = [3.1, 3.7, 3.4, 3.9, 2.8];
const EXT_PHASE = [-0.4, -1.9, -1.1, -0.2, -2.3];
// the largest amplitude must stay below EXT_TOP - NOTCH_TOP so an extension can never leave its stub

// eyes
const GAZE_MAX = 3.5; // units: about 1.75px at a 100px logo, scales with size
const OMEGA = 14; // spring speed (rad/s). Critically damped: settles fast, never bounces
const BLINK_EVERY_MS = 4000; // one blink about every 4 seconds
const BLINK_JITTER_MS = 250; // +/- so it never feels mechanical
const BLINK_DUR_MIN = 130;
const BLINK_DUR_MAX = 170;
const DRIFT_WAIT_MS = 2000; // after the entrance ends, the extensions stay still this long before they start to drift
const BLINK_CLOSED = 0.08; // eye height factor at the deepest point of a blink

// entrance timeline, milliseconds from mount (slow, calm: total about 3.1s)
const T_EYES_START = 150; // 1. eyes pop
const T_EYES_DUR = 600;
const T_HEAD_START = 900; // 2. the whole dome pops in around the eyes
const T_HEAD_DUR = 650;
const T_DISSOLVE_START = 1100; //    pop-eyes dissolve into the cut-out eyes
const T_DISSOLVE_DUR = 400;
const T_DRIP_START = 1800; // 3. liquid leaks downward, only after the circle has been fully visible for ~250ms
const DRIP_DELAY = [260, 120, 0, 160, 300]; // staggered: centre first, then inwards-out, left/right unequal
const DRIP_DUR = [1000, 1100, 1200, 1100, 1000]; // longer travel takes a little longer

const EYE_RING = 3.5; // while the head forms, the cut-out is this much larger than the final eye
const CIRCLE_R = HEAD_W / 2; // the entrance circle has exactly the head's radius and centre
const CIRCLE_FROM = 0.3; // the circle pops up from this scale to 1 (with a soft overshoot)
const DRIP_TOP = HEAD_CY; // drip paths start at the circle's equator, so they read as part of the body
const SLIT_START_Y = 142; // slits begin just below the circle's bottom (y = 140) and open upward
const SLIT_DUR = 1000;
const SLIT_DELAY = EXTS.slice(1).map((_, j) => (DRIP_DELAY[j] + DRIP_DELAY[j + 1]) / 2);
// where each drip starts: the circle's bottom edge at that extension's centre line
const EXT_START_Y = EXTS.map(([a, b]) => HEAD_CY + Math.sqrt(CIRCLE_R * CIRCLE_R - Math.pow((a + b) / 2 - 100, 2)));

const T_END = Math.max(...DRIP_DELAY.map((d, i) => d + DRIP_DUR[i]), ...SLIT_DELAY.map((d) => d + SLIT_DUR)) + T_DRIP_START + 40;

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t, c1 = 1.9) => {
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// liquid length curve: slow gather, accelerating pull, then a tiny viscous overshoot that settles to exactly 1
const dripLength = (p) => easeInOutCubic(p) + 0.03 * Math.sin(Math.PI * clamp01((p - 0.55) / 0.45));

// one extension while it drips: starts as a narrow neck (k < 1), thickens to full width (k = 1)
const dripPath = ([x0, x1], bottom, k) => {
  const cx = (x0 + x1) / 2;
  const hw = ((x1 - x0) / 2) * k;
  return `M${(cx - hw).toFixed(3)} ${DRIP_TOP}V${(bottom - hw).toFixed(3)}A${hw.toFixed(3)} ${hw.toFixed(3)} 0 0 0 ${(cx + hw).toFixed(3)} ${(bottom - hw).toFixed(3)}V${DRIP_TOP}Z`;
};

/* ------------------------------------------------------------------ */
/* 3. SHARED POINTER (one global listener for any number of logos)      */
/* ------------------------------------------------------------------ */

const pointerBus = {
  subs: new Set(),
  last: null,
  onMove(e) {
    if (e.pointerType === "touch") return;
    pointerBus.last = { x: e.clientX, y: e.clientY };
    pointerBus.subs.forEach((fn) => fn(pointerBus.last));
  },
  onLeave() {
    pointerBus.last = null;
    pointerBus.subs.forEach((fn) => fn(null));
  },
};

// fn(point | null): point = last pointer position, null = pointer left the page. Returns unsubscribe.
function subscribePointer(fn) {
  if (!pointerBus.subs.size) {
    window.addEventListener("pointermove", pointerBus.onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", pointerBus.onLeave);
  }
  pointerBus.subs.add(fn);
  if (pointerBus.last) fn(pointerBus.last);
  return () => {
    pointerBus.subs.delete(fn);
    if (!pointerBus.subs.size) {
      window.removeEventListener("pointermove", pointerBus.onMove);
      document.documentElement.removeEventListener("mouseleave", pointerBus.onLeave);
      pointerBus.last = null;
    }
  };
}

/* ------------------------------------------------------------------ */
/* 4. STYLES (theme + extension motion)                                 */
/* ------------------------------------------------------------------ */

const CSS = `
.yo-logo{color:#000;overflow:visible;-webkit-tap-highlight-color:transparent}
.yo-logo[data-yo-theme="dark"]{color:#fff}
@media (prefers-color-scheme:dark){.yo-logo[data-yo-theme="auto"]{color:#fff}}
:root[data-theme="dark"] .yo-logo[data-yo-theme="auto"],.dark .yo-logo[data-yo-theme="auto"]{color:#fff}
:root[data-theme="light"] .yo-logo[data-yo-theme="auto"],.light .yo-logo[data-yo-theme="auto"]{color:#000}
@keyframes yo-drift{0%,100%{transform:translateY(0)}25%{transform:translateY(calc(var(--yo-a) * -1))}75%{transform:translateY(var(--yo-a))}}
.yo-live .yo-ext{animation:yo-drift var(--yo-d) ease-in-out infinite;will-change:transform}
@media (prefers-reduced-motion:reduce){.yo-live .yo-ext{animation:none;will-change:auto}}
`;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ */
/* 5. COMPONENT                                                         */
/* ------------------------------------------------------------------ */

const EYE_L_X = 100 - EYE_DX;
const EYE_R_X = 100 + EYE_DX;
const popTransform = (cx, k) =>
  `translate(${cx} ${EYE_Y}) scale(${Math.max(k, 0.0001).toFixed(4)}) translate(${-cx} ${-EYE_Y})`;
const circleTransform = (s) =>
  `translate(100 ${HEAD_CY}) scale(${Math.max(s, 0.0001).toFixed(4)}) translate(-100 ${-HEAD_CY})`;

/**
 * Props
 *  size      square size in px (or any CSS length), default 48
 *  animated  false = fully static mark (no entrance, no motion)
 *  intro     false = skip the entrance (idle behaviours still run). Default true: plays once per mount
 *  alive     false = no eye tracking, no blinking
 *  track     "window" (default): eyes follow the pointer anywhere on the page, via one shared listener.
 *            "local": eyes follow the pointer only while it is over the logo.
 *  theme     "auto" | "light" | "dark"  ("auto" follows prefers-color-scheme, [data-theme], .dark/.light)
 *  color     optional explicit colour, overrides the theme
 *  title     accessible label ("" = decorative)
 */
export default function LogoMark({
  size = 48,
  animated = true,
  intro = true,
  alive = true,
  track = "window",
  theme = "auto",
  color,
  title = "YO",
  className,
  style,
  interactive, // eslint-disable-line no-unused-vars -- legacy prop, ignored
  flip, // eslint-disable-line no-unused-vars -- legacy prop, ignored
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const maskId = `yo-eyes-${uid}`;
  const slitMaskId = `yo-sl-${uid}`;
  const reduced = usePrefersReducedMotion();
  const motion = animated && !reduced;

  // the entrance is decided once, at mount: re-renders, theme or size changes never replay it
  const introPlanned = useRef(animated && intro).current;
  const [ready, setReady] = useState(!introPlanned);
  const introDone = useRef(!introPlanned);
  const [drifting, setDrifting] = useState(false);

  const svgRef = useRef(null);
  const gazeRef = useRef(null);
  const eyeLRef = useRef(null);
  const eyeRRef = useRef(null);
  const bodyGRef = useRef(null); // final head silhouette (hidden during the entrance)
  const circGRef = useRef(null); // entrance circle layer
  const circleRef = useRef(null);
  const slitRefs = useRef([]);
  const extGroupRef = useRef(null);
  const extRefs = useRef([]);
  const popGroupRef = useRef(null);
  const popLRef = useRef(null);
  const popRRef = useRef(null);

  /* ENTRANCE: one rAF loop, stateless (every frame is computed from elapsed time) */
  useEffect(() => {
    if (!introPlanned || introDone.current) return;
    const bodyG = bodyGRef.current;
    const circG = circGRef.current;
    const circle = circleRef.current;
    const slits = slitRefs.current.slice();
    const extG = extGroupRef.current;
    const exts = extRefs.current.slice(); // snapshot: React nulls the live array on unmount, before effect cleanup runs
    const popG = popGroupRef.current;
    const popL = popLRef.current;
    const popR = popRRef.current;
    const holes = [eyeLRef.current, eyeRRef.current];
    if (!bodyG || !circG || !circle || !extG || !popG || !popL || !popR || !holes[0] || !holes[1]) return;
    if (exts.length !== EXT_PATHS.length || !exts.every(Boolean)) return;
    if (slits.length !== EXTS.length - 1 || !slits.every(Boolean)) return;

    const finalize = () => {
      circG.setAttribute("display", "none");
      bodyG.removeAttribute("display");
      extG.removeAttribute("mask");
      extG.removeAttribute("visibility");
      exts.forEach((el, i) => {
        el.removeAttribute("visibility");
        el.setAttribute("d", EXT_PATHS[i]);
      });
      popG.setAttribute("display", "none");
      holes.forEach((h) => {
        h.setAttribute("rx", String(EYE_R));
        h.setAttribute("ry", String(EYE_R));
      });
      introDone.current = true;
      setReady(true);
    };

    // reduced motion: no entrance, show the final logo at once
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finalize();
      return;
    }

    let raf = 0;
    let t0 = 0;
    const frame = (now) => {
      if (!t0) t0 = now;
      const t = now - t0;
      if (t >= T_END) {
        finalize();
        return;
      }

      // 1. eyes pop (scale 0 -> overshoot -> 1), then 2b. dissolve into the cut-out eyes
      const pe = clamp01((t - T_EYES_START) / T_EYES_DUR);
      const pop = pe <= 0 ? 0 : easeOutBack(pe);
      const pd = easeInOutCubic(clamp01((t - T_DISSOLVE_START) / T_DISSOLVE_DUR));
      const k = pop * (1 - pd);
      popL.setAttribute("transform", popTransform(EYE_L_X, k));
      popR.setAttribute("transform", popTransform(EYE_R_X, k));
      const hole = EYE_R + EYE_RING * (1 - pd);
      holes.forEach((h) => {
        h.setAttribute("rx", hole.toFixed(3));
        h.setAttribute("ry", hole.toFixed(3));
      });

      // 2. body: a complete circle pops up around the eyes (scale pop with soft overshoot, quick fade-in)
      const ph = clamp01((t - T_HEAD_START) / T_HEAD_DUR);
      const cs = ph <= 0 ? CIRCLE_FROM : CIRCLE_FROM + (1 - CIRCLE_FROM) * easeOutBack(ph, 1.7);
      circle.setAttribute("opacity", ph <= 0 ? "0" : clamp01(ph / 0.3).toFixed(3));
      circle.setAttribute("transform", circleTransform(cs));

      // 3a. the circle's bottom leaks: slits open upward from its lower edge
      for (let j = 0; j < slits.length; j++) {
        const q = clamp01((t - T_DRIP_START - SLIT_DELAY[j]) / SLIT_DUR);
        const top = SLIT_START_Y + (NOTCH_TOP - SLIT_START_Y) * easeInOutCubic(q);
        slits[j].setAttribute("y", top.toFixed(3));
        slits[j].setAttribute("height", (200 - top + 10).toFixed(3));
      }

      // 3b. liquid: each drip pours out of the circle's bottom, staggered
      for (let i = 0; i < exts.length; i++) {
        const p = clamp01((t - T_DRIP_START - DRIP_DELAY[i]) / DRIP_DUR[i]);
        const el = exts[i];
        if (p <= 0) {
          el.setAttribute("visibility", "hidden");
          continue;
        }
        const bottom = EXT_START_Y[i] + (BOTTOMS[i] - EXT_START_Y[i]) * dripLength(p);
        const width = 0.84 + 0.16 * smooth(clamp01(p / 0.8));
        el.setAttribute("visibility", "visible");
        el.setAttribute("d", dripPath(EXTS[i], bottom, width));
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [introPlanned]);

  /* idle drift of the extensions: starts DRIFT_WAIT_MS after the entrance has finished */
  useEffect(() => {
    if (!motion || !ready) return;
    const id = window.setTimeout(() => setDrifting(true), introPlanned ? DRIFT_WAIT_MS : 0);
    return () => clearTimeout(id);
  }, [motion, ready, introPlanned]);

  /* keep the shared pointer position fresh during the entrance, so the eyes know where to look the moment it ends */
  useEffect(() => {
    if (!motion || !alive || track !== "window" || ready) return;
    return subscribePointer(() => {});
  }, [motion, alive, track, ready]);

  /* eye tracking + blinking: starts only after the entrance. One rAF loop that sleeps whenever nothing is moving */
  useEffect(() => {
    if (!motion || !alive || !ready) return;
    const svg = svgRef.current;
    const gaze = gazeRef.current;
    const eyes = [eyeLRef.current, eyeRRef.current];
    if (!svg || !gaze || !eyes[0] || !eyes[1]) return;

    const windowMode = track === "window";
    const pos = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };
    const goal = { x: 0, y: 0 };
    let ry = EYE_R;
    let blinkStart = -1;
    let blinkDur = 150;
    let raf = 0;
    let last = 0;
    let blinkTimer = 0;

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let busy = false;

      // critically damped spring toward the goal: no overshoot, no visible bounce
      for (const k of ["x", "y"]) {
        const e = pos[k] - goal[k];
        vel[k] += (-OMEGA * OMEGA * e - 2 * OMEGA * vel[k]) * dt;
        pos[k] += vel[k] * dt;
        if (Math.abs(pos[k] - goal[k]) > 0.002 || Math.abs(vel[k]) > 0.002) busy = true;
        else {
          pos[k] = goal[k];
          vel[k] = 0;
        }
      }
      gaze.setAttribute("transform", `translate(${pos.x.toFixed(3)} ${pos.y.toFixed(3)})`);

      // blink: quick close, slightly slower open. Only the eyes' height changes.
      let nextRy = EYE_R;
      if (blinkStart >= 0) {
        const u = (now - blinkStart) / blinkDur;
        if (u >= 1) blinkStart = -1;
        else {
          const e = u < 0.4 ? smooth(u / 0.4) : 1 - smooth((u - 0.4) / 0.6);
          nextRy = EYE_R * (1 - (1 - BLINK_CLOSED) * e);
          busy = true;
        }
      }
      if (nextRy !== ry) {
        ry = nextRy;
        eyes[0].setAttribute("ry", ry.toFixed(3));
        eyes[1].setAttribute("ry", ry.toFixed(3));
      }

      raf = busy ? requestAnimationFrame(frame) : 0;
    };
    const kick = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const aim = (x, y) => {
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + (r.height * FACE_Y) / 200);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = windowMode ? Math.max(r.width * 2, 160) : r.width / 2;
      const m = Math.min(1, dist / reach);
      goal.x = (dx / dist) * m * GAZE_MAX;
      goal.y = (dy / dist) * m * GAZE_MAX;
      kick();
    };
    const rest = () => {
      goal.x = 0;
      goal.y = 0;
      kick();
    };
    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      aim(e.clientX, e.clientY);
    };

    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(
        () => {
          if (!document.hidden) {
            blinkStart = performance.now();
            blinkDur = BLINK_DUR_MIN + Math.random() * (BLINK_DUR_MAX - BLINK_DUR_MIN);
            kick();
          }
          scheduleBlink();
        },
        BLINK_EVERY_MS + (Math.random() * 2 - 1) * BLINK_JITTER_MS,
      );
    };

    // window mode shares ONE global listener between every logo on the page; local mode listens on the svg
    let unsubscribe = null;
    if (windowMode) {
      unsubscribe = subscribePointer((p) => (p ? aim(p.x, p.y) : rest()));
    } else {
      svg.addEventListener("pointermove", onMove, { passive: true });
      svg.addEventListener("pointerleave", rest);
    }
    scheduleBlink();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(blinkTimer);
      if (unsubscribe) unsubscribe();
      else {
        svg.removeEventListener("pointermove", onMove);
        svg.removeEventListener("pointerleave", rest);
      }
      gaze.removeAttribute("transform");
      eyes[0].setAttribute("ry", String(EYE_R));
      eyes[1].setAttribute("ry", String(EYE_R));
    };
  }, [motion, alive, track, ready]);

  const svgStyle = { display: "block", ...(color ? { color } : null), ...style };

  return (
    <svg
      ref={svgRef}
      viewBox={VIEWBOX}
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      data-yo-theme={theme}
      className={["yo-logo", className].filter(Boolean).join(" ")}
      style={svgStyle}
      {...rest}
    >
      <style>{CSS}</style>
      <defs>
        {/* eyes are cut out of the head only, so they reveal the real surface behind the logo */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <rect x="0" y="0" width="200" height="200" fill="#fff" />
          <g ref={gazeRef}>
            <ellipse ref={eyeLRef} cx={EYE_L_X} cy={EYE_Y} rx={EYE_R} ry={EYE_R} fill="#000" />
            <ellipse ref={eyeRRef} cx={EYE_R_X} cy={EYE_Y} rx={EYE_R} ry={EYE_R} fill="#000" />
          </g>
        </mask>
        {introPlanned && (
          /* entrance only: slits that open upward and carve the circle's bottom into the head's final notches */
          <mask id={slitMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
            <rect x="0" y="0" width="200" height="200" fill="#fff" />
            {EXTS.slice(1).map((_, j) => (
              <rect
                key={j}
                ref={(el) => {
                  slitRefs.current[j] = el;
                }}
                x={EXTS[j][1]}
                y={SLIT_START_Y}
                width={GAP}
                height={200 - SLIT_START_Y + 10}
                rx={GAP / 2}
                fill="#000"
              />
            ))}
          </mask>
        )}
      </defs>
      <g className={motion && ready && drifting ? "yo-live" : undefined}>
        {introPlanned && (
          /* entrance only: the complete circle body, with the eyes cut out and the slits opening in its bottom */
          <g ref={circGRef} mask={`url(#${slitMaskId})`}>
            <g mask={`url(#${maskId})`}>
              <circle ref={circleRef} cx="100" cy={HEAD_CY} r={CIRCLE_R} fill="currentColor" opacity="0" />
            </g>
          </g>
        )}
        {/* the real head silhouette: the final state (and the whole logo when there is no entrance) */}
        <g ref={bodyGRef} display={introPlanned ? "none" : undefined}>
          <path d={BODY_D} fill="currentColor" mask={`url(#${maskId})`} />
        </g>
        <g ref={extGroupRef} visibility={introPlanned ? "hidden" : undefined} mask={introPlanned ? `url(#${maskId})` : undefined}>
          {EXT_PATHS.map((d, i) => (
            <path
              key={i}
              ref={(el) => {
                extRefs.current[i] = el;
              }}
              className="yo-ext"
              d={d}
              fill="currentColor"
              style={{
                "--yo-a": `${EXT_AMP[i]}px`,
                "--yo-d": `${EXT_CYCLE[i]}s`,
                "--yo-p": `${EXT_PHASE[i]}s`,
              }}
            />
          ))}
        </g>
        {introPlanned && (
          /* entrance only: the pop-eyes, drawn in the logo colour (white on dark, black on light) */
          <g ref={popGroupRef}>
            <ellipse ref={popLRef} cx={EYE_L_X} cy={EYE_Y} rx={EYE_R} ry={EYE_R} fill="currentColor" transform={popTransform(EYE_L_X, 0)} />
            <ellipse ref={popRRef} cx={EYE_R_X} cy={EYE_Y} rx={EYE_R} ry={EYE_R} fill="currentColor" transform={popTransform(EYE_R_X, 0)} />
          </g>
        )}
      </g>
    </svg>
  );
}
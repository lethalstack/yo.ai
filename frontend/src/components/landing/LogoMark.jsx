import React, { useId, useRef, useState, useEffect } from "react";

/**
 * LogoMark — YO monogram, "light border" edition.
 * A solid black mark. Only its hairline border is ever lit — nothing else glows.
 * NO blur, NO SVG filters, NO halo anywhere in this file.
 *
 * Props
 *  size         CSS width (px number or any CSS length)
 *  animated     false = clean static logo
 *  speed        1 = default, 2 = twice as fast, 0.5 = half speed
 *  glow         0..2, brightness of the border light
 *  borderSpeed  speed of the travelling border light (1 = fast, 0.5 = default, 0.3 = very slow)
 *  interval     seconds of rest AFTER a light finishes its pass, before the next one (default 10)
 *  theme        "auto" | "light" | "dark"   ("light" = dark ink for light backgrounds)
 *  interactive  enables the hover / touch border light
 *  className, style
 *
 * ANIMATION
 *  Launch : hairline outline draws -> solid mark fades in piece by piece -> light sweep + edge glint
 *           (unchanged), then a very faint border settles in.
 *  Idle   : the border is barely visible; once in a while a thin light travels around it.
 *  Hover  : the border brightens only near your cursor and follows it smoothly,
 *           while one thin light travels along the outline from the side you entered.
 *           On leave the border fades back to its faint resting state.
 */

/* ---------------- GEOMETRY (3 exact pieces) ---------------- */
const PIECES = [
  "M340 263H428V402L507 484V263H604V710L428 530V600L604 832V983L362 662L340 636Z",
  "M641 263H760V353H727V718L760 678V822L641 973Z",
  "M781 263H901V636L781 795V648L816 602V353H781Z",
];
const ROUTE = PIECES.join("");
const VB = { x: 320, y: 243, w: 601, h: 760 };
const VIEWBOX = `${VB.x} ${VB.y} ${VB.w} ${VB.h}`;

/* ---------------- look ---------------- */
const DARK = { a: "#050506", b: "#000000", line: "#e6e6e6", hl: 0.10, rim: "#ffffff" };   // for dark backgrounds
const LIGHT = { a: "#0b0b0c", b: "#1b1b1e", line: "#3d3d42", hl: 0.3, rim: "#000000" };  // for light backgrounds

const T0 = 2.7;      // seconds until the launch sequence is finished
const REST = 0.16;   // resting border opacity (very faint)

export default function LogoMark({
  size = 320,
  animated = true,
  speed = 1,
  glow = 1,
  borderSpeed = 0.10,
  interval = 10,
  theme = "auto",
  interactive = true,
  className,
  style,
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const P = (n) => `${id}-${n}`;
  const s = Math.max(0.1, speed);
  const g = Math.min(2, Math.max(0, glow));
  const t = (x) => (x / s).toFixed(2) + "s";
  const bs = Math.max(0.1, borderSpeed);
  const tb = (x) => (x / (s * bs)).toFixed(2) + "s"; // border-light timing only
  const lightOp = Math.min(1, 0.6 + 0.4 * g);
  // idle border light: ONE light at a time. It finishes its full pass around the border,
  // then rests for `interval` seconds before the next one is released.
  const pass = (9 * 0.36) / (s * bs);                  // seconds one pass takes at borderSpeed
  const iv = Math.max(0, interval) / s;                // pause AFTER a pass completes
  const lights = 1;
  const cycle = pass + iv;
  const pc = (pass / cycle) * 100;                     // % of the cycle spent travelling
  const wScale = 0.85 + 0.15 * g;

  const hostRef = useRef(null);
  const gradRef = useRef(null);
  const spotRef = useRef(null);
  const born = useRef(0);
  const last = useRef(0);
  const raf = useRef(0);
  const cur = useRef({ x: VB.x + VB.w / 2, y: VB.y + VB.h / 2, l: 0 });
  const tgt = useRef({ x: VB.x + VB.w / 2, y: VB.y + VB.h / 2, l: 0 });
  const [hv, setHv] = useState({ n: 0, dir: 1 });

  useEffect(() => {
    born.current = Date.now();
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const canPlay = () => {
    if (!animated || !interactive) return false;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return true;
  };
  const launched = () => Date.now() - born.current >= (T0 * 1000) / s + 400;

  /* ---------- border light follows the cursor: smooth, inertial, runs only while needed ---------- */
  const apply = (c) => {
    const gr = gradRef.current;
    if (gr) {
      const x = c.x.toFixed(1), y = c.y.toFixed(1);
      gr.setAttribute("cx", x); gr.setAttribute("cy", y);
      gr.setAttribute("fx", x); gr.setAttribute("fy", y);
    }
    if (spotRef.current) spotRef.current.setAttribute("opacity", Math.min(1, c.l * lightOp).toFixed(3));
  };
  const tick = () => {
    const c = cur.current, q = tgt.current;
    c.x += (q.x - c.x) * 0.14;
    c.y += (q.y - c.y) * 0.14;
    c.l += (q.l - c.l) * (q.l > c.l ? 0.1 : 0.06);
    apply(c);
    const busy = Math.abs(q.x - c.x) > 0.3 || Math.abs(q.y - c.y) > 0.3 || Math.abs(q.l - c.l) > 0.003;
    raf.current = busy ? requestAnimationFrame(tick) : 0;
    if (!busy) { c.l = q.l; apply(c); }
  };
  const run = () => { if (!raf.current) raf.current = requestAnimationFrame(tick); };

  const aim = (e) => {
    const r = hostRef.current.getBoundingClientRect();
    if (!r.width || !r.height) return;
    tgt.current.x = VB.x + ((e.clientX - r.left) / r.width) * VB.w;
    tgt.current.y = VB.y + ((e.clientY - r.top) / r.height) * VB.h;
  };

  const enter = (e) => {
    if (!canPlay() || !launched()) return;
    aim(e);
    tgt.current.l = 1;
    run();
    const now = Date.now();
    if (now - last.current < 2200 / (s * bs)) return;      // let the current light finish
    last.current = now;
    const r = hostRef.current.getBoundingClientRect();
    setHv((h) => ({ n: h.n + 1, dir: e.clientX < r.left + r.width / 2 ? 1 : -1 }));
  };
  const move = (e) => {
    if (!canPlay() || !launched()) return;
    aim(e);
    tgt.current.l = 1;
    run();
  };
  const leave = () => {
    tgt.current.l = 0;
    run();
  };

  /* ---------- THEME ---------- */
  const forced = theme === "light" || theme === "dark" ? theme : null;
  const pick = forced === "light" ? LIGHT : forced === "dark" ? DARK : null;
  const themeVars = pick
    ? { "--lm-a": pick.a, "--lm-b": pick.b, "--lm-line": pick.line, "--lm-hl": pick.hl, "--lm-rim": pick.rim }
    : undefined;
  const themeCss = `
.lgm{--lm-a:${DARK.a};--lm-b:${DARK.b};--lm-line:${DARK.line};--lm-hl:${DARK.hl};--lm-rim:${DARK.rim}}
.light .lgm,.theme-light .lgm,[data-theme="light"] .lgm,[data-color-scheme="light"] .lgm{--lm-a:${LIGHT.a};--lm-b:${LIGHT.b};--lm-line:${LIGHT.line};--lm-hl:${LIGHT.hl};--lm-rim:${LIGHT.rim}}
`;

  const css = `
  .${P("fi")}{animation:${P("kfi")} ${t(1.2)} cubic-bezier(.22,.7,.2,1) var(--d) both}
  .${P("ol")}{opacity:0;animation:${P("kol")} ${t(3.2)} cubic-bezier(.6,0,.2,1) var(--d) both}
  .${P("gl")}{opacity:0;animation:${P("kgl")} ${cycle.toFixed(2)}s cubic-bezier(.45,0,.25,1) ${t(T0 + 2)} infinite both}
  .${P("hi")}{animation:${P("khi")} ${t(1.6)} cubic-bezier(.3,.6,.2,1) ${t(2.1)} both}
  @keyframes ${P("kfi")}{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  @keyframes ${P("khi")}{from{opacity:0}to{opacity:1}}
  @keyframes ${P("kol")}{0%{stroke-dashoffset:1;opacity:1}55%{stroke-dashoffset:0;opacity:1}80%{opacity:1}100%{stroke-dashoffset:0;opacity:0}}
  @keyframes ${P("ksw")}{0%{transform:translateX(230px);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateX(1020px);opacity:0}}
  @keyframes ${P("kgl")}{0%{stroke-dashoffset:var(--f);opacity:0}${(pc * 0.08).toFixed(2)}%{opacity:1}${(pc * 0.88).toFixed(2)}%{opacity:1}${pc >= 99.9 ? "100%{stroke-dashoffset:-1;opacity:0}" : pc.toFixed(2) + "%{stroke-dashoffset:-1;opacity:0}100%{stroke-dashoffset:-1;opacity:0}"}}
  @keyframes ${P("khf")}{0%{stroke-dashoffset:var(--f);opacity:0}8%{opacity:1}88%{opacity:1}100%{stroke-dashoffset:-1;opacity:0}}
  @keyframes ${P("khb")}{0%{stroke-dashoffset:-1;opacity:0}8%{opacity:1}88%{opacity:1}100%{stroke-dashoffset:var(--f);opacity:0}}
  @media (prefers-reduced-motion:reduce){
    [class*="${id}-"]{animation:none!important}
    .${P("ol")},.${P("gl")}{opacity:0}
  }`;

  // skewed light band: translate(201) cancels the skew offset at the logo's mid height
  const band = () => `translate(201 0) skewX(-18)`;

  // a thin light that travels along the border: bright head + soft tail
  const beam = [
    { len: 0.1, w: 2.4, o: 1 },
    { len: 0.26, w: 2.4, o: 0.28 },
  ];

  return (
    <div
      ref={hostRef}
      style={{ display: "block", width: size, maxWidth: "100%", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      onPointerEnter={enter}
      onPointerDown={enter}
      onPointerMove={move}
      onPointerLeave={leave}
      onPointerCancel={leave}
    >
      <svg
        className={["lgm", className].filter(Boolean).join(" ")}
        viewBox={VIEWBOX}
        width="100%"
        role="img"
        aria-label="Logo"
        style={{
          ...themeVars,
          display: "block",
          height: "auto",
          overflow: "visible",
          background: "none",
          maxWidth: "100%",
          shapeRendering: "geometricPrecision",
          ...style,
        }}
      >
        <style>{themeCss}</style>
        {animated && <style>{css}</style>}

        <defs>
          {PIECES.map((d, i) => <path key={i} id={P("p" + i)} d={d} />)}
          <linearGradient id={P("g")} gradientUnits="userSpaceOnUse" x1="340" y1="263" x2="820" y2="990">
            <stop offset="0" style={{ stopColor: "var(--lm-a)" }} />
            <stop offset="1" style={{ stopColor: "var(--lm-b)" }} />
          </linearGradient>
          <linearGradient id={P("sp")} x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".38" stopColor="#fff" stopOpacity=".25" />
            <stop offset=".5" stopColor="#fff" />
            <stop offset=".62" stopColor="#fff" stopOpacity=".25" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          {/* the pool of light that follows the cursor — it only ever paints the border */}
          <radialGradient ref={gradRef} id={P("rg")} gradientUnits="userSpaceOnUse" cx="620" cy="620" fx="620" fy="620" r="330">
            <stop offset="0" style={{ stopColor: "var(--lm-rim)" }} stopOpacity="1" />
            <stop offset=".35" style={{ stopColor: "var(--lm-rim)" }} stopOpacity=".55" />
            <stop offset=".7" style={{ stopColor: "var(--lm-rim)" }} stopOpacity=".1" />
            <stop offset="1" style={{ stopColor: "var(--lm-rim)" }} stopOpacity="0" />
          </radialGradient>
          <clipPath id={P("clip")}>
            {PIECES.map((_, i) => <use key={i} href={"#" + P("p" + i)} />)}
          </clipPath>
        </defs>

        {/* hairline outline that draws first, then fades as the solid appears */}
        {animated && (
          <g fill="none" style={{ stroke: "var(--lm-line)" }} strokeWidth="2.2" strokeLinejoin="miter" pointerEvents="none">
            {PIECES.map((d, i) => (
              <path key={i} d={d} pathLength="1" strokeDasharray="1 2" className={P("ol")} style={{ "--d": t(0.3 + i * 0.16) }} />
            ))}
          </g>
        )}

        {/* solid mark */}
        <g>
          {PIECES.map((_, i) => (
            <use
              key={i}
              href={"#" + P("p" + i)}
              fill={`url(#${P("g")})`}
              className={animated ? P("fi") : undefined}
              style={animated ? { "--d": t(1.5 + i * 0.14) } : undefined}
            />
          ))}
        </g>

        {/* launch sweep (unchanged), clipped to the silhouette */}
        {animated && (
          <g clipPath={`url(#${P("clip")})`} pointerEvents="none">
            <g style={{ opacity: "var(--lm-hl)" }}>
              <g style={{ opacity: 0, animation: `${P("ksw")} ${t(1.8)} cubic-bezier(.45,0,.2,1) ${t(T0 - 0.2)} both` }}>
                <rect x="-45" y="-300" width="90" height="1900" transform={band()} fill={`url(#${P("sp")})`} opacity={lightOp} />
              </g>
            </g>
          </g>
        )}

        {/* THE BORDER — hairline, 1px at any size */}
        <g fill="none" strokeLinejoin="miter" pointerEvents="none">
          <g className={animated ? P("hi") : undefined} style={animated ? { opacity: 0 } : undefined}>
            {/* resting: barely there */}
            <path
              d={ROUTE}
              stroke="var(--lm-rim)"
              strokeOpacity={REST}
              strokeWidth="1.1"
              vectorEffect="non-scaling-stroke"
              style={{ stroke: "var(--lm-rim)" }}
            />
            {/* hover: bright only near the cursor */}
            {animated && interactive && (
              <path
                ref={spotRef}
                d={ROUTE}
                stroke={`url(#${P("rg")})`}
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
                opacity="0"
              />
            )}
          </g>
        </g>

        {/* travelling light along the border: rare at idle, once on every hover */}
        {animated && (
          <g fill="none" stroke="#fff" strokeLinejoin="miter" pointerEvents="none" opacity={lightOp}>
            {Array.from({ length: lights }, (_, n) =>
              beam.map((b, k) => (
                <path
                  key={`${n}-${k}`}
                  d={ROUTE}
                  pathLength="1"
                  strokeWidth={b.w * wScale}
                  strokeOpacity={b.o}
                  strokeDasharray={`${b.len} 3`}
                  className={P("gl")}
                  style={{ "--f": b.len, animationDelay: `${((T0 + 2) / s + n * iv).toFixed(2)}s` }}
                />
              ))
            )}
            {hv.n > 0 && (
              <g key={hv.n}>
                {beam.map((b, k) => (
                  <path
                    key={k}
                    d={ROUTE}
                    pathLength="1"
                    strokeWidth={b.w * wScale}
                    strokeOpacity={b.o}
                    strokeDasharray={`${b.len} 3`}
                    style={{ "--f": b.len, opacity: 0, animation: `${P(hv.dir > 0 ? "khf" : "khb")} ${tb(2.0)} cubic-bezier(.45,0,.25,1) both` }}
                  />
                ))}
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
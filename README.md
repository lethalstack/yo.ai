# yo

> Learn. Build. Level Up.

A Gen-Z AI learning companion landing page — built with React, Vite, Tailwind CSS, and Framer Motion.

## Design

Pure black background, white typography, premium minimal aesthetic inspired by Vercel / Linear / Raycast / Perplexity.

- **Logo:** Official `yo` wordmark PNG (transparent, white) — used in Hero, Navbar, and Footer
- **Typography:** Geist Sans + Geist Mono (Vercel's font family)
- **Background:** Pure black (#000) with subtle grid overlay
- **Animations:** Subtle mouse parallax on logo, glow pulse, orbit ring, smooth entrance
- **Reduced motion:** Respects `prefers-reduced-motion`

## Assets

- `public/logo.png` — Official yo logo (white on transparent, ~1127×414)
- `public/favicon.png` — Favicon generated from logo
- `public/favicon.svg` — Minimal SVG fallback

## Sections

1. **Navbar** — blur-on-scroll, mobile menu, premium CTA
2. **Hero** — `yo` logo with orbit ring + mouse-tracking glow, tagline, two CTAs
3. **Modes** — 4 premium product cards (Chill / Exam / Coding / Interview)
4. **Chat Preview** — minimal chat window with blinking cursor
5. **Features** — numbered list (Ask yo / Learn from notes / Flashcards / Quizzes)
6. **Footer** — final CTA + brand bar

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build

```bash
npm run build
npm run preview
```

## Tech

- React 19
- Vite
- Tailwind CSS v3
- Framer Motion
- @fontsource/geist-sans / geist-mono

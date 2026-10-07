import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/* PersonalityStreams — five slow right→left thought streams drifting
   through the empty upper zone of the mobile New Chat screen.
   Purely decorative: no container, no interaction, CSS-transform movement,
   phrases recycled from a shuffled 30-thought pool (no immediate repeats).
   Staggered delays keep 1–2 thoughts visible at a time, never all five. */

const PHRASES = [
  "yo wasssup",
  "stop thinking man, just hit it",
  "yo, you back?",
  "what are we cooking today?",
  "okay... let's see what you've got",
  "bro just ask",
  "nah, we can make that simpler",
  "wait... that's actually interesting",
  "you really wanna know?",
  "alright, I'm listening",
  "okay... we're going there",
  "don't overthink this",
  "lemme cook",
  "yeah, I got you",
  "one sec, hear me out",
  "you've got a weird one today",
  "okay, that's a good question",
  "we're not doing boring today",
  "go on",
  "alright, your turn",
  "let's figure this out",
  "take your time",
  "try me",
  "look closer",
  "there's another way",
  "go deeper",
  "what's on your mind?",
  "where do we start?",
  "okay... interesting",
  "now we're getting somewhere",
];

// shuffled-bag picker: every phrase appears once per 30 draws,
// never twice in a row, order randomized each cycle
function makePicker() {
  let bag = [];
  return () => {
    if (bag.length === 0) {
      bag = PHRASES.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return PHRASES[bag.pop()];
  };
}

// five rows, slightly different tempo — desynchronized rhythm
const ROWS = [
  { duration: 24, delay: -3 },
  { duration: 27, delay: -9 },
  { duration: 25, delay: -1 },
  { duration: 28, delay: -14 },
  { duration: 26, delay: -6 },
];

function StreamRow({ duration, delay, next, reduce }) {
  const [text, setText] = useState(() => next());

  return (
    <div className="relative h-5 flex items-center">
      {reduce ? (
        /* calm static version — no movement */
        <span className="text-[13px] font-light text-gray-500 whitespace-nowrap">
          {text}
        </span>
      ) : (
        <span
          className="yo-stream absolute left-full whitespace-nowrap text-[13px] font-light text-gray-500 will-change-transform"
          style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
          onAnimationIteration={() => setText(next())}
        >
          {text}
        </span>
      )}
    </div>
  );
}

export default function PersonalityStreams() {
  const reduce = useReducedMotion();
  const next = useRef(makePicker()).current;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-12 h-[38vh] sm:hidden overflow-hidden pointer-events-none select-none flex flex-col justify-evenly"
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0, #000 14%, #000 86%, transparent 100%)",
        maskImage:
          "linear-gradient(to right, transparent 0, #000 14%, #000 86%, transparent 100%)",
      }}
    >
      {ROWS.map((r, i) => (
        <StreamRow
          key={i}
          duration={r.duration}
          delay={r.delay}
          next={next}
          reduce={reduce}
        />
      ))}
    </div>
  );
}
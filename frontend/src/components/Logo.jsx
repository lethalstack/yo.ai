import { memo } from 'react';
import { motion, useMotionTemplate } from 'framer-motion';


function Logo({ className = '', lightX, lightY }) {
  const hasLighting = lightX != null && lightY != null;


  const highlightBg = useMotionTemplate`radial-gradient(
    circle 90px at ${lightX ?? '50%'} ${lightY ?? '50%'},
    rgba(255,255,255,0.55),
    rgba(255,255,255,0.06) 42%,
    transparent 68%
  )`;

  return (
    <span
      className={`relative inline-block select-none ${className}`}
      aria-label="yo"
      role="img"
    >
      {/* Base layer: the dim "body" of the physical object */}
      <span className={hasLighting ? 'text-white/25' : ''}>
        yo
      </span>

      {/* Highlight layer: moving light clipped to letter shapes */}
      {hasLighting && (
        <motion.span
          aria-hidden
          className="absolute inset-0 text-transparent"
          style={{
            background: highlightBg,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
          }}
        >
          yo
        </motion.span>
      )}
    </span>
  );
}

export default memo(Logo);

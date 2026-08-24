import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const ease = [0.16, 1, 0.3, 1];

const MotionLink = motion(Link);

const modes = [
  {
    slug: 'chill',
    emoji: '😎',
    title: 'Chill Mode',
    desc: 'No lectures. No boring explanations. Just a cool convo.',
  },
  {
    slug: 'exam',
    emoji: '📚',
    title: 'Exam Mode',
    desc: 'cut the fluff. what matters, what sticks, what\'s on the test.',
  },
  {
    slug: 'coding',
    emoji: '💻',
    title: 'Coding Mode',
    desc: 'bring the bug. bring the ugly code. let\'s fix it.',
  },
  {
    slug: 'interview',
    emoji: '💼',
    title: 'Interview Mode',
    desc: 'you answer. yo pushes back. you get better.',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease, delay: i * 0.08 },
  }),
};

function handleMouseMove(e) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  el.style.setProperty('--my', `${e.clientY - rect.top}px`);
}

export default function ModePreview() {
  return (
    <section id="modes" className="relative pt-20 pb-16 lg:pt-24 lg:pb-20 px-6 lg:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="flex flex-col items-center text-center mb-10">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease }}
            className="text-[10px] uppercase tracking-[0.24em] text-white/30 font-mono"
          >
            Modes
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease, delay: 0.08 }}
            className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-[-0.04em] leading-[1.1] text-white"
          >
            pick how you want this to go.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease, delay: 0.16 }}
            className="mt-4 max-w-md text-white/45 text-[15px] font-light leading-[1.6]"
          >
            Same yo, different moods.
          </motion.p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {modes.map((m, i) => (
            <MotionLink
              key={m.title}
              to={`/loading?to=${encodeURIComponent(`/app?mode=${m.slug}`)}`}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              onMouseMove={handleMouseMove}
              className="card-premium group relative flex flex-col p-6 rounded-2xl border border-white/[0.07] bg-white/[0.012] hover:bg-white/[0.03] hover:border-white/16 transition-all duration-500 overflow-hidden"
            >
              {/* Emoji */}
              <div className="text-2xl mb-6 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:scale-110 origin-left">
                {m.emoji}
              </div>

              {/* Title */}
              <h3 className="text-[15px] font-semibold tracking-[-0.025em] mb-2 text-white">
                {m.title}
              </h3>

              {/* Description */}
              <p className="text-[13px] text-white/40 leading-[1.6] font-light">
                {m.desc}
              </p>

              {/* Arrow row */}
              <div className="mt-5 flex items-center gap-2 text-[10px] text-white/20 group-hover:text-white/55 transition-colors duration-500">
                <span className="font-mono uppercase tracking-[0.2em]">Try it</span>
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
              </div>
            </MotionLink>
          ))}
        </div>
      </div>
    </section>
  );
}
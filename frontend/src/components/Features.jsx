import { motion } from 'framer-motion';

const ease = [0.16, 1, 0.3, 1];

const features = [
  {
    no: '01',
    title: 'just ask',
    desc: 'Bad wording. Half thoughts. Random questions. Doesn\'t matter. Start anywhere.',
    icon: '💬',
  },
  {
    no: '02',
    title: 'drop it here',
    desc: 'Throw in the chaos. Notes, PDFs, slides — yo will untangle it..',
    icon: '📄',
  },
  {
    no: '03',
    title: 'make it stick',
    desc: 'Turn boring material into something your brain actually keeps.',
    icon: '⚡',
  },
  {
    no: '04',
    title: 'prove you know it',
    desc: 'yo asks. you answer.Find out what you actually know."',
    icon: '🎯',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative pt-16 pb-16 lg:pt-20 lg:pb-20 px-6 lg:px-10">
      {/* Subtle top border */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-10">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease }}
              className="text-[10px] uppercase tracking-[0.24em] text-white/30 font-mono"
            >
              Features
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.8, ease, delay: 0.08 }}
              className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-[-0.04em] max-w-xl leading-[1.1] text-white"
            >
              you've used AI before.
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease, delay: 0.16 }}
            className="max-w-xs text-white/40 text-[15px] font-light lg:text-right leading-[1.6]"
          >
            you just haven't talked to yo.
          </motion.p>
        </div>

        {/* Feature list */}
        <div className="border-t border-white/[0.06]">
          {features.map((f, i) => (
            <motion.div
              key={f.no}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, ease, delay: i * 0.06 }}
              className="group grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-center py-5 lg:py-6 border-b border-white/[0.06] hover:bg-white/[0.012] transition-colors duration-500 cursor-pointer px-3 -mx-3 rounded-lg"
            >
              {/* Number */}
              <div className="md:col-span-1 text-[11px] font-mono text-white/22 group-hover:text-white/55 transition-colors duration-500">
                {f.no}
              </div>

              {/* Title + icon */}
              <div className="md:col-span-3 flex items-center gap-3">
                <span className="text-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300">{f.icon}</span>
                <h3 className="text-lg sm:text-xl font-semibold tracking-[-0.025em] text-white">
                  {f.title}
                </h3>
              </div>

              {/* Description */}
              <div className="md:col-span-7">
                <p className="text-white/45 text-[14px] sm:text-[15px] font-light leading-[1.6] max-w-xl">
                  {f.desc}
                </p>
              </div>

              {/* Arrow */}
              <div className="md:col-span-1 hidden md:flex justify-end">
                <span className="text-white/18 text-lg transition-all duration-500 group-hover:translate-x-1.5 group-hover:text-white/65">
                  →
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
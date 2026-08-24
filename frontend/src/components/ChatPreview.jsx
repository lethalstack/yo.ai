import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const ease = [0.16, 1, 0.3, 1];

export default function ChatPreview() {
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setShowCursor((s) => !s), 580);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="chat" className="relative pt-16 pb-16 lg:pt-20 lg:pb-20 px-6 lg:px-10 overflow-hidden">
      {/* Subtle top border */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

      {/* Background glow */}
      <div className="absolute top-1/3 right-0 w-[400px] h-[400px] hero-glow opacity-35 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: copy */}
          <div>
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease }}
              className="text-[10px] uppercase tracking-[0.24em] text-white/30 font-mono"
            >
              Conversation
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.8, ease, delay: 0.08 }}
              className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-[-0.04em] leading-[1.1] text-white"
            >
              Not another chatgpt tab.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.8, ease, delay: 0.16 }}
              className="mt-4 text-white/45 text-[15px] font-light max-w-md leading-[1.6]"
            >
              No script. No robotic filler. Just a convo that follows you.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.8, ease, delay: 0.24 }}
              className="mt-7 flex flex-wrap gap-2"
            >
              {['Curious?', 'Stuck?', 'building?', 'thinking?'].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 text-[11px] text-white/35 border border-white/[0.07] rounded-full font-mono hover:text-white/65 hover:border-white/16 transition-colors duration-300"
                >
                  {tag}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right: chat preview */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.9, ease, delay: 0.15 }}
            className="relative"
          >
            {/* Glow behind chat */}
            <div className="absolute -inset-10 hero-glow opacity-45 pointer-events-none" />

            <div className="relative rounded-2xl border border-white/[0.07] bg-[#060606]/90 backdrop-blur-2xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)]">
              {/* Window header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full border border-white/15" />
                  <span className="w-2 h-2 rounded-full border border-white/15" />
                  <span className="w-2 h-2 rounded-full border border-white/15" />
                </div>
                <span className="text-[9px] font-mono text-white/25 tracking-[0.2em] ">
                  yo
                </span>
                <div className="w-8" />
              </div>

              {/* Messages */}
              <div className="p-5 sm:p-6 space-y-5 min-h-[300px]">
                {/* User message */}
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease, delay: 0.35 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[72%]">
                    <div className="text-[9px] tracking-[0.2em] text-white/15 font-mono mb-1.5 text-right">
                      you
                    </div>
                    <div className="rounded-2xl rounded-tr-sm bg-white/[0.06] border border-white/[0.07] px-4 py-2.5 text-[13px] text-white/85">
                      yo i'm stuck here 💀
                    </div>
                  </div>
                </motion.div>

                {/* yo message */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease, delay: 0.6 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[78%]">
                    <div className="text-[9px] tracking-[0.2em] text-white/15 font-mono mb-1.5 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      yo
                    </div>
                      <div className="rounded-2xl rounded-tl-sm border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[13px] text-white/70 leading-[1.6]">
                       No stress 😌. Your brain just hit a loading screen 🌀. Throw the confusing part here - messy, unfinished, or random. We'll sort through the chaos and make it click.
                       <span
                       className={`inline-block w-[6px] h-[13px] ml-0.5 bg-white/55 translate-y-0.5 rounded-sm ${
                       showCursor ? 'opacity-100' : 'opacity-0'
                       } transition-opacity`}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Input bar */}
              <div className="border-t border-white/[0.05] p-3">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/[0.02] border border-white/[0.07] transition-colors duration-300">
                  <span className="text-white/22 text-[13px] font-light flex-1">
                    Think out loud...
                  </span>
                  <button
                    className="w-6 h-6 rounded-full bg-white/90 text-black flex items-center justify-center text-[10px] hover:bg-white transition-colors"
                    aria-label="Send"
                  >
                    ↑
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
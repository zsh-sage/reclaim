"use client";

import { motion, type Variants } from "framer-motion";

const STATS = [
  { value: "4", label: "AI verdicts", sub: "APPROVE · PARTIAL · REJECT · MANUAL_REVIEW" },
  { value: "5", label: "Tool calls", sub: "Per ReAct iteration cap" },
  { value: "≤ 4", label: "Parallel workers", sub: "Concurrent OCR + compliance" },
  { value: "100%", label: "Transparent", sub: "Every AI decision logged & reviewable" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
} as const;

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
} as const;

export default function StatsBand() {
  return (
    <section className="relative split-gradient overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(147,150,255,0.18),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(158,0,180,0.14),transparent_60%)] mix-blend-overlay"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(transparent_96%,rgba(255,255,255,0.06)_96%),linear-gradient(90deg,transparent_96%,rgba(255,255,255,0.06)_96%)] bg-[size:32px_32px] opacity-30 pointer-events-none"
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-14 lg:py-20">
        <motion.div
          className="max-w-2xl text-on-primary mb-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <span className="inline-flex items-center rounded-full border border-white/35 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm">
            By the numbers
          </span>
          <h2 className="mt-4 font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Bounded by design.
          </h2>
          <p className="mt-4 text-base lg:text-lg opacity-90 leading-relaxed">
            Every constraint is explicit. Every decision is reproducible. Every audit answer is one query away.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 text-on-primary"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              variants={itemVariants}
              whileHover={{ scale: 1.03, x: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="border-l-2 border-white/30 pl-5"
            >
              <motion.div
                className="font-headline text-5xl lg:text-6xl font-black tabular-nums tracking-tighter"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {s.value}
              </motion.div>
              <div className="mt-2 text-sm font-bold uppercase tracking-wider">
                {s.label}
              </div>
              <div className="mt-1 text-xs opacity-75 leading-snug">
                {s.sub}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

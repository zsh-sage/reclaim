"use client";

import { motion, type Variants } from "framer-motion";
import { FileLock2, LayoutGrid, ShieldAlert, UserCheck } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldAlert,
    title: "The Fraud Trap",
    body: "Every employee edit to an AI-extracted field is logged immutably with a risk level (HIGH / MEDIUM / LOW). HR sees the original AI value vs the submitted value, side by side.",
  },
  {
    icon: LayoutGrid,
    title: "Triage Dashboard",
    body: "Claims pre-bucketed by AI judgment — Bucket A (Passed AI Review) for fast-track approvals, Bucket B (Requires Attention) for the 20–30% that need a human.",
  },
  {
    icon: FileLock2,
    title: "Immutable Audit Trail",
    body: "Every claim leaves a permanent chain — receipt → AI extraction → employee edits → compliance reasoning → HR decision. The legal record for finance and tax audits.",
  },
  {
    icon: UserCheck,
    title: "Human-in-the-loop, always",
    body: "The AI is advisory. No claim transitions to APPROVED or REJECTED without an explicit HR action. Every AI judgment is transparent, explained, and overridable.",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
} as const;

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut" },
  },
} as const;

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative py-20 lg:py-28 px-5 sm:px-8 lg:px-12 bg-surface"
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <span className="inline-flex items-center rounded-full border border-tertiary/20 bg-tertiary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-tertiary">
            Core Features
          </span>
          <h2 className="mt-4 font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight">
            Built around accountability.
          </h2>
          <p className="mt-4 text-on-surface-variant text-base sm:text-lg leading-relaxed">
            Reclaim augments HR — it doesn&rsquo;t replace them. Every feature is designed for traceability, consistency, and human judgment at the final step.
          </p>
        </motion.div>

        <motion.div
          className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <motion.div
              key={title}
              variants={itemVariants}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-7 lg:p-8 shadow-ambient hover:shadow-ambient-lg transition-shadow duration-300 group"
            >
              <div
                aria-hidden="true"
                className="absolute -top-12 -right-12 w-44 h-44 rounded-bl-full bg-gradient-to-br from-primary/15 to-tertiary/10 group-hover:scale-110 transition-transform duration-500"
              />
              <div className="relative z-10">
                <motion.div
                  className="inline-flex p-3.5 rounded-2xl bg-primary/10 text-primary mb-5"
                  whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.5 } }}
                >
                  <Icon className="w-6 h-6" strokeWidth={2} />
                </motion.div>
                <h3 className="font-headline text-xl lg:text-2xl font-bold text-on-surface tracking-tight mb-3">
                  {title}
                </h3>
                <p className="text-sm lg:text-base text-on-surface-variant leading-relaxed">
                  {body}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

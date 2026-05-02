"use client";

import { motion, type Variants } from "framer-motion";
import { TrendingUp, FileSearch, GitCompareArrows, Hourglass } from "lucide-react";

const PROBLEMS = [
  {
    icon: TrendingUp,
    title: "High volume, scaling fast",
    body: "As headcount grows, claims pile up — but the review process stays the same. One human, one claim, one policy lookup at a time.",
  },
  {
    icon: FileSearch,
    title: "Manual review burden",
    body: "HR officers spend hours on data-entry verification and policy lookups instead of strategic work that requires real judgment.",
  },
  {
    icon: GitCompareArrows,
    title: "Inconsistent enforcement",
    body: "Two reviewers reading the same policy may approve or reject the same claim differently. Policy interpretation drifts across staff.",
  },
  {
    icon: Hourglass,
    title: "Slow, opaque turnaround",
    body: "Five-to-ten-day cycles erode trust. Employees chase HR for status. HR chases employees for missing receipts. Everyone loses.",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
} as const;

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: "easeOut" },
  },
} as const;

export default function ProblemSection() {
  return (
    <section
      id="problem"
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
          <span className="inline-flex items-center rounded-full border border-error/20 bg-error-container/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-error">
            The Problem
          </span>
          <h2 className="mt-4 font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight">
            Enterprise HR is drowning in paper.
          </h2>
          <p className="mt-4 text-on-surface-variant text-base sm:text-lg leading-relaxed">
            Every reimbursement claim — RM 15 lunch or RM 8,000 travel — runs the same manual loop:
            open the attachment, read the amounts, cross-reference a policy PDF, write a response.
          </p>
        </motion.div>

        <motion.div
          className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {PROBLEMS.map(({ icon: Icon, title, body }) => (
            <motion.div
              key={title}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-ambient hover:shadow-ambient-lg transition-shadow duration-300 group"
            >
              <div
                aria-hidden="true"
                className="absolute -top-10 -right-10 w-36 h-36 rounded-bl-full bg-error-container/30 group-hover:scale-110 transition-transform duration-500"
              />
              <div className="relative z-10">
                <motion.div
                  className="inline-flex p-3 rounded-xl bg-error-container/40 text-error mb-5"
                  whileHover={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </motion.div>
                <h3 className="font-headline text-lg font-bold text-on-surface tracking-tight mb-2">
                  {title}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
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

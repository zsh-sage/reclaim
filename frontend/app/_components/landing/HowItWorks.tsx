"use client";

import { motion } from "framer-motion";
import { Brain, ChevronRight, FileText, ScanText } from "lucide-react";

const PIPELINES = [
  {
    icon: FileText,
    badge: "Step 1 · Setup",
    name: "Policy Agent",
    tagline: "5-node LangGraph pipeline",
    nodes: [
      "process_pdfs",
      "extract_categories_and_summary",
      "extract_conditions",
      "save_to_db",
      "embed_and_save_sections",
    ],
    description:
      "HR uploads the company policy. The agent extracts reimbursable categories and mandatory conditions, persists them as queryable rules, and embeds policy sections for RAG.",
  },
  {
    icon: ScanText,
    badge: "Step 2 · Submit",
    name: "Document Agent",
    tagline: "Parallel OCR workers (≤4 concurrent)",
    nodes: [
      "image → Qwen3.5 vision",
      "PDF → PyMuPDF4LLM → Gemini",
      "structured JSON per receipt",
      "anomaly flag generation",
    ],
    description:
      "Up to 10 receipts per submission. Images go through a vision model, PDFs are parsed to markdown then read. Output: merchant, date, amount, category, confidence — ready for verification.",
  },
  {
    icon: Brain,
    badge: "Step 3 · Decide",
    name: "Compliance Agent",
    tagline: "5-node ReAct pipeline",
    nodes: [
      "load_context",
      "analyze_receipts (parallel ReAct, ≤5 tool calls)",
      "aggregate_totals (pure Python)",
      "final_judgment",
      "save_reimbursement",
    ],
    description:
      "Per-receipt ReAct agents reason iteratively against the active policy — checking eligibility, caps, mandatory conditions. Final judgment: APPROVE, PARTIAL_APPROVE, REJECT, or MANUAL_REVIEW.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

const arrowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, delay: 0.5 },
  },
};

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative py-20 lg:py-28 px-5 sm:px-8 lg:px-12 bg-surface-container-low overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary opacity-[0.05] blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -right-20 w-[420px] h-[420px] rounded-full bg-tertiary opacity-[0.06] blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            How it works
          </span>
          <h2 className="mt-4 font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight">
            Three LangGraph pipelines, one decision chain.
          </h2>
          <p className="mt-4 text-on-surface-variant text-base sm:text-lg leading-relaxed">
            Reclaim&rsquo;s intelligence is split into three deterministic, stateful agents — each with a defined input, output, and audit trail.
          </p>
        </motion.div>

        <motion.div
          className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {PIPELINES.map((p, idx) => (
            <motion.div key={p.name} className="relative flex" variants={cardVariants}>
              <motion.div
                className="glass-card relative flex-1 rounded-3xl p-7 border border-white/50 shadow-ambient hover:shadow-ambient-lg transition-shadow duration-300"
                whileHover={{ y: -5, transition: { duration: 0.25 } }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <motion.div
                    className="inline-flex p-3 rounded-xl bg-primary/10 text-primary"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <p.icon className="w-5 h-5" strokeWidth={2} />
                  </motion.div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                    {p.badge}
                  </span>
                </div>
                <h3 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">
                  {p.name}
                </h3>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {p.tagline}
                </p>
                <p className="mt-4 text-sm text-on-surface-variant leading-relaxed">
                  {p.description}
                </p>

                <ul className="mt-5 space-y-2">
                  {p.nodes.map((n, nodeIdx) => (
                    <motion.li
                      key={n}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + nodeIdx * 0.08, duration: 0.4 }}
                      className="flex items-start gap-2 text-xs text-on-surface font-mono"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <span className="break-words">{n}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              {idx < PIPELINES.length - 1 && (
                <motion.div
                  aria-hidden="true"
                  className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 items-center justify-center"
                  variants={arrowVariants}
                >
                  <motion.div
                    className="w-9 h-9 rounded-full bg-primary text-on-primary shadow-ambient flex items-center justify-center"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

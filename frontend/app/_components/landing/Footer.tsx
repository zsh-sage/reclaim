"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

const PRODUCT_LINKS = [
  { href: "#problem", label: "Problem" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#demo", label: "Demo" },
];

const TECH_STACK = [
  "Next.js 16",
  "FastAPI",
  "LangGraph",
  "PostgreSQL + pgvector",
  "Qwen3.5-Flash",
  "Gemini 3.1 Flash Lite",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Footer() {
  return (
    <motion.footer
      className="bg-inverse-surface text-on-primary px-5 sm:px-8 lg:px-12 pt-16 pb-8"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6 }}
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-10"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants} className="md:col-span-2 md:pr-8">
            <div className="flex items-center gap-2.5">
              <Image
                src="/images/logo.svg"
                alt="Reclaim"
                width={32}
                height={32}
                className="w-8 h-8 object-contain brightness-0 invert"
              />
              <span className="font-headline text-2xl font-black tracking-tighter">
                Reclaim<span className="text-primary-fixed-dim">.</span>
              </span>
            </div>
            <p className="mt-4 text-sm opacity-80 max-w-md leading-relaxed">
              Every receipt reviewed. Every decision yours. An AI-native expense reimbursement platform built around accountability and human judgment.
            </p>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h4 className="text-xs font-bold uppercase tracking-[0.18em] opacity-70 mb-4">
              Product
            </h4>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-sm opacity-90 hover:opacity-100 hover:text-primary-fixed-dim transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/login"
                  className="text-sm opacity-90 hover:opacity-100 hover:text-primary-fixed-dim transition-colors"
                >
                  Sign In
                </Link>
              </li>
            </ul>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h4 className="text-xs font-bold uppercase tracking-[0.18em] opacity-70 mb-4">
              Built with
            </h4>
            <ul className="space-y-2.5">
              {TECH_STACK.map((t) => (
                <li key={t} className="text-sm opacity-90">
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <p className="text-xs opacity-70 text-center sm:text-left">
            Built for UM Hackathon 2026 · Reclaim MVP v1.0
          </p>
          <a
            href="https://github.com/zsh-sage/reclaim"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold opacity-80 hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="w-4 h-4" />
            View on GitHub
          </a>
        </motion.div>
      </div>
    </motion.footer>
  );
}

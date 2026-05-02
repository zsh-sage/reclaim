"use client";

import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import type { User } from "@/lib/api/types";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
} as const;

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
} as const;

const floatVariants: Variants = {
  animate: {
    y: [0, -12, 0],
    transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
  },
} as const;

const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 40 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut", delay: 0.3 },
  },
} as const;

export default function Hero({ user }: { user: User | null }) {
  const dashHref = user?.role === "HR" ? "/hr/dashboard" : "/employee/dashboard";

  return (
    <section className="relative split-gradient overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(147,150,255,0.18),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(158,0,180,0.14),transparent_60%)] mix-blend-overlay"
      />
      <motion.div
        aria-hidden="true"
        className="absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full bg-tertiary blur-[140px] opacity-40"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.55, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-primary blur-[120px] opacity-50"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.65, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(transparent_96%,rgba(255,255,255,0.06)_96%),linear-gradient(90deg,transparent_96%,rgba(255,255,255,0.06)_96%)] bg-[size:32px_32px] opacity-30 pointer-events-none"
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 pt-12 pb-16 lg:pt-20 lg:pb-24">
        <div className="grid lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-center">
          <motion.div
            className="max-w-3xl text-on-primary"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.span
              variants={itemVariants}
              className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Every receipt reviewed. Every decision yours.
            </motion.span>

            <motion.div variants={itemVariants} className="mt-6 flex items-center gap-4">
              <Image
                src="/images/logo.svg"
                alt=""
                width={64}
                height={64}
                className="w-14 h-14 lg:w-16 lg:h-16 object-contain brightness-0 invert"
                priority
              />
              <span className="font-headline text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight">
                Reclaim.
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mt-6 font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]"
            >
              Cut reimbursement review
              <br className="hidden sm:block" /> from days to minutes.
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-6 max-w-2xl text-base sm:text-lg opacity-90 font-light leading-relaxed"
            >
              Receipts come in. AI extracts every line and checks them against your policy.
              HR opens a pre-sorted queue — fast-track the clean claims, focus only on the ones that need judgment.
            </motion.p>

            <motion.div
              variants={scaleInVariants}
              initial="hidden"
              animate="visible"
              className="mt-10 lg:hidden"
            >
              <Image
                src="/images/example.png"
                alt="Reclaim dashboard preview"
                width={580}
                height={749}
                className="w-full max-w-md mx-auto h-auto rounded-2xl shadow-ambient-lg"
                priority
              />
            </motion.div>

            <motion.div variants={itemVariants} className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/login?demo=employee"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-on-primary text-primary rounded-full text-base font-bold shadow-ambient-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                Try the live demo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/40 text-on-primary rounded-full text-base font-semibold hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                How it works
                <ChevronDown className="w-4 h-4" />
              </a>
              {user && (
                <Link
                  href={dashHref}
                  className="inline-flex items-center gap-2 px-5 py-3 text-on-primary text-sm font-semibold underline underline-offset-4 decoration-white/40 hover:decoration-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
                >
                  Already signed in — go to dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </motion.div>
          </motion.div>

          <motion.div
            className="hidden lg:block flex-shrink-0"
            variants={scaleInVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={floatVariants} animate="animate">
              <Image
                src="/images/example.png"
                alt="Reclaim dashboard preview showing the HR triage queue"
                width={580}
                height={749}
                className="h-[760px] w-auto scale-110 origin-center"
                priority
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

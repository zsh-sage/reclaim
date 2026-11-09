"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { User } from "@/lib/api/types";
import { btn } from "@/components/ui/styles";
import { EASE } from "./primitives";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
  loading: () => <SceneFallback />,
});

function SceneFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
      <div className="aspect-[1.6] w-[62%] rounded-[22px] bg-white shadow-float ring-1 ring-on-surface/5" />
    </div>
  );
}

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

export default function Hero({ user }: { user: User | null }) {
  const dashHref = user?.role === "HR" ? "/hr/dashboard" : "/employee/dashboard";

  return (
    <section id="product" className="relative isolate overflow-hidden bg-white pt-28 sm:pt-32 lg:pt-36">
      {/* One soft, static wash behind the pass — nothing animated, nothing loud */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {/* Static aurora in brand colours — radial gradients only, no blur filters */}
        <div className="absolute right-[-12%] top-[-8%] h-[1000px] w-[1100px] max-lg:right-[-60%] max-lg:top-[28%]">
          <div className="absolute left-[18%] top-[14%] h-[60%] w-[60%] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(70 71 211 / 0.30), transparent)" }} />
          <div className="absolute left-[42%] top-[30%] h-[55%] w-[55%] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(0 156 222 / 0.26), transparent)" }} />
          <div className="absolute left-[30%] top-[46%] h-[42%] w-[42%] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(254 133 0 / 0.16), transparent)" }} />
          <div className="absolute left-[52%] top-[4%] h-[42%] w-[42%] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(158 0 180 / 0.14), transparent)" }} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-on-surface/[0.06]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-4 px-5 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-8 lg:px-10">
        <motion.div variants={container} initial="hidden" animate="visible" className="relative z-10 max-w-xl">
          <motion.a
            variants={item}
            href="#how-it-works"
            className="group inline-flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3.5 text-[13px] text-on-surface-variant ring-1 ring-inset ring-on-surface/10 transition-colors hover:text-on-surface hover:ring-on-surface/20"
          >
            <span className="rounded-full bg-paypal px-2 py-0.5 text-[11px] font-semibold text-white" translate="no">
              PayPal
            </span>
            Payouts built in
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </motion.a>

          <motion.h1
            variants={item}
            className="mt-7 text-balance font-headline text-[44px] font-medium leading-[1.02] tracking-[-0.045em] text-on-surface sm:text-[60px] lg:text-[68px]"
          >
            Reimbursements, <span className="text-primary">reasoned by AI.</span>{" "}
            <span className="text-paypal-blue" translate="no">
              Paid via PayPal.
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-[30rem] text-pretty text-[17px] leading-relaxed text-on-surface-variant sm:text-[18px]"
          >
            Reclaim reads every receipt, checks it against your policy, and pays approved claims straight to
            employees&nbsp;— in minutes, not days.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href={user ? dashHref : "/login?demo=employee"} className={`${btn.dark} ${btn.lg}`}>
              {user ? "Go to Dashboard" : "Try the Live Demo"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-on-surface transition-colors hover:text-primary"
            >
              How It Works
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          </motion.div>

          <motion.p variants={item} className="mt-14 text-[13px] text-on-surface-variant/80" translate="no">
            Built with PayPal Payouts <span aria-hidden="true" className="mx-1.5 text-on-surface/20">/</span> AG Grid{" "}
            <span aria-hidden="true" className="mx-1.5 text-on-surface/20">/</span> LangGraph
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
          className="relative h-[320px] sm:h-[420px] lg:h-[540px]"
        >
          <HeroScene className="h-full w-full" />
        </motion.div>
      </div>

      <div className="h-12 lg:h-20" />
    </section>
  );
}

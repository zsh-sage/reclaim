"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  type MotionValue,
  type Variants,
} from "framer-motion";
import { Check, ScanText, Send, ShieldCheck } from "lucide-react";
import { EASE, SectionIntro } from "./primitives";

const STEPS = [
  {
    icon: ScanText,
    title: "Submit",
    body: "Employees upload up to ten receipts. AI reads the merchant, date, amount and category.",
    engine: "Document Agent · vision OCR",
    iconBg: "from-[#7b7cf5] to-primary",
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    body: "Each line is checked against your policy and returned with a verdict and its reasons.",
    engine: "Compliance Agent · LangGraph",
    iconBg: "from-[#c04cff] to-tertiary",
  },
  {
    icon: Send,
    title: "Pay",
    body: "Approved claims are sent to the employee’s PayPal account. No bank details to chase.",
    engine: "PayPal Payouts",
    iconBg: "from-paypal-sky to-paypal",
  },
];

/* ─── Step visuals ──────────────────────────────────────────────────────────
 * Each plays when it enters the viewport (whileInView), so the same component
 * works in the sticky desktop stage and inline on mobile.
 */

const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.18, delayChildren: 0.25 } } };
const pop: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } },
};

function SubmitVisual() {
  const reduce = useReducedMotion();
  const fields = [
    ["Merchant", "Grab"],
    ["Date", "12 Oct 2026"],
    ["Amount", "RM 38.60"],
    ["Category", "Transport"],
  ];
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[200px_1fr]">
      <div className="relative mx-auto w-[200px] overflow-hidden rounded-2xl bg-white p-5 text-ink shadow-[0_20px_50px_-20px_rgb(0_0_0/0.6)]">
        <p className="font-headline text-[15px] font-semibold tracking-[-0.02em]">Grab</p>
        <p className="font-mono text-[10px] text-on-surface-variant">#GRB-4821 · 12/10/26</p>
        <div className="mt-4 space-y-2" aria-hidden="true">
          {[80, 64, 72, 56].map((w, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span className="h-1.5 rounded-full bg-surface-container" style={{ width: `${w}%` }} />
              <span className="h-1.5 w-8 rounded-full bg-surface-container" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-dashed border-on-surface/15 pt-3 text-[12px] font-semibold">
          <span>Total</span>
          <span className="font-mono">RM 38.60</span>
        </div>
        {!reduce && (
          <motion.div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-transparent via-primary/25 to-transparent"
            initial={{ y: "-100%" }}
            animate={{ y: "320%" }}
            transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.4, ease: "easeInOut" }}
          />
        )}
      </div>
      <motion.dl variants={list} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid gap-2">
        {fields.map(([k, v]) => (
          <motion.div
            key={k}
            variants={pop}
            className="flex items-center justify-between rounded-xl bg-white/[0.06] px-4 py-2.5 ring-1 ring-white/10"
          >
            <dt className="text-[13px] text-white/50">{k}</dt>
            <dd className="font-mono text-[13px] text-white">{v}</dd>
          </motion.div>
        ))}
      </motion.dl>
    </div>
  );
}

function VerifyVisual() {
  const checks = [
    ["Fare within RM 800 travel cap", "§4.2"],
    ["Receipt date matches trip", "§3.1"],
    ["No edits to AI-extracted fields", "audit"],
  ];
  return (
    <motion.div variants={list} initial="hidden" whileInView="show" viewport={{ once: true }} className="space-y-2.5">
      {checks.map(([label, clause]) => (
        <motion.div key={label} variants={pop} className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-white">
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-[14px] text-white/85">{label}</span>
          <span className="font-mono text-[11px] text-white/40">{clause}</span>
        </motion.div>
      ))}
      <motion.div variants={pop} className="flex items-center justify-between pt-3">
        <span className="rounded-full bg-success/20 px-3 py-1 text-[13px] font-semibold text-[#6ee7a8] ring-1 ring-inset ring-success/30">
          Approve
        </span>
        <span className="font-mono text-[12px] text-white/50">confidence 0.97</span>
      </motion.div>
    </motion.div>
  );
}

function PayVisual() {
  return (
    <motion.div variants={list} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto max-w-sm">
      <motion.div variants={pop} className="overflow-hidden rounded-2xl bg-white text-ink shadow-[0_24px_60px_-24px_rgb(0_112_224/0.7)]">
        <div className="flex items-center justify-between bg-linear-to-r from-paypal to-paypal-blue px-5 py-3.5 text-white">
          <span className="font-headline text-[17px] font-bold tracking-[-0.02em]" translate="no">
            PayPal <span className="text-[13px] font-medium text-white/75">Payouts</span>
          </span>
          <span className="text-[12px] text-white/80">Batch #8F21</span>
        </div>
        <div className="p-5">
          <p className="text-[12px] text-on-surface-variant">Sending to Aisha Rahman</p>
          <p className="mt-1 font-headline text-[32px] font-medium tracking-[-0.04em] tabular-nums">RM 1,284.50</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-container">
            <motion.div
              className="h-full origin-left rounded-full bg-paypal-blue"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, delay: 0.5, ease: EASE }}
            />
          </div>
          <motion.p
            className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-success"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.9, duration: 0.4 }}
          >
            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            Sent · 09:14
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
}

const VISUALS = [SubmitVisual, VerifyVisual, PayVisual];

/* ─── Flow rail ─────────────────────────────────────────────────────────── */

function Segment({ fill }: { fill: MotionValue<number> }) {
  return (
    <div
      aria-hidden="true"
      className="absolute bottom-2 left-6 top-[60px] w-[2px] -translate-x-1/2 overflow-hidden rounded-full bg-white/10"
    >
      <motion.div
        className="h-full w-full origin-top rounded-full bg-linear-to-b from-[#9b9cff] via-[#d36bff] to-[#6cb4ff] shadow-[0_0_12px_rgb(155_156_255/0.8)]"
        style={{ scaleY: fill }}
      />
    </div>
  );
}

export default function HowItWorks() {
  // The "flow line" sits at 55% of the viewport. A step becomes active when its
  // icon crosses that line; each rail segment fills as the line travels from one
  // icon to the next. Positions are read live, so it works at any height.
  const iconRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const raw0 = useMotionValue(0);
  const raw1 = useMotionValue(0);
  const seg0 = useSpring(raw0, { stiffness: 160, damping: 32, mass: 0.3 });
  const seg1 = useSpring(raw1, { stiffness: 160, damping: 32, mass: 0.3 });
  const [active, setActive] = useState(0);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", () => {
    const line = window.innerHeight * 0.55;
    const tops = iconRefs.current.map((el) => (el ? el.getBoundingClientRect().top + 24 : Infinity));
    const fill = (a: number, b: number) => Math.min(1, Math.max(0, (line - a) / (b - a)));
    raw0.set(fill(tops[0], tops[1]));
    raw1.set(fill(tops[1], tops[2]));
    const next = tops[2] <= line ? 2 : tops[1] <= line ? 1 : 0;
    setActive((cur) => (cur === next ? cur : next));
  });

  const Visual = VISUALS[active];

  return (
    <section id="how-it-works" data-nav-dark className="relative overflow-clip bg-ink py-20 text-white lg:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[640px]">
        <div className="absolute left-[8%] top-[-40%] h-[620px] w-[760px] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(70 71 211 / 0.45), transparent)" }} />
        <div className="absolute right-[6%] top-[-30%] h-[560px] w-[680px] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(0 112 224 / 0.35), transparent)" }} />
        <div className="absolute left-[44%] top-[-50%] h-[480px] w-[520px] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(158 0 180 / 0.3), transparent)" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionIntro dark eyebrow="How it works" title="Receipt to PayPal in three steps." />

        <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <ol className="relative">
            {STEPS.map((s, i) => {
              const on = i <= active;
              const InlineVisual = VISUALS[i];
              return (
                <li
                  key={s.title}
                  className="relative grid grid-cols-[48px_1fr] gap-5 pb-14 last:pb-0 sm:gap-7 lg:min-h-[48vh] lg:pb-0"
                >
                  {i < STEPS.length - 1 && <Segment fill={i === 0 ? seg0 : seg1} />}

                  <span
                    ref={(el) => {
                      iconRefs.current[i] = el;
                    }}
                    className="relative z-10 inline-flex h-12 w-12"
                  >
                    <span className="absolute inset-0 rounded-[14px] bg-white/[0.06] ring-1 ring-inset ring-white/10" />
                    <span
                      className={`absolute inset-0 rounded-[14px] bg-linear-to-br shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_30px_-8px_rgb(0_0_0/0.6)] transition-opacity duration-500 ${s.iconBg} ${
                        on ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <s.icon
                      className={`relative m-auto h-[22px] w-[22px] transition-colors duration-500 ${on ? "text-white" : "text-white/35"}`}
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />
                  </span>

                  <div className={`pt-1 transition-opacity duration-500 ${on ? "opacity-100" : "opacity-40"}`}>
                    <p className="font-mono text-[12px] text-white/40 tabular-nums">0{i + 1}</p>
                    <h3 className="mt-1 font-headline text-[28px] font-medium tracking-[-0.03em]">{s.title}</h3>
                    <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/60">{s.body}</p>
                    <p
                      className={`mt-4 font-mono text-[12px] ${i === 2 ? "text-[#6cb4ff]" : "text-white/40"}`}
                      translate="no"
                    >
                      {s.engine}
                    </p>
                    <div className="mt-7 lg:hidden">
                      <InlineVisual />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Sticky stage — plays the step the flow has reached */}
          <div className="hidden lg:block">
            <div className="sticky top-[max(7rem,calc(50vh-15rem))]">
              <div className="relative overflow-hidden rounded-[28px] bg-white/[0.04] p-8 ring-1 ring-white/10">
                <div className="flex items-center gap-2" aria-hidden="true">
                  {STEPS.map((s, i) => (
                    <span
                      key={s.title}
                      className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-500 ${
                        i === active ? "bg-white text-ink" : i < active ? "bg-white/15 text-white" : "bg-white/[0.05] text-white/40"
                      }`}
                    >
                      {s.title}
                    </span>
                  ))}
                </div>
                <div className="relative mt-8 min-h-[300px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={active}
                      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                      transition={{ duration: 0.45, ease: EASE }}
                    >
                      <Visual />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
              <p className="mt-4 text-center text-[12px] text-white/35">Scroll to move the claim through the pipeline</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

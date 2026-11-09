"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Slider, Switch } from "glisse";
import { ArrowRight, Receipt, Cpu, PenLine, Scale, Gavel, ShieldAlert, Gauge, LayoutGrid, FileLock2, type LucideIcon } from "lucide-react";
import { Reveal, SectionIntro } from "./primitives";

const TINTS = {
  rose: { bg: "bg-[#fff1f3]", icon: "from-[#ff6b8a] to-[#e11d48]" },
  indigo: { bg: "bg-[#eff0ff]", icon: "from-[#7b7cf5] to-primary" },
  amber: { bg: "bg-[#fff4e8]", icon: "from-[#ffb04d] to-accent" },
  sky: { bg: "bg-[#ebf5ff]", icon: "from-paypal-sky to-secondary" },
} as const;

function Tile({
  icon: Icon,
  tint,
  title,
  body,
  className = "",
  children,
  delay = 0,
}: {
  icon: LucideIcon;
  tint: keyof typeof TINTS;
  title: string;
  body: string;
  className?: string;
  children?: React.ReactNode;
  delay?: number;
}) {
  const t = TINTS[tint];
  return (
    <Reveal className={className} delay={delay}>
      <article className={`flex h-full flex-col overflow-hidden rounded-[24px] ${t.bg}`}>
        <div className="p-7 pb-0 lg:p-8 lg:pb-0">
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-linear-to-br text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_6px_16px_-6px_rgb(20_20_43/0.35)] ${t.icon}`}
          >
            <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <h3 className="mt-5 font-headline text-[22px] font-medium tracking-[-0.03em] text-on-surface">{title}</h3>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-on-surface-variant">{body}</p>
        </div>
        <div className="mt-auto p-5 pt-8 lg:p-6 lg:pt-10">{children}</div>
      </article>
    </Reveal>
  );
}

function FraudVisual() {
  const rows = [
    { field: "Merchant", ai: "Marriott KL", sub: "Marriott KL", risk: null },
    { field: "Date", ai: "12 Oct 2026", sub: "12 Oct 2026", risk: null },
    { field: "Amount", ai: "RM 128.40", sub: "RM 168.40", risk: "HIGH" },
    { field: "Category", ai: "Lodging", sub: "Meals", risk: "MEDIUM" },
  ];
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-on-surface/[0.05]">
      <div className="grid grid-cols-[1fr_1.1fr_1.1fr_auto] gap-3 border-b border-on-surface/[0.06] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
        <span>Field</span>
        <span>AI Extracted</span>
        <span>Submitted</span>
        <span className="w-16 text-right">Risk</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.field}
          className={`grid grid-cols-[1fr_1.1fr_1.1fr_auto] items-center gap-3 px-4 py-2.5 text-[13px] ${r.risk ? "bg-error-container/40" : ""}`}
        >
          <span className="text-on-surface-variant">{r.field}</span>
          <span className="truncate font-mono text-on-surface tabular-nums">{r.ai}</span>
          <span className={`truncate font-mono tabular-nums ${r.risk ? "font-semibold text-error" : "text-on-surface"}`}>{r.sub}</span>
          <span className="w-16 text-right">
            {r.risk ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.risk === "HIGH" ? "bg-error text-white" : "bg-warning-container text-warning"}`}>
                {r.risk}
              </span>
            ) : (
              <span className="text-[11px] text-on-surface-variant/60">—</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function AutonomyVisual() {
  const [auto, setAuto] = useState(true);
  const [threshold, setThreshold] = useState(70);
  // Illustrative curve: share of claims auto-cleared at a given threshold
  const cleared = auto ? Math.round(92 - (threshold - 50) * 0.9) : 0;
  return (
    <div className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-on-surface/[0.05]">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="auto-approve" className="text-[14px] font-medium text-on-surface">
          Auto-approve clean claims
        </label>
        <Switch id="auto-approve" checked={auto} onCheckedChange={setAuto} />
      </div>
      <div className={auto ? "" : "pointer-events-none opacity-40"}>
        <div className="mb-2 flex items-center justify-between text-[13px]">
          <label htmlFor="threshold" className="text-on-surface-variant">Confidence threshold</label>
          <span className="font-mono tabular-nums text-on-surface">{threshold}%</span>
        </div>
        <Slider id="threshold" aria-label="Confidence threshold" min={50} max={95} step={1} value={threshold} onValueChange={setThreshold} />
      </div>
      <div className="flex items-end justify-between border-t border-on-surface/[0.06] pt-3">
        <span className="text-[12px] text-on-surface-variant">Cleared without HR (illustrative)</span>
        <span className="font-headline text-[26px] font-semibold tracking-[-0.03em] text-on-surface tabular-nums">{cleared}%</span>
      </div>
    </div>
  );
}

function TriageVisual() {
  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-on-surface/[0.05]">
      {[
        { label: "Passed AI review", pct: 74, cls: "bg-success" },
        { label: "Needs a human", pct: 26, cls: "bg-warning" },
      ].map((b) => (
        <div key={b.label}>
          <div className="mb-1.5 flex justify-between text-[12px]">
            <span className="text-on-surface-variant">{b.label}</span>
            <span className="font-mono tabular-nums text-on-surface">{b.pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-container">
            <motion.div
              className={`h-full rounded-full ${b.cls}`}
              style={{ originX: 0 }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: b.pct / 100 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditVisual() {
  const steps = [
    { icon: Receipt, label: "Receipt", meta: "IMG_2041.jpg" },
    { icon: Cpu, label: "AI extraction", meta: "conf 0.96" },
    { icon: PenLine, label: "Employee edit", meta: "1 field" },
    { icon: Scale, label: "Compliance", meta: "§4.2 cap" },
    { icon: Gavel, label: "HR decision", meta: "Approved" },
  ];
  return (
    <ol className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-4 ring-1 ring-on-surface/[0.05]">
      {steps.map((s, i) => (
        <li key={s.label} className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 items-center gap-2 rounded-xl bg-marshmallow px-3 py-2">
            <s.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 leading-tight">
              <p className="whitespace-nowrap text-[12px] font-medium text-on-surface">{s.label}</p>
              <p className="whitespace-nowrap font-mono text-[10px] text-on-surface-variant">{s.meta}</p>
            </div>
          </div>
          {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-on-surface-variant/50" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

export default function FeaturesSection() {
  return (
    <section id="features" className="relative bg-white py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionIntro
          eyebrow="Features"
          title="Automation you can audit."
          lede="AI does the reading. People keep the final say."
        />

        <div className="mt-12 grid gap-4 lg:mt-16 lg:grid-cols-6">
          <Tile
            className="lg:col-span-4"
            icon={ShieldAlert}
            tint="rose"
            title="Edit detection"
            body="Every change to an AI-extracted field is logged and risk-scored, shown side by side."
          >
            <FraudVisual />
          </Tile>
          <Tile className="lg:col-span-2" delay={0.06} icon={Gauge} tint="indigo" title="Auto-approval" body="You set the bar. AI clears the rest.">
            <AutonomyVisual />
          </Tile>
          <Tile className="lg:col-span-2" icon={LayoutGrid} tint="amber" title="Triage" body="HR only opens claims that need a human.">
            <TriageVisual />
          </Tile>
          <Tile
            className="lg:col-span-4"
            delay={0.06}
            icon={FileLock2}
            tint="sky"
            title="Audit trail"
            body="A permanent chain from receipt to decision, ready for finance and tax review."
          >
            <AuditVisual />
          </Tile>
        </div>
      </div>
    </section>
  );
}

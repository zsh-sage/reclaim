"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, KeyRound, ShieldCheck } from "lucide-react";

interface DemoAccount {
  role: "HR" | "Employee";
  email: string;
  password: string;
  description: string;
  iconBg: string;
  iconText: string;
}

const ACCOUNTS: DemoAccount[] = [
  {
    role: "HR",
    email: "hr@example.com",
    password: "password",
    description: "Manage policy, review the triage dashboard, exercise the final decision.",
    iconBg: "bg-primary/10",
    iconText: "text-primary",
  },
  {
    role: "Employee",
    email: "employee@example.com",
    password: "password",
    description: "Submit a multi-receipt claim, verify the AI pre-fill, watch the pipeline run.",
    iconBg: "bg-tertiary/10",
    iconText: "text-tertiary",
  },
];

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // older browsers — silently no-op
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-outline/15 bg-surface px-4 py-3 text-left font-mono text-sm text-on-surface hover:border-primary/40 hover:bg-surface-container-low transition-colors"
    >
      <span className="truncate">{value}</span>
      <span
        className={`shrink-0 inline-flex items-center gap-1 text-xs font-semibold ${
          copied
            ? "text-primary"
            : "text-on-surface-variant group-hover:text-primary"
        }`}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

export default function DemoSection() {
  return (
    <section
      id="demo"
      className="relative py-20 lg:py-28 px-5 sm:px-8 lg:px-12 bg-surface overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(70,71,211,0.08),transparent_60%)] pointer-events-none"
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            <KeyRound className="w-3 h-3" />
            Try the demo
          </span>
          <h2 className="mt-4 font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight">
            Sign in with the seeded accounts.
          </h2>
          <p className="mt-4 text-on-surface-variant text-base sm:text-lg leading-relaxed">
            We&rsquo;ve pre-loaded two demo logins so you can experience both sides of the workflow without setting up your own users or policy.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ACCOUNTS.map((acc) => (
            <div
              key={acc.role}
              className="glass-card relative overflow-hidden rounded-3xl border border-white/50 p-7 lg:p-8 shadow-ambient hover:shadow-ambient-lg transition-shadow duration-300"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className={`inline-flex p-3 rounded-xl ${acc.iconBg} ${acc.iconText}`}>
                  <ShieldCheck className="w-5 h-5" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-headline text-xl font-bold text-on-surface tracking-tight">
                    {acc.role} Demo
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {acc.description}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant mb-1.5">
                    Email
                  </label>
                  <CopyField value={acc.email} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant mb-1.5">
                    Password
                  </label>
                  <CopyField value={acc.password} />
                </div>
              </div>

              <Link
                href="/login"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary to-primary-dim shadow-ambient hover:shadow-[0_0_24px_rgba(70,71,211,0.4)] transition-shadow"
              >
                Sign in as {acc.role}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-on-surface-variant max-w-xl mx-auto">
          These accounts are seeded by{" "}
          <code className="px-1.5 py-0.5 rounded bg-surface-container-high text-[11px]">
            seed_demo_employees.py
          </code>{" "}
          for hackathon evaluation only and are reset on every container rebuild.
        </p>
      </div>
    </section>
  );
}

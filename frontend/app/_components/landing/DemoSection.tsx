"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SegmentedControl } from "glisse";
import { btn } from "@/components/ui/styles";
import { Reveal } from "./primitives";

const ROLES = {
  employee: { label: "Employee", email: "employee@example.com", blurb: "Submit receipts and watch the AI pre-fill." },
  hr: { label: "HR", email: "hr@example.com", blurb: "Triage claims and approve PayPal payouts." },
} as const;

type Role = keyof typeof ROLES;

export default function DemoSection() {
  const [role, setRole] = useState<Role>("employee");
  const r = ROLES[role];

  return (
    <section id="demo" className="bg-white px-3 py-16 sm:px-6 lg:py-24">
      <div data-nav-dark className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-ink px-6 py-20 text-center text-white sm:px-10 lg:py-28">
        {/* Aurora — static radial gradients in brand colours */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-[10%] bottom-[-55%] h-[620px] w-[720px] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(70 71 211 / 0.55), transparent)" }} />
          <div className="absolute left-[30%] bottom-[-60%] h-[560px] w-[640px] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(0 112 224 / 0.45), transparent)" }} />
          <div className="absolute -right-[8%] bottom-[-50%] h-[520px] w-[600px] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(254 133 0 / 0.3), transparent)" }} />
          <div className="absolute right-[20%] -top-[40%] h-[420px] w-[520px] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(158 0 180 / 0.3), transparent)" }} />
        </div>

        <Reveal className="relative mx-auto max-w-2xl">
          <h2 className="text-balance font-headline text-[36px] font-medium leading-[1.05] tracking-[-0.04em] sm:text-[52px]">
            See it with real data.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-white/65">
            Pick a role. You’re signed in instantly.
          </p>

          <div className="lg-on-dark mt-10 flex justify-center">
            <SegmentedControl
              aria-label="Demo role"
              items={[
                { value: "employee", label: "Employee" },
                { value: "hr", label: "HR" },
              ]}
              value={role}
              onValueChange={(v) => setRole(v as Role)}
              style={{ ["--lg-tab-width" as string]: "120px", ["--lg-tab-height" as string]: "36px" }}
            />
          </div>
          <p className="mt-4 text-[14px] text-white/55" aria-live="polite">
            {r.blurb}
          </p>

          <Link href={`/login?demo=${role}`} className={`${btn.onDark} ${btn.lg} mt-8`}>
            Continue as {r.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-8 text-[12px] text-white/35" translate="no">
            {r.email} · password
          </p>
        </Reveal>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, Check, UserRound, Users } from "lucide-react";
import { Reveal, SectionIntro } from "./primitives";

const PORTALS = [
  {
    key: "hr",
    title: "Finance & HR",
    items: ["Upload and version company policy", "Review only what AI flags", "Export a full audit trail"],
    href: "/login?role=hr",
    cta: "HR Portal",
    dark: true,
    icon: Users,
    iconBg: "from-[#7b7cf5] to-primary",
  },
  {
    key: "employee",
    title: "Employees",
    items: ["Snap up to ten receipts per claim", "Check the AI pre-fill, edit if needed", "Get paid to PayPal, tracked live"],
    href: "/login?role=employee",
    cta: "Employee Portal",
    dark: false,
    icon: UserRound,
    iconBg: "from-paypal-sky to-paypal",
  },
];

export default function ForWhomSection() {
  return (
    <section className="relative bg-marshmallow py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionIntro eyebrow="Two portals" title="Built for both sides of the desk." />

        <div className="mt-12 grid gap-4 lg:mt-16 lg:grid-cols-2">
          {PORTALS.map((p, i) => (
            <Reveal key={p.key} delay={i * 0.06}>
              <article
                className={`relative isolate flex h-full flex-col overflow-hidden rounded-[24px] p-8 lg:p-10 ${
                  p.dark ? "bg-ink text-white" : "bg-[#ebf5ff] text-on-surface"
                }`}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full"
                  style={{
                    background: p.dark
                      ? "radial-gradient(closest-side, rgb(70 71 211 / 0.55), transparent)"
                      : "radial-gradient(closest-side, rgb(0 156 222 / 0.25), transparent)",
                  }}
                />
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-linear-to-br text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_8px_20px_-8px_rgb(20_20_43/0.45)] ${p.iconBg}`}
                >
                  <p.icon className="h-[22px] w-[22px]" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <h3 className="mt-6 font-headline text-[28px] font-medium tracking-[-0.035em]">{p.title}</h3>
                <ul className="mt-8 space-y-4">
                  {p.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[15px]">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${p.dark ? "text-[#a5a7ff]" : "text-paypal-blue"}`}
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                      <span className={p.dark ? "text-white/80" : "text-on-surface-variant"}>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className={`group mt-12 inline-flex items-center gap-1.5 self-start text-[15px] font-medium ${
                    p.dark ? "text-white" : "text-on-surface"
                  }`}
                >
                  {p.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

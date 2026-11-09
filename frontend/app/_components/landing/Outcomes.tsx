"use client";

import { Reveal } from "./primitives";

const OUTCOMES = [
  { value: "Minutes", caption: "From receipt to PayPal payout. Not 5–10 days.", text: "text-primary", bar: "bg-primary" },
  { value: "Exceptions", caption: "Are all HR reviews. Clean claims clear themselves.", text: "text-secondary", bar: "bg-secondary" },
  { value: "100%", caption: "Of AI decisions logged with the policy clause behind them.", text: "text-accent", bar: "bg-accent" },
];

export default function Outcomes() {
  return (
    <section aria-label="Outcomes" className="bg-white py-16 lg:py-24">
      <dl className="mx-auto grid max-w-7xl gap-10 px-5 sm:grid-cols-3 sm:gap-8 sm:px-8 lg:px-10">
        {OUTCOMES.map((o, i) => (
          <Reveal key={o.value} delay={i * 0.06} className="relative border-t border-on-surface/10 pt-6">
            <span aria-hidden="true" className={`absolute -top-px left-0 h-[2px] w-12 ${o.bar}`} />
            <dt className={`font-headline text-[34px] font-medium leading-none tracking-[-0.04em] lg:text-[44px] ${o.text}`}>
              {o.value}
            </dt>
            <dd className="mt-3 max-w-[18rem] text-[15px] leading-relaxed text-on-surface-variant">{o.caption}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}

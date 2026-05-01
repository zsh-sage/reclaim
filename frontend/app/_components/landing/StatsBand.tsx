const STATS = [
  { value: "4", label: "AI verdicts", sub: "APPROVE · PARTIAL · REJECT · MANUAL_REVIEW" },
  { value: "5", label: "Tool calls", sub: "Per ReAct iteration cap" },
  { value: "≤4", label: "Parallel workers", sub: "Concurrent OCR + compliance" },
  { value: "100%", label: "HR-final", sub: "No silent automated decisions" },
];

export default function StatsBand() {
  return (
    <section className="relative split-gradient overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(147,150,255,0.18),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(158,0,180,0.14),transparent_60%)] mix-blend-overlay"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(transparent_96%,rgba(255,255,255,0.06)_96%),linear-gradient(90deg,transparent_96%,rgba(255,255,255,0.06)_96%)] bg-[size:32px_32px] opacity-30 pointer-events-none"
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-20 lg:py-24">
        <div className="max-w-2xl text-on-primary mb-12">
          <span className="inline-flex items-center rounded-full border border-white/35 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm">
            By the numbers
          </span>
          <h2 className="mt-4 font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Bounded by design.
          </h2>
          <p className="mt-4 text-base lg:text-lg opacity-90 leading-relaxed">
            Every constraint is explicit. Every decision is reproducible. Every audit answer is one query away.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 text-on-primary">
          {STATS.map((s) => (
            <div key={s.label} className="border-l-2 border-white/30 pl-5">
              <div className="font-headline text-5xl lg:text-6xl font-black tabular-nums tracking-tighter">
                {s.value}
              </div>
              <div className="mt-2 text-sm font-bold uppercase tracking-wider">
                {s.label}
              </div>
              <div className="mt-1 text-xs opacity-75 leading-snug">
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

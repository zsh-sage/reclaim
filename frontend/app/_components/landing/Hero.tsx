import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import type { User } from "@/lib/api/types";

export default function Hero({ user }: { user: User | null }) {
  const dashHref = user?.role === "HR" ? "/hr/dashboard" : "/employee/dashboard";

  return (
    <section className="relative split-gradient overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(147,150,255,0.18),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(158,0,180,0.14),transparent_60%)] mix-blend-overlay"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full bg-tertiary blur-[140px] opacity-40"
      />
      <div
        aria-hidden="true"
        className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-primary blur-[120px] opacity-50"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(transparent_96%,rgba(255,255,255,0.06)_96%),linear-gradient(90deg,transparent_96%,rgba(255,255,255,0.06)_96%)] bg-[size:32px_32px] opacity-30 pointer-events-none"
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 pt-16 pb-24 lg:pt-28 lg:pb-36">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="max-w-3xl text-on-primary">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Every receipt reviewed. Every decision yours.
            </span>

            <div className="mt-6 flex items-center gap-4">
              <Image
                src="/images/logo.svg"
                alt="Reclaim Logo"
                width={64}
                height={64}
                className="w-14 h-14 lg:w-16 lg:h-16 object-contain brightness-0 invert"
                priority
              />
              <span className="font-headline text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight">
                Reclaim.
              </span>
            </div>

            <h1 className="mt-6 font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
              AI-assisted expense reimbursement
              <br className="hidden sm:block" /> with intelligent decision support.
            </h1>

            <p className="mt-6 max-w-2xl text-base sm:text-lg opacity-90 font-light leading-relaxed">
              Reclaim places an intelligent compliance agent between receipt upload and HR review.
              OCR extracts every line. A LangGraph agent reasons against your active policy.
              HR opens a pre-classified triage queue — not a stack of attachments.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="#demo"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-on-primary text-primary rounded-full text-base font-bold shadow-ambient-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Try the Demo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/40 text-on-primary rounded-full text-base font-semibold hover:bg-white/10 transition-colors"
              >
                How it works
                <ChevronDown className="w-4 h-4" />
              </a>
              {user && (
                <Link
                  href={dashHref}
                  className="inline-flex items-center gap-2 px-5 py-3 text-on-primary text-sm font-semibold underline underline-offset-4 decoration-white/40 hover:decoration-white transition-colors"
                >
                  Already signed in — go to dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          <div className="relative hidden lg:flex items-center justify-end">
            <div className="relative h-[520px] w-full">
              <Image
                src="/images/18.png"
                alt="Platform screenshot"
                width={480}
                height={600}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-auto h-[440px] rounded-2xl shadow-2xl shadow-black/40 object-cover z-10"
                priority
              />
              <Image
                src="/images/19.png"
                alt="Platform screenshot"
                width={480}
                height={600}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-auto h-[440px] rounded-2xl shadow-2xl shadow-black/40 object-cover z-20"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

const PRODUCT_LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#triage", label: "Triage" },
  { href: "#features", label: "Features" },
  { href: "#demo", label: "Demo" },
];

const TECH_STACK = [
  "PayPal Payouts",
  "Next.js 16",
  "FastAPI",
  "LangGraph",
  "PostgreSQL + pgvector",
  "AG Grid",
  "Three.js",
  "Qwen3.5-Flash",
  "Gemini 3.1 Flash Lite",
];

export default function Footer() {
  return (
    <footer className="bg-white px-5 pb-10 pt-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 border-t border-on-surface/[0.08] pt-12 md:grid-cols-[2fr_1fr_1.4fr]">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <Image src="/images/logo.svg" alt="" width={26} height={26} className="h-[26px] w-[26px]" />
              <span className="font-headline text-[19px] font-semibold tracking-[-0.03em] text-on-surface" translate="no">
                Reclaim<span className="text-accent">.</span>
              </span>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-on-surface-variant">
              AI-reasoned reimbursements, paid via PayPal.
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="text-[13px] font-semibold text-on-surface">Product</h2>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-[14px] text-on-surface-variant transition-colors hover:text-on-surface">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <Link href="/login" className="text-[14px] text-on-surface-variant transition-colors hover:text-on-surface">
                  Sign In
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="text-[13px] font-semibold text-on-surface">Built With</h2>
            <ul className="mt-4 flex flex-wrap gap-x-2 gap-y-1.5">
              {TECH_STACK.map((t) => (
                <li key={t} className="text-[13px] text-on-surface-variant after:ml-2 after:text-on-surface/20 after:content-['·'] last:after:content-none" translate="no">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 text-[13px] text-on-surface-variant sm:flex-row">
          <p>© 2026 Reclaim · MVP v1.0</p>
          <a
            href="https://github.com/zsh-sage/reclaim"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-on-surface"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            View on GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

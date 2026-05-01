"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Menu, X } from "lucide-react";
import type { User } from "@/lib/api/types";

const NAV_LINKS = [
  { href: "#problem", label: "Problem" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#demo", label: "Demo" },
];

export default function Header({ user }: { user: User | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dashHref = user?.role === "HR" ? "/hr/dashboard" : "/employee/dashboard";
  const ctaLabel = user
    ? user.role === "HR"
      ? "Go to HR Dashboard"
      : "Go to Dashboard"
    : "Sign In";
  const ctaHref = user ? dashHref : "/login";

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-surface/80 backdrop-blur-xl border-b border-surface-container-high/60 shadow-ambient"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between px-5 sm:px-8 lg:px-12 h-16 lg:h-20">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/logo.svg"
            alt="Reclaim"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
            priority
          />
          <span className="font-headline text-xl lg:text-2xl font-black tracking-tighter text-on-surface">
            Reclaim<span className="text-primary">.</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dim text-white rounded-full text-sm font-semibold shadow-ambient hover:shadow-[0_0_24px_rgba(70,71,211,0.35)] transition-shadow"
          >
            {ctaLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="lg:hidden p-2 rounded-lg text-on-surface hover:bg-surface-container-high"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-surface-container-high bg-surface-container-lowest/95 backdrop-blur-xl">
          <nav className="flex flex-col px-5 py-4 gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                {l.label}
              </a>
            ))}
            <Link
              href={ctaHref}
              onClick={() => setMobileOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-1.5 px-5 py-3 bg-gradient-to-r from-primary to-primary-dim text-white rounded-full text-sm font-semibold"
            >
              {ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

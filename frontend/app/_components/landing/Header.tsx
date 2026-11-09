"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Menu, X } from "lucide-react";
import type { User } from "@/lib/api/types";
import { btn } from "@/components/ui/styles";

const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#triage", label: "Triage" },
  { href: "#features", label: "Features" },
  { href: "#demo", label: "Demo" },
];

export default function Header({ user }: { user: User | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [onDark, setOnDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Swap to dark glass while the pill (≈ y 40px) sits over a dark surface.
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const dark = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-dark]")).some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= 40 && r.bottom >= 40;
      });
      setOnDark(dark);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const dashHref = user?.role === "HR" ? "/hr/dashboard" : "/employee/dashboard";

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
      <div
        className={`mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full pl-4 pr-2 ring-1 ring-inset backdrop-blur-xl backdrop-saturate-150 transition-[box-shadow,background-color] duration-300 sm:pl-5 ${
          onDark
            ? "bg-[#1a1a36]/60 ring-white/15 shadow-[0_8px_32px_-12px_rgb(0_0_0/0.6)]"
            : scrolled
              ? "bg-white/75 ring-white/70 shadow-[0_0_0_1px_rgb(20_20_43/0.06),0_8px_32px_-12px_rgb(20_20_43/0.25)]"
              : "bg-white/55 ring-white/70 shadow-[0_0_0_1px_rgb(20_20_43/0.06),0_1px_2px_rgb(20_20_43/0.04)]"
        }`}
      >
        <Link href="/" className="flex items-center gap-2 rounded-full" aria-label="Reclaim home">
          <Image src="/images/logo.svg" alt="" width={26} height={26} className="h-[26px] w-[26px]" priority />
          <span
            className={`font-headline text-[19px] font-semibold tracking-[-0.03em] transition-colors duration-300 ${onDark ? "text-white" : "text-on-surface"}`}
            translate="no"
          >
            Reclaim<span className="text-accent">.</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors duration-300 ${
                onDark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-on-surface/70 hover:bg-on-surface/5 hover:text-on-surface"
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-1.5 lg:flex">
          {user ? (
            <Link href={dashHref} className={`${onDark ? btn.onDark : btn.dark} ${btn.sm}`}>
              Open Dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link href="/login" className={`${btn.ghost} h-9 ${onDark ? "text-white/70 hover:bg-white/10 hover:text-white" : ""}`}>
                Sign In
              </Link>
              <Link href="/login?demo=employee" className={`${onDark ? btn.onDark : btn.dark} ${btn.sm}`}>
                Try Live Demo
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors lg:hidden ${
            onDark ? "text-white hover:bg-white/10" : "text-on-surface hover:bg-on-surface/5"
          }`}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card mx-auto mt-2 max-w-6xl origin-top overflow-hidden overscroll-contain rounded-3xl border border-white/60 p-2 shadow-ambient-lg lg:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-2xl px-4 py-3 text-[15px] font-medium text-on-surface transition-colors hover:bg-on-surface/5"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 p-1">
                <Link href={user ? dashHref : "/login"} onClick={() => setMobileOpen(false)} className={btn.secondary}>
                  {user ? "Dashboard" : "Sign In"}
                </Link>
                <Link href="/login?demo=employee" onClick={() => setMobileOpen(false)} className={btn.dark}>
                  Live Demo
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

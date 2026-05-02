"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
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
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
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

        <motion.nav
          className="hidden lg:flex items-center gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded px-1"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </motion.nav>

        <motion.div
          className="hidden lg:flex items-center"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dim text-white rounded-full text-sm font-semibold shadow-ambient hover:shadow-[0_0_24px_rgba(70,71,211,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
          >
            {ctaLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="lg:hidden p-2 rounded-lg text-on-surface hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="lg:hidden border-t border-surface-container-high bg-surface-container-lowest/95 backdrop-blur-xl overflow-hidden"
        >
          <nav className="flex flex-col px-5 py-4 gap-1">
            {NAV_LINKS.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                {l.label}
              </motion.a>
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
        </motion.div>
      )}
    </motion.header>
  );
}

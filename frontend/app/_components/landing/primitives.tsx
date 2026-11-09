"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Single, quiet entrance used by every section — one motion language. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  lede,
  align = "left",
  dark = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  dark?: boolean;
}) {
  const center = align === "center";
  return (
    <Reveal className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p className={`text-[14px] font-medium ${dark ? "text-white/50" : "text-primary"}`}>{eyebrow}</p>
      )}
      <h2
        className={`mt-3 text-balance font-headline text-[34px] font-medium leading-[1.06] tracking-[-0.035em] sm:text-[46px] ${
          dark ? "text-white" : "text-on-surface"
        }`}
      >
        {title}
      </h2>
      {lede && (
        <p
          className={`mt-5 text-pretty text-[17px] leading-relaxed ${center ? "mx-auto" : ""} max-w-xl ${
            dark ? "text-white/60" : "text-on-surface-variant"
          }`}
        >
          {lede}
        </p>
      )}
    </Reveal>
  );
}

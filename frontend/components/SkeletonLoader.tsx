"use client";

import React from "react";

// ── Pulse base ────────────────────────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-surface-container-high rounded-xl ${className}`}
    />
  );
}

// ── Stat card (KPI / summary card) ───────────────────────────────────────────

export function SkeletonStatCard() {
  return (
    <div className="bg-surface-container-low rounded-2xl p-5 flex flex-col gap-3 shadow-[0_4px_20px_-4px_rgba(44,47,49,0.06)]">
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="h-8 w-32 rounded-lg" />
      <Skeleton className="h-3 w-16 rounded-full" />
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-t border-outline-variant/5">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className={`h-4 rounded-full ${i === 0 ? "w-24" : i === cols - 1 ? "w-16" : "w-full"}`} />
        </td>
      ))}
    </tr>
  );
}

// ── List card (mobile / sidebar card) ────────────────────────────────────────

export function SkeletonListCard() {
  return (
    <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="h-3 w-24 rounded-full" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full shrink-0" />
    </div>
  );
}

// ── Dashboard page skeleton ───────────────────────────────────────────────────

export function DashboardPageSkeleton() {
  return (
    <main className="min-h-dvh pb-24 md:pb-12 bg-surface">
      <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-2">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-full" />
        </div>

        {/* Stat cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>

        {/* Table card */}
        <div className="bg-surface-container-low rounded-2xl p-4 md:p-6">
          <div className="flex justify-between items-center mb-5">
            <Skeleton className="h-6 w-36 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-outline-variant/10">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container-low">
                  {["w-20", "w-24", "w-32", "w-28", "w-20", "w-20"].map((w, i) => (
                    <th key={i} className="p-4">
                      <Skeleton className={`h-3 ${w} rounded-full`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonListCard key={i} />)}
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Generic page skeleton (history, settings, policy, etc.) ──────────────────

export function GenericPageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <main className="min-h-dvh pb-24 md:pb-12 bg-surface">
      <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-2">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-full" />
        </div>

        {/* Filter / search bar */}
        <div className="flex gap-3 mb-6">
          <Skeleton className="h-10 flex-1 max-w-xs rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>

        {/* Content list */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: rows }).map((_, i) => <SkeletonListCard key={i} />)}
        </div>
      </div>
    </main>
  );
}

// ── Claims / form page skeleton ───────────────────────────────────────────────

export function ClaimsPageSkeleton() {
  return (
    <main className="min-h-dvh pb-24 md:pb-12 bg-surface">
      <div className="w-full max-w-screen-xl mx-auto px-4 md:px-6 pt-6 md:pt-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-56 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded-full" />
        </div>

        {/* Category selector */}
        <Skeleton className="h-14 w-full rounded-2xl" />

        {/* Upload area */}
        <div className="flex flex-col lg:flex-row gap-5" style={{ minHeight: 360 }}>
          <div className="lg:w-72 flex flex-col gap-3">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <Skeleton className="flex-1 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}

// ── HR Review / View page skeleton ───────────────────────────────────────────

export function ReviewPageSkeleton() {
  return (
    <main className="min-h-dvh pb-24 md:pb-12 bg-surface">
      <div className="w-full max-w-screen-xl mx-auto px-4 md:px-6 pt-6 md:pt-8 flex flex-col gap-6">

        {/* Back + header */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-7 w-40 rounded-lg" />
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <div className="lg:w-80 flex flex-col gap-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </main>
  );
}

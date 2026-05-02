"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  History,
  ClipboardList,
  Settings,
  LifeBuoy,
  LogOut,
} from "lucide-react";
import { getDraftCount } from "@/lib/actions/claims";

const NAV_LINKS = [
  { href: "/employee/dashboard", label: "Dashboard",    icon: LayoutDashboard },
  { href: "/employee/claims",    label: "Upload Claim", icon: FileText         },
  { href: "/employee/history",   label: "History",      icon: History          },
  { href: "/employee/drafts",    label: "Drafts",       icon: ClipboardList    },
  { href: "/employee/settings",  label: "Settings",     icon: Settings         },
];

export default function SideNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    getDraftCount().then(count => setDraftCount(count));
  }, [pathname]); // refresh on navigation

  return (
    <nav
      aria-label="Desktop sidebar"
      className="hidden lg:flex flex-col w-64 shrink-0 h-screen bg-surface-container-low border-r border-outline-variant/10 shadow-[1px_0_20px_rgba(44,47,49,0.04)]"
    >
      <div className="flex flex-col h-full p-4">

        {/* ── Brand ─────────────────────────────────── */}
        <div className="px-4 py-5 mb-3">
          <div className="flex items-center gap-2.5">
            <Image src="/images/logo.svg" alt="Reclaim Logo" width={28} height={28} className="w-7 h-7 object-contain" />
            <h1 className="font-headline font-black text-xl text-primary tracking-tight">
              Reclaim
            </h1>
          </div>
          <p className="font-body text-xs font-medium text-on-surface-variant mt-1.5 leading-tight">
            Employee Portal
          </p>
          <p className="font-body text-[10px] text-primary/70 mt-1 font-medium italic">
            From receipt to reimbursement — in minutes, not days
          </p>
        </div>

        {/* ── Navigation Links ──────────────────────── */}
        <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            const isDrafts = label === "Drafts";
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm transition-all duration-200 active:scale-[0.97] ${
                  isActive
                    ? "bg-surface-container font-bold text-primary"
                    : "font-medium text-on-surface hover:bg-surface-container/60 hover:text-on-surface"
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    isActive ? "text-primary" : "text-on-surface-variant"
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                {label}
                {isDrafts && draftCount > 0 && (
                  <span className="ml-auto bg-primary text-on-primary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                    {draftCount > 9 ? "9+" : draftCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* ── Bottom: User + Utility ────────────────── */}
        <div className="mt-auto pt-4 border-t border-outline-variant/10">
          {/* User identity chip */}
          <div className="flex items-center gap-3 px-4 py-3 mb-1 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary-container to-tertiary-container shrink-0 flex items-center justify-center font-headline font-bold text-sm text-on-primary-container border-2 border-surface-container-lowest shadow-sm">
              {user?.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body font-semibold text-sm text-on-surface truncate leading-tight">
                {user?.name ?? "Employee"}
              </p>
              <p className="font-body text-[11px] text-on-surface-variant truncate">
                {user?.department_name ?? "General"}
              </p>
            </div>
          </div>

          <Link
            href="/employee/support"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm transition-all duration-200 hover:translate-x-0.5 active:scale-[0.97] ${
              pathname.startsWith("/employee/support")
                ? "bg-surface-container font-bold text-primary"
                : "font-medium text-on-surface hover:bg-surface-container/50"
            }`}
          >
            <LifeBuoy
              className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                pathname.startsWith("/employee/support") ? "text-primary" : "text-on-surface-variant"
              }`}
              strokeWidth={pathname.startsWith("/employee/support") ? 2.5 : 1.75}
            />
            Support
          </Link>

          <button
            id="sidenav-logout-btn"
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm font-medium text-on-surface hover:bg-error/10 hover:text-error group transition-all hover:translate-x-0.5 active:scale-[0.97]"
          >
            <LogOut
              className="w-[18px] h-[18px] text-on-surface-variant group-hover:text-error transition-colors"
              strokeWidth={1.75}
            />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

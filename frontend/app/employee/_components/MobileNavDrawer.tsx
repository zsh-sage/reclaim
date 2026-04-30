"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import {
  Settings,
  LifeBuoy,
  LogOut,
  X,
} from "lucide-react";

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Auto-close on route change
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isSettingsActive = pathname === "/employee/settings" || pathname.startsWith("/employee/settings/");
  const isSupportActive = pathname === "/employee/support" || pathname.startsWith("/employee/support/");

  return (
    <div
      className={`fixed inset-0 z-[60] transition-all duration-300 ${open ? "pointer-events-auto" : "pointer-events-none opacity-0"}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Panel: fullscreen on mobile, slide-out on tablet */}
      <nav
        className={`absolute top-0 left-0 bottom-0 w-full md:w-[280px] md:max-w-[80vw] bg-surface-container-low border-r border-outline-variant/10 shadow-[1px_0_20px_rgba(44,47,49,0.04)] flex flex-col h-full p-4 md:p-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Close + Brand */}
        <div className="flex items-center justify-between px-4 py-3 mb-2">
          <div className="flex items-center gap-2.5">
            <Image src="/images/logo.svg" alt="Reclaim Logo" width={28} height={28} className="w-7 h-7 object-contain" />
            <h1 className="font-headline font-black text-xl text-primary tracking-tight">
              Reclaim
            </h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-container transition-all"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5 text-on-surface" strokeWidth={2} />
          </button>
        </div>

        <p
          className="font-body text-xs font-medium text-on-surface-variant px-4 mb-6 leading-tight transition-all duration-300"
          style={{ transitionDelay: open ? "40ms" : "0ms", opacity: open ? 1 : 0, transform: open ? "translateY(0)" : "translateY(8px)" }}
        >
          Employee Portal
        </p>

        {/* User identity chip */}
        <div
          className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-surface-container/50 transition-all duration-300"
          style={{ transitionDelay: open ? "80ms" : "0ms", opacity: open ? 1 : 0, transform: open ? "translateY(0)" : "translateY(8px)" }}
        >
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary-container to-tertiary-container shrink-0 flex items-center justify-center font-headline font-bold text-base text-on-primary-container border-2 border-surface-container-lowest shadow-sm">
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

        {/* Links: only items NOT in the bottom nav */}
        <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
          <Link
            href="/employee/settings"
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm transition-all duration-200 active:scale-[0.97] ${
              isSettingsActive
                ? "bg-surface-container font-bold text-primary"
                : "font-medium text-on-surface hover:bg-surface-container/60 hover:text-on-surface"
            }`}
            style={{ transitionDelay: open ? "120ms" : "0ms", opacity: open ? 1 : 0, transform: open ? "translateY(0)" : "translateY(8px)" }}
          >
            <Settings
              className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                isSettingsActive ? "text-primary" : "text-on-surface-variant"
              }`}
              strokeWidth={isSettingsActive ? 2.5 : 1.75}
            />
            Settings
          </Link>

          <Link
            href="/employee/support"
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm transition-all duration-200 active:scale-[0.97] ${
              isSupportActive
                ? "bg-surface-container font-bold text-primary"
                : "font-medium text-on-surface hover:bg-surface-container/60 hover:text-on-surface"
            }`}
            style={{ transitionDelay: open ? "160ms" : "0ms", opacity: open ? 1 : 0, transform: open ? "translateY(0)" : "translateY(8px)" }}
          >
            <LifeBuoy
              className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                isSupportActive ? "text-primary" : "text-on-surface-variant"
              }`}
              strokeWidth={isSupportActive ? 2.5 : 1.75}
            />
            Support
          </Link>
        </div>

        {/* Bottom: Logout */}
        <div
          className="mt-auto pt-4 border-t border-outline-variant/10 transition-all duration-300"
          style={{ transitionDelay: open ? "200ms" : "0ms", opacity: open ? 1 : 0, transform: open ? "translateY(0)" : "translateY(8px)" }}
        >
          <button
            id="drawer-logout-btn"
            onClick={() => { logout(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm font-medium text-on-surface hover:bg-error/10 hover:text-error group transition-all hover:translate-x-0.5 active:scale-[0.97]"
          >
            <LogOut
              className="w-[18px] h-[18px] text-on-surface-variant group-hover:text-error transition-colors"
              strokeWidth={1.75}
            />
            Logout
          </button>
        </div>
      </nav>
    </div>
  );
}

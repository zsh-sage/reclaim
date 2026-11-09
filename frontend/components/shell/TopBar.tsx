"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronRight, HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import NotificationsMenu from "./NotificationsMenu";
import { isActivePath, type NavLink } from "./types";

export default function TopBar({
  portal,
  links,
  helpHref,
  settingsHref,
  actions,
}: {
  portal: string;
  links: NavLink[];
  helpHref: string;
  settingsHref: string;
  actions?: ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const current =
    links.find((l) => isActivePath(pathname, l.href))?.label ??
    (isActivePath(pathname, helpHref) ? "Help & Support" : null);

  return (
    <header
      aria-label="Top navigation"
      className="sticky top-0 z-50 border-b border-on-surface/[0.06] bg-white/75 pt-safe-top backdrop-blur-xl backdrop-saturate-150"
    >
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6 md:h-16 lg:px-10">
        {/* Mobile brand */}
        <Link href={links[0]?.href ?? "/"} className="flex items-center gap-2 rounded-full lg:hidden">
          <Image src="/images/logo.svg" alt="" width={24} height={24} className="h-6 w-6" />
          <span className="font-headline text-[18px] font-semibold tracking-[-0.03em] text-on-surface" translate="no">
            Reclaim<span className="text-accent">.</span>
          </span>
        </Link>

        {/* Desktop breadcrumb */}
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[14px] lg:flex">
          <span className="text-on-surface-variant">{portal}</span>
          {current && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant/50" aria-hidden="true" />
              <span className="truncate font-medium text-on-surface" aria-current="page">{current}</span>
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:gap-1.5">
          {actions}
          <NotificationsMenu cacheKey={user?.user_id ?? "anon"} />
          <Link
            id="topnav-help-btn"
            href={helpHref}
            aria-label="Help & Support"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface/[0.04] hover:text-on-surface sm:inline-flex"
          >
            <HelpCircle className="h-[19px] w-[19px]" strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link
            id="topnav-profile-btn"
            href={settingsHref}
            onClick={(e) => {
              if (window.innerWidth < 1024) {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent("open-mobile-nav-drawer"));
              }
            }}
            aria-label="Account and settings"
            className="ml-1 rounded-full transition-transform hover:scale-105"
          >
            <Avatar name={user?.name ?? "User"} />
          </Link>
        </div>
      </div>
    </header>
  );
}

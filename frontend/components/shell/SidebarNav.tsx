"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LifeBuoy, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { isActivePath, type NavLink } from "./types";

function Item({ link, active }: { link: NavLink; active: boolean }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] transition-colors duration-150 ${
        active
          ? "bg-primary/[0.08] font-semibold text-primary"
          : "font-medium text-on-surface/75 hover:bg-on-surface/[0.04] hover:text-on-surface"
      }`}
    >
      {active && (
        <span aria-hidden="true" className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
      )}
      <Icon
        className={`h-[18px] w-[18px] shrink-0 ${active ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface"}`}
        strokeWidth={active ? 2.25 : 1.75}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate">{link.label}</span>
      {!!link.badge && link.badge > 0 && (
        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white tabular-nums">
          {link.badge > 9 ? "9+" : link.badge}
        </span>
      )}
    </Link>
  );
}

export default function SidebarNav({
  portal,
  links,
  supportHref,
}: {
  portal: string;
  links: NavLink[];
  supportHref: string;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sidebar"
      className="hidden h-screen w-[260px] shrink-0 flex-col border-r border-on-surface/[0.06] bg-white lg:flex"
    >
      <div className="flex h-16 items-center gap-2.5 px-5">
        <Image src="/images/logo.svg" alt="" width={26} height={26} className="h-[26px] w-[26px]" />
        <span className="font-headline text-[19px] font-semibold tracking-[-0.03em] text-on-surface" translate="no">
          Reclaim<span className="text-accent">.</span>
        </span>
        <span className="ml-auto rounded-full bg-marshmallow px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
          {portal}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 pt-3">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">
          Workspace
        </p>
        <div className="flex flex-col gap-0.5">
          {links.map((l) => (
            <Item key={l.href} link={l} active={isActivePath(pathname, l.href)} />
          ))}
        </div>
      </div>

      <div className="border-t border-on-surface/[0.06] p-3">
        <Item
          link={{ href: supportHref, label: "Help & Support", icon: LifeBuoy }}
          active={isActivePath(pathname, supportHref)}
        />
        <div className="mt-2 flex items-center gap-3 rounded-[14px] bg-marshmallow/70 p-2.5">
          <Avatar name={user?.name ?? "User"} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold text-on-surface">{user?.name ?? "—"}</p>
            <p className="truncate text-[12px] text-on-surface-variant">{user?.department_name ?? user?.email ?? "General"}</p>
          </div>
          <button
            type="button"
            id="sidenav-logout-btn"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}

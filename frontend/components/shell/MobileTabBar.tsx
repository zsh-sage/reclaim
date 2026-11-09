"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TabBar } from "glisse";
import { isActivePath, type NavLink } from "./types";

/**
 * Floating iOS-26-style Liquid Glass tab bar (glisse). Each tab is a real
 * <Link>, so middle-click / long-press / keyboard all work as navigation.
 */
export default function MobileTabBar({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const active = links.find((l) => isActivePath(pathname, l.href))?.href ?? null;
  const width = links.length >= 5 ? "64px" : "76px";

  return (
    <nav
      aria-label="Mobile navigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="pointer-events-auto rounded-full shadow-[0_12px_40px_-12px_rgb(20_20_43/0.35)]">
        <TabBar
          aria-label="Sections"
          link={Link}
          value={active}
          style={{ ["--lg-tab-width" as string]: width, ["--lg-glass" as string]: "rgb(255 255 255 / 0.7)" }}
          items={links.map((l) => {
            const Icon = l.icon;
            return {
              value: l.href,
              href: l.href,
              label: l.label,
              icon: (
                <span className="relative flex">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden="true" />
                  {!!l.badge && l.badge > 0 && (
                    <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                      {l.badge > 9 ? "9+" : l.badge}
                    </span>
                  )}
                </span>
              ),
            };
          })}
        />
      </div>
    </nav>
  );
}

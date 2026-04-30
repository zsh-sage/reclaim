"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileSliders, History, Settings } from "lucide-react";
import MobileNavDrawer from "./MobileNavDrawer";

const NAV_ITEMS = [
  { href: "/hr/dashboard", label: "Home",    icon: Home         },
  { href: "/hr/policy",    label: "Policy",  icon: FileSliders  },
  { href: "/hr/history",   label: "History", icon: History      },
  { href: "/hr/settings",  label: "Settings", icon: Settings    },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Listen for TopNav avatar click (mobile only)
  useEffect(() => {
    const handler = () => {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setDrawerOpen(true);
      }
    };
    window.addEventListener("open-mobile-nav-drawer", handler);
    return () => window.removeEventListener("open-mobile-nav-drawer", handler);
  }, []);

  return (
    <>
      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* FAB exception: `fixed` is allowed here per layout constraints */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/85 backdrop-blur-2xl border-t border-outline-variant/10 rounded-t-3xl shadow-[0_-8px_32px_rgba(0,0,0,0.06)]"
      >
        <div className="flex justify-between items-center px-2 h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);

            const content = (
              <>
                <Icon
                  className="w-[22px] h-[22px]"
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                <span className="text-[10px] font-label font-semibold uppercase tracking-wider whitespace-nowrap max-w-[64px] overflow-hidden text-ellipsis">
                  {label}
                </span>
              </>
            );

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? "text-primary bg-primary/10 scale-110"
                    : "text-on-surface/50 hover:text-on-surface"
                }`}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

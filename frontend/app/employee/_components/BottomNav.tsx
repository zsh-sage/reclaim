"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Upload, History, ClipboardList, Settings } from "lucide-react";
import { getDraftCount } from "@/lib/actions/claims";
import MobileNavDrawer from "./MobileNavDrawer";

const NAV_ITEMS = [
  { href: "/employee/dashboard", label: "Home",    icon: Home         },
  { href: "/employee/drafts",    label: "Drafts",  icon: ClipboardList },
  { href: "/employee/claims",    label: "Upload",  icon: Upload       },
  { href: "/employee/history",   label: "History", icon: History      },
  { href: "/employee/settings",  label: "Settings", icon: Settings    },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [draftCount, setDraftCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hide while the camera modal is open (CameraModal adds/removes this class)
  const [cameraOpen, setCameraOpen] = useState(false);
  useEffect(() => {
    const check = () => setCameraOpen(document.body.classList.contains("camera-open"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Fetch draft count
  useEffect(() => {
    getDraftCount().then(count => setDraftCount(count));
  }, [pathname]);

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

  if (cameraOpen) return null;

  return (
    <>
      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* FAB exception: `fixed` is allowed here per layout constraints */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/85 backdrop-blur-2xl border-t border-outline-variant/10 rounded-t-3xl shadow-[0_-8px_32px_rgba(0,0,0,0.06)] pb-safe"
      >
        <div className="flex justify-between items-center px-2 h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            const isDrafts = label === "Drafts";
            const isUpload = label === "Upload";

            const content = (
              <>
                <Icon
                  className={`${isUpload ? "w-7 h-7" : "w-[22px] h-[22px]"} ${isUpload && !isActive ? "text-primary" : ""}`}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                <span className={`text-[10px] font-label font-semibold uppercase tracking-wider whitespace-nowrap max-w-[64px] overflow-hidden text-ellipsis ${isUpload && !isActive ? "text-primary" : ""}`}>
                  {label}
                </span>
                {isDrafts && draftCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-on-primary text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {draftCount > 9 ? "9+" : draftCount}
                  </span>
                )}
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

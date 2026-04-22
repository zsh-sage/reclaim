"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Upload, History, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/employee/dashboard", label: "Home",         icon: Home    },
  { href: "/employee/claims",    label: "Upload Claim", icon: Upload  },
  { href: "/employee/history",   label: "History",      icon: History },
  { href: "/employee/settings",   label: "Profile",      icon: User    },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide while the camera modal is open (CameraModal adds/removes this class)
  const [cameraOpen, setCameraOpen] = useState(false);
  useEffect(() => {
    const check = () => setCameraOpen(document.body.classList.contains("camera-open"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  if (cameraOpen) return null;

  return (
    /* FAB exception: `fixed` is allowed here per layout constraints */
    <nav
      aria-label="Mobile bottom navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/85 backdrop-blur-2xl border-t border-outline-variant/10 rounded-t-3xl shadow-[0_-8px_32px_rgba(0,0,0,0.06)]"
    >
      <div className="flex justify-around items-center px-2 py-3 h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 px-5 py-2 rounded-2xl transition-all duration-200 ${
                isActive
                  ? "text-primary bg-primary/10 scale-110"
                  : "text-on-surface/50 hover:text-on-surface"
              }`}
            >
              <Icon
                className="w-[22px] h-[22px]"
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span className="text-[10px] font-label font-semibold uppercase tracking-wider">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

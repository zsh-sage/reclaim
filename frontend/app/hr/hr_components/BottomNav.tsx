"use client";

import { useEffect, useState } from "react";
import { Home, FileSliders, History, Settings } from "lucide-react";
import MobileTabBar from "@/components/shell/MobileTabBar";
import MobileNavDrawer from "./MobileNavDrawer";

export default function BottomNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // TopBar avatar (mobile) opens the drawer
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth < 1024) setDrawerOpen(true);
    };
    window.addEventListener("open-mobile-nav-drawer", handler);
    return () => window.removeEventListener("open-mobile-nav-drawer", handler);
  }, []);

  return (
    <>
      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <MobileTabBar
        links={[
          { href: "/hr/dashboard", label: "Home", icon: Home },
          { href: "/hr/policy", label: "Policy", icon: FileSliders },
          { href: "/hr/history", label: "History", icon: History },
          { href: "/hr/settings", label: "Settings", icon: Settings },
        ]}
      />
    </>
  );
}

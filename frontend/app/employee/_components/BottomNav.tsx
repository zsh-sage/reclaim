"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Home, Upload, History, ClipboardList, Settings } from "lucide-react";
import { getDraftCount } from "@/lib/actions/claims";
import MobileTabBar from "@/components/shell/MobileTabBar";
import MobileNavDrawer from "./MobileNavDrawer";

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

  useEffect(() => {
    getDraftCount().then((count) => setDraftCount(count));
  }, [pathname]);

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
      {!cameraOpen && (
        <MobileTabBar
          links={[
            { href: "/employee/dashboard", label: "Home", icon: Home },
            { href: "/employee/drafts", label: "Drafts", icon: ClipboardList, badge: draftCount },
            { href: "/employee/claims", label: "Upload", icon: Upload },
            { href: "/employee/history", label: "History", icon: History },
            { href: "/employee/settings", label: "Settings", icon: Settings },
          ]}
        />
      )}
    </>
  );
}

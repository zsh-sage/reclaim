"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, History, ClipboardList, Settings } from "lucide-react";
import { getDraftCount } from "@/lib/actions/claims";
import SidebarNav from "@/components/shell/SidebarNav";

export default function SideNav() {
  const pathname = usePathname();
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    getDraftCount().then((count) => setDraftCount(count));
  }, [pathname]); // refresh on navigation

  return (
    <SidebarNav
      portal="Employee"
      supportHref="/employee/support"
      links={[
        { href: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/employee/claims", label: "Upload Claim", icon: FileText },
        { href: "/employee/history", label: "History", icon: History },
        { href: "/employee/drafts", label: "Drafts", icon: ClipboardList, badge: draftCount },
        { href: "/employee/settings", label: "Settings", icon: Settings },
      ]}
    />
  );
}

"use client";

import Link from "next/link";
import { Plus, LayoutDashboard, FileText, History, ClipboardList, Settings } from "lucide-react";
import TopBar from "@/components/shell/TopBar";
import { btn } from "@/components/ui/styles";

const LINKS = [
  { href: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employee/claims", label: "Upload Claim", icon: FileText },
  { href: "/employee/history", label: "History", icon: History },
  { href: "/employee/drafts", label: "Drafts", icon: ClipboardList },
  { href: "/employee/settings", label: "Settings", icon: Settings },
];

export default function TopNav() {
  return (
    <TopBar
      portal="Employee"
      links={LINKS}
      helpHref="/employee/support"
      settingsHref="/employee/settings"
      actions={
        <Link
          id="topnav-upload-claim-btn"
          href="/employee/claims"
          className={`${btn.primary} ${btn.sm} mr-1 max-md:hidden`}
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
          New Claim
        </Link>
      }
    />
  );
}

"use client";

import { LayoutDashboard, FileSliders, History, Settings, Users } from "lucide-react";
import SidebarNav from "@/components/shell/SidebarNav";

export const HR_LINKS = [
  { href: "/hr/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hr/policy", label: "Policy Studio", icon: FileSliders },
  { href: "/hr/manage_employee", label: "Employees", icon: Users },
  { href: "/hr/history", label: "History", icon: History },
  { href: "/hr/settings", label: "Settings", icon: Settings },
];

export default function SideNav() {
  return <SidebarNav portal="HR" supportHref="/hr/support" links={HR_LINKS} />;
}

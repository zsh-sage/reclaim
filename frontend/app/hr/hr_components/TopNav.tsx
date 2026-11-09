"use client";

import TopBar from "@/components/shell/TopBar";
import { HR_LINKS } from "./SideNav";

export default function TopNav() {
  return <TopBar portal="HR" links={HR_LINKS} helpHref="/hr/support" settingsHref="/hr/settings" />;
}

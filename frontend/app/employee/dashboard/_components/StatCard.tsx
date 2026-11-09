import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { KpiCard, type KpiTone } from "@/components/ui/KpiCard";

export interface StatCardProps {
  label: string;
  value: string;
  subtext: ReactNode;
  icon: LucideIcon;
  variant: "pending" | "approved" | "paid";
  loading?: boolean;
}

const VARIANT: Record<StatCardProps["variant"], { tone: KpiTone; badge: string; badgeCls: string }> = {
  pending: { tone: "accent", badge: "In review", badgeCls: "bg-warning-container text-warning" },
  approved: { tone: "primary", badge: "Approved", badgeCls: "bg-primary-container text-on-primary-container" },
  paid: { tone: "success", badge: "Paid out", badgeCls: "bg-success-container text-on-success-container" },
};

export default function StatCard({ label, value, subtext, icon, variant, loading }: StatCardProps) {
  const v = VARIANT[variant];
  return (
    <KpiCard
      label={label}
      value={value}
      sub={subtext}
      icon={icon}
      tone={v.tone}
      loading={loading}
      badge={<span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${v.badgeCls}`}>{v.badge}</span>}
    />
  );
}

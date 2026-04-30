"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HRRoleGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "HR") {
      router.replace("/employee/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== "HR") return null;

  return <>{children}</>;
}

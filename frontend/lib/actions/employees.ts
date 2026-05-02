"use server";

import { apiGet, API_PREFIX } from "@/lib/api/client";

export interface EmployeeRecord {
  user_id: string;
  user_code: string | null;
  name: string;
  email: string;
  role: string;
  department_id: string | null;
  department_name: string | null;
  rank: number | null;
  privilege_level: string;
  is_active: boolean;
  bank_code: string | null;
  bank_account_number: string | null;
  bank_account_holder_name: string | null;
  created_at: string | null;
}

export async function getEmployees(): Promise<EmployeeRecord[]> {
  const result = await apiGet<EmployeeRecord[]>(`${API_PREFIX}/employee/`);
  return result.data ?? [];
}

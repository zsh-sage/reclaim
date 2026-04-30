import type { AiStatus, Claim } from "@/lib/api/types";

/** Derive the unique set of values for a given key across a claim list. */
export function uniqueValues<K extends keyof Claim>(claims: Claim[], key: K): string[] {
  return Array.from(new Set(claims.map((c) => String(c[key])))).sort();
}

/** Parse a dollar-string like "$1,450.00" → number */
export function parseDollar(s: string): number {
  return parseFloat(s.replace(/[$,]/g, "")) || 0;
}

export interface FilterState {
  statuses: AiStatus[];
  categories: string[];
  amountMin: string;
  amountMax: string;
}

export const EMPTY_FILTERS: FilterState = {
  statuses: [],
  categories: [],
  amountMin: "",
  amountMax: "",
};

export function countActiveFilters(f: FilterState): number {
  return (
    f.statuses.length +
    f.categories.length +
    (f.amountMin !== "" ? 1 : 0) +
    (f.amountMax !== "" ? 1 : 0)
  );
}

export function applyFilters(claims: Claim[], query: string, filters: FilterState): Claim[] {
  const q = query.toLowerCase();
  const minAmt = parseDollar(filters.amountMin);
  const maxAmt = parseDollar(filters.amountMax);

  return claims.filter((c) => {
    const matchesQuery =
      !q ||
      c.employee.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q);

    const matchesStatus =
      filters.statuses.length === 0 || filters.statuses.includes(c.status);

    const matchesCategory =
      filters.categories.length === 0 || filters.categories.includes(c.category);

    const amount = parseDollar(c.amount);
    const matchesMin = filters.amountMin === "" || amount >= minAmt;
    const matchesMax = filters.amountMax === "" || amount <= maxAmt;

    return matchesQuery && matchesStatus && matchesCategory && matchesMin && matchesMax;
  });
}

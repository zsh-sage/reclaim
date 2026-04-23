import { FileText, Shield, Archive } from "lucide-react";
import { LucideIcon } from "lucide-react";

export type PolicyStatus = "Active" | "Impending" | "Expired";

export interface Policy {
  id: string;
  name: string;
  version: string;
  department: string;
  lastModified: string;
  status: PolicyStatus;
  icon: LucideIcon;
}

export type AiStatus =
  | "Policy Flagged"
  | "Awaiting Review"
  | "Auto-Approved"
  | "Low Confidence";

export interface Claim {
  id: string;
  employee: { name: string; initials: string };
  date: string;
  amount: string;
  category: string;
  status: AiStatus;
  note?: string;
}

export interface PolicyFlag {
  id: string;
  rule: string;
  description: string;
  severity: "high" | "medium" | "low";
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
}

export interface ClaimDetail {
  id: string;
  employee: { name: string; initials: string; department: string; email: string };
  submittedAt: string;
  amount: string;
  currency: string;
  category: string;
  status: AiStatus;
  vendor: string;
  location: string;
  description: string;
  receiptUrls: string[];
  aiConfidence: number;
  aiSummary: string;
  /** AI-proposed adjusted amount when claimed amount exceeds policy. null = no adjustment suggested. */
  aiSuggestedAmount: string | null;
  policyFlags: PolicyFlag[];
  auditLog: AuditLogEntry[];
}

export interface ApprovedClaimDetail {
  id: string;
  employee: { name: string; initials: string; department: string; email: string };
  submittedAt: string;
  approvedAt: string;
  approvedBy: string;
  amount: string;
  approvedAmount: string;
  currency: string;
  category: string;
  status: AiStatus;
  vendor: string;
  location: string;
  description: string;
  receiptUrls: string[];
  aiConfidence: number;
  aiSummary: string;
  auditLog: AuditLogEntry[];
}

export const ATTENTION_CLAIMS: Claim[] = [
  {
    id: "clm-001",
    employee: { name: "Sarah Jenkins", initials: "SJ" },
    date: "Oct 24, 2023",
    amount: "$1,450.00",
    category: "Travel",
    status: "Policy Flagged",
    note: "Exceeds $1,000 travel cap",
  },
  {
    id: "clm-002",
    employee: { name: "Michael Chen", initials: "MC" },
    date: "Oct 23, 2023",
    amount: "$325.50",
    category: "Office Supplies",
    status: "Awaiting Review",
    note: "Missing receipt attachment",
  },
  {
    id: "clm-003",
    employee: { name: "Emma Larson", initials: "EL" },
    date: "Oct 22, 2023",
    amount: "$890.00",
    category: "Software Subscriptions",
    status: "Policy Flagged",
    note: "Duplicate subscription detected",
  },
  {
    id: "clm-004",
    employee: { name: "Daniel Reyes", initials: "DR" },
    date: "Oct 21, 2023",
    amount: "$2,100.00",
    category: "Client Entertainment",
    status: "Low Confidence",
    note: "AI confidence below 60%",
  },
  {
    id: "clm-005",
    employee: { name: "Priya Nair", initials: "PN" },
    date: "Oct 20, 2023",
    amount: "$640.75",
    category: "Training & Development",
    status: "Awaiting Review",
    note: "Department code mismatch",
  },
  {
    id: "clm-009",
    employee: { name: "Carlos Mendez", initials: "CM" },
    date: "Oct 19, 2023",
    amount: "$3,200.00",
    category: "Equipment",
    status: "Policy Flagged",
    note: "Exceeds equipment purchase limit",
  },
  {
    id: "clm-010",
    employee: { name: "Yuki Tanaka", initials: "YT" },
    date: "Oct 18, 2023",
    amount: "$175.00",
    category: "Meals & Entertainment",
    status: "Low Confidence",
    note: "Vendor unrecognised",
  },
  {
    id: "clm-011",
    employee: { name: "Fatima Al-Rashid", initials: "FA" },
    date: "Oct 17, 2023",
    amount: "$950.00",
    category: "Travel",
    status: "Awaiting Review",
    note: "No pre-approval on file",
  },
];

export const APPROVED_CLAIMS: Claim[] = [
  {
    id: "clm-006",
    employee: { name: "James Okafor", initials: "JO" },
    date: "Oct 24, 2023",
    amount: "$89.00",
    category: "Office Supplies",
    status: "Auto-Approved",
  },
  {
    id: "clm-007",
    employee: { name: "Liu Wei", initials: "LW" },
    date: "Oct 23, 2023",
    amount: "$210.50",
    category: "Meals & Entertainment",
    status: "Auto-Approved",
  },
  {
    id: "clm-008",
    employee: { name: "Aisha Patel", initials: "AP" },
    date: "Oct 22, 2023",
    amount: "$55.00",
    category: "Transportation",
    status: "Auto-Approved",
  },
  {
    id: "clm-012",
    employee: { name: "Noah Williams", initials: "NW" },
    date: "Oct 22, 2023",
    amount: "$340.00",
    category: "Software Subscriptions",
    status: "Auto-Approved",
  },
  {
    id: "clm-013",
    employee: { name: "Mei Lin", initials: "ML" },
    date: "Oct 21, 2023",
    amount: "$78.25",
    category: "Office Supplies",
    status: "Auto-Approved",
  },
  {
    id: "clm-014",
    employee: { name: "Samuel Adeyemi", initials: "SA" },
    date: "Oct 20, 2023",
    amount: "$120.00",
    category: "Training & Development",
    status: "Auto-Approved",
  },
  {
    id: "clm-015",
    employee: { name: "Clara Hoffmann", initials: "CH" },
    date: "Oct 19, 2023",
    amount: "$495.00",
    category: "Travel",
    status: "Auto-Approved",
  },
];

export const MOCK_CLAIMS: Record<string, ClaimDetail> = {
  "clm-001": {
    id: "clm-001",
    employee: { name: "Sarah Jenkins", initials: "SJ", department: "Marketing", email: "s.jenkins@company.com" },
    submittedAt: "Oct 24, 2023 · 2:34 PM",
    amount: "$1,450.00",
    currency: "USD",
    category: "Travel",
    status: "Policy Flagged",
    vendor: "Delta Airlines",
    location: "New York, NY → San Francisco, CA",
    description: "Round-trip flight for Q4 client presentation at Salesforce HQ.",
    receiptUrls: [
      "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=600&h=800&fit=crop",
    ],
    aiConfidence: 92,
    aiSummary: "Receipt matches airline booking. Amount exceeds the $1,000 domestic travel cap by $450. No pre-approval found on file.",
    aiSuggestedAmount: "$1,000.00",
    policyFlags: [
      { id: "pf-1", rule: "TRAVEL-CAP-001", description: "Domestic travel expenses must not exceed $1,000 without VP pre-approval.", severity: "high" },
      { id: "pf-2", rule: "PRE-APPROVE-002", description: "No matching pre-approval request found in the system.", severity: "medium" },
    ],
    auditLog: [
      { id: "al-1", timestamp: "Oct 24, 2:34 PM", actor: "Sarah Jenkins", action: "Submitted claim" },
      { id: "al-2", timestamp: "Oct 24, 2:35 PM", actor: "Reclaim AI", action: "Auto-extracted receipt data" },
      { id: "al-3", timestamp: "Oct 24, 2:35 PM", actor: "Reclaim AI", action: "Flagged: exceeds travel cap" },
      { id: "al-4", timestamp: "Oct 24, 2:36 PM", actor: "System", action: "Escalated to HR queue" },
    ],
  },
  "clm-002": {
    id: "clm-002",
    employee: { name: "Michael Chen", initials: "MC", department: "Engineering", email: "m.chen@company.com" },
    submittedAt: "Oct 23, 2023 · 10:15 AM",
    amount: "$325.50",
    currency: "USD",
    category: "Office Supplies",
    status: "Awaiting Review",
    vendor: "Staples",
    location: "Austin, TX",
    description: "Ergonomic keyboard and monitor stand for home office setup.",
    receiptUrls: [],
    aiConfidence: 78,
    aiSummary: "No receipt image attached. Item descriptions match typical office supply purchases. Amount is within policy limits.",
    aiSuggestedAmount: null,
    policyFlags: [
      { id: "pf-3", rule: "RECEIPT-REQ-001", description: "All claims over $50 require a receipt attachment.", severity: "high" },
    ],
    auditLog: [
      { id: "al-5", timestamp: "Oct 23, 10:15 AM", actor: "Michael Chen", action: "Submitted claim" },
      { id: "al-6", timestamp: "Oct 23, 10:16 AM", actor: "Reclaim AI", action: "Flagged: missing receipt" },
      { id: "al-7", timestamp: "Oct 23, 10:16 AM", actor: "System", action: "Escalated to HR queue" },
    ],
  },
  "clm-003": {
    id: "clm-003",
    employee: { name: "Emma Larson", initials: "EL", department: "Product", email: "e.larson@company.com" },
    submittedAt: "Oct 22, 2023 · 4:50 PM",
    amount: "$890.00",
    currency: "USD",
    category: "Software Subscriptions",
    status: "Policy Flagged",
    vendor: "Figma Inc.",
    location: "Online",
    description: "Annual Figma Enterprise license renewal.",
    receiptUrls: [
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=800&fit=crop",
    ],
    aiConfidence: 95,
    aiSummary: "Duplicate detected — an identical Figma subscription was renewed by the Design team on Oct 15. Possible double-billing.",
    aiSuggestedAmount: null,
    policyFlags: [
      { id: "pf-4", rule: "DUP-CHECK-001", description: "A matching subscription renewal was already processed this billing cycle.", severity: "high" },
    ],
    auditLog: [
      { id: "al-8", timestamp: "Oct 22, 4:50 PM", actor: "Emma Larson", action: "Submitted claim" },
      { id: "al-9", timestamp: "Oct 22, 4:51 PM", actor: "Reclaim AI", action: "Duplicate subscription detected" },
      { id: "al-10", timestamp: "Oct 22, 4:51 PM", actor: "System", action: "Escalated to HR queue" },
    ],
  },
};

export const MOCK_APPROVED: Record<string, ApprovedClaimDetail> = {
  "clm-006": {
    id: "clm-006",
    employee: { name: "James Okafor", initials: "JO", department: "Operations", email: "j.okafor@company.com" },
    submittedAt: "Oct 24, 2023 · 9:11 AM",
    approvedAt: "Oct 24, 2023 · 9:12 AM",
    approvedBy: "Reclaim AI",
    amount: "$89.00",
    approvedAmount: "$89.00",
    currency: "USD",
    category: "Office Supplies",
    status: "Auto-Approved",
    vendor: "Amazon Business",
    location: "Online",
    description: "Replacement USB-C hub and desk cable management kit.",
    receiptUrls: ["https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=800&fit=crop"],
    aiConfidence: 98,
    aiSummary: "Receipt matches vendor, amount is within the $150 office supplies limit, and category coding is correct. Auto-approved with high confidence.",
    auditLog: [
      { id: "al-1", timestamp: "Oct 24, 9:11 AM", actor: "James Okafor", action: "Submitted claim" },
      { id: "al-2", timestamp: "Oct 24, 9:12 AM", actor: "Reclaim AI", action: "Extracted receipt data (98% confidence)" },
      { id: "al-3", timestamp: "Oct 24, 9:12 AM", actor: "Reclaim AI", action: "All policy checks passed — auto-approved" },
    ],
  },
  "clm-007": {
    id: "clm-007",
    employee: { name: "Liu Wei", initials: "LW", department: "Sales", email: "l.wei@company.com" },
    submittedAt: "Oct 23, 2023 · 1:45 PM",
    approvedAt: "Oct 23, 2023 · 1:46 PM",
    approvedBy: "Reclaim AI",
    amount: "$210.50",
    approvedAmount: "$210.50",
    currency: "USD",
    category: "Meals & Entertainment",
    status: "Auto-Approved",
    vendor: "The Capital Grille",
    location: "Chicago, IL",
    description: "Client dinner for Q4 renewal discussion with Acme Corp.",
    receiptUrls: [
      "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=800&fit=crop",
    ],
    aiConfidence: 96,
    aiSummary: "Receipt and vendor match. Amount is within the $250 client entertainment limit. Guest count and business purpose noted. Auto-approved.",
    auditLog: [
      { id: "al-4", timestamp: "Oct 23, 1:45 PM", actor: "Liu Wei", action: "Submitted claim" },
      { id: "al-5", timestamp: "Oct 23, 1:46 PM", actor: "Reclaim AI", action: "Extracted receipt data (96% confidence)" },
      { id: "al-6", timestamp: "Oct 23, 1:46 PM", actor: "Reclaim AI", action: "All policy checks passed — auto-approved" },
    ],
  },
  "clm-008": {
    id: "clm-008",
    employee: { name: "Aisha Patel", initials: "AP", department: "HR", email: "a.patel@company.com" },
    submittedAt: "Oct 22, 2023 · 8:30 AM",
    approvedAt: "Oct 22, 2023 · 8:31 AM",
    approvedBy: "Reclaim AI",
    amount: "$55.00",
    approvedAmount: "$55.00",
    currency: "USD",
    category: "Transportation",
    status: "Auto-Approved",
    vendor: "Uber Business",
    location: "San Francisco, CA",
    description: "Rideshare to San Francisco office for all-hands meeting.",
    receiptUrls: [],
    aiConfidence: 94,
    aiSummary: "Rideshare receipt verified via Uber Business integration. Amount within $75 local transport policy. Auto-approved.",
    auditLog: [
      { id: "al-7", timestamp: "Oct 22, 8:30 AM", actor: "Aisha Patel", action: "Submitted claim" },
      { id: "al-8", timestamp: "Oct 22, 8:31 AM", actor: "Reclaim AI", action: "Verified via Uber Business API (94% confidence)" },
      { id: "al-9", timestamp: "Oct 22, 8:31 AM", actor: "Reclaim AI", action: "All policy checks passed — auto-approved" },
    ],
  },
};



export const MOCK_POLICIES: Policy[] = [
  {
    id: "remote-work",
    name: "Remote Work Guidelines",
    version: "V2.4",
    department: "IT & HR",
    lastModified: "Oct 24, 2023",
    status: "Active",
    icon: FileText,
  },
  {
    id: "data-privacy",
    name: "Data Privacy Addendum",
    version: "V1.1",
    department: "Legal",
    lastModified: "Nov 02, 2023",
    status: "Impending",
    icon: Shield,
  },
  {
    id: "office-reentry",
    name: "2022 Office Re-entry Plan",
    version: "V1.0",
    department: "Operations",
    lastModified: "Jan 15, 2022",
    status: "Expired",
    icon: Archive,
  },
  {
    id: "travel-policy",
    name: "Global Travel & Expense Policy",
    version: "V3.0",
    department: "Finance",
    lastModified: "Dec 01, 2023",
    status: "Active",
    icon: FileText,
  },
  {
    id: "it-security",
    name: "IT Security & Asset Management",
    version: "V2.1",
    department: "IT",
    lastModified: "Nov 15, 2023",
    status: "Active",
    icon: Shield,
  },
  {
    id: "employee-handbook",
    name: "2024 Employee Handbook",
    version: "V4.2",
    department: "HR",
    lastModified: "Jan 02, 2024",
    status: "Impending",
    icon: FileText,
  },
];

export const POLICY_STATUS_STYLE: Record<PolicyStatus, string> = {
  "Active": "bg-[#e6f4ea] text-[#137333]",
  "Impending": "bg-[#fef7e0] text-[#b06000]",
  "Expired": "bg-surface-container-high text-on-surface-variant",
};

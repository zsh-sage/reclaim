import { Plane, UtensilsCrossed, Monitor, FileText, Bus, Car, Hotel } from "lucide-react";
import { LucideIcon } from "lucide-react";

export type ClaimStatus = "Pending" | "Approved" | "Paid" | "Rejected";

export interface Claim {
  id: string;
  date: string;
  category: string;
  subCategory: string;
  categoryIcon: LucideIcon;
  merchant: string;
  amount: string;
  amountNumeric: number;
  status: ClaimStatus;
}

export const MOCK_HISTORY_CLAIMS: Claim[] = [
  {
    id: "#RC-8892",
    date: "Oct 24, 2023",
    category: "Travel",
    subCategory: "Flight",
    categoryIcon: Plane,
    merchant: "Delta Airlines",
    amount: "$850.00",
    amountNumeric: 850.00,
    status: "Pending",
  },
  {
    id: "#RC-8891",
    date: "Oct 22, 2023",
    category: "Meals",
    subCategory: "Lunch",
    categoryIcon: UtensilsCrossed,
    merchant: "Sweetgreen",
    amount: "$24.50",
    amountNumeric: 24.50,
    status: "Approved",
  },
  {
    id: "#RC-8885",
    date: "Oct 15, 2023",
    category: "Equipment",
    subCategory: "Laptop",
    categoryIcon: Monitor,
    merchant: "Apple Store",
    amount: "$2,450.00",
    amountNumeric: 2450.00,
    status: "Paid",
  },
  {
    id: "#RC-8880",
    date: "Oct 10, 2023",
    category: "Travel",
    subCategory: "Hotel",
    categoryIcon: Hotel,
    merchant: "Marriott",
    amount: "$450.00",
    amountNumeric: 450.00,
    status: "Approved",
  },
  {
    id: "#RC-8878",
    date: "Oct 05, 2023",
    category: "Meals",
    subCategory: "Dinner",
    categoryIcon: UtensilsCrossed,
    merchant: "Steakhouse Inc",
    amount: "$150.00",
    amountNumeric: 150.00,
    status: "Rejected",
  },
  {
    id: "#RC-8875",
    date: "Sep 28, 2023",
    category: "Travel",
    subCategory: "Taxi",
    categoryIcon: Car,
    merchant: "Uber",
    amount: "$45.20",
    amountNumeric: 45.20,
    status: "Approved",
  },
  {
    id: "#RC-8871",
    date: "Sep 25, 2023",
    category: "Office",
    subCategory: "Supplies",
    categoryIcon: FileText,
    merchant: "Staples",
    amount: "$89.99",
    amountNumeric: 89.99,
    status: "Approved",
  },
  {
    id: "#RC-8869",
    date: "Sep 20, 2023",
    category: "Travel",
    subCategory: "Bus",
    categoryIcon: Bus,
    merchant: "Greyhound",
    amount: "$35.00",
    amountNumeric: 35.00,
    status: "Paid",
  },
  {
    id: "#RC-8860",
    date: "Sep 15, 2023",
    category: "Equipment",
    subCategory: "Peripherals",
    categoryIcon: Monitor,
    merchant: "Logitech",
    amount: "$120.00",
    amountNumeric: 120.00,
    status: "Approved",
  },
  {
    id: "#RC-8855",
    date: "Sep 10, 2023",
    category: "Meals",
    subCategory: "Lunch",
    categoryIcon: UtensilsCrossed,
    merchant: "Panera Bread",
    amount: "$18.50",
    amountNumeric: 18.50,
    status: "Approved",
  },
  {
    id: "#RC-8850",
    date: "Sep 05, 2023",
    category: "Travel",
    subCategory: "Flight",
    categoryIcon: Plane,
    merchant: "United Airlines",
    amount: "$420.00",
    amountNumeric: 420.00,
    status: "Approved",
  },
  {
    id: "#RC-8848",
    date: "Aug 29, 2023",
    category: "Travel",
    subCategory: "Hotel",
    categoryIcon: Hotel,
    merchant: "Hilton",
    amount: "$310.00",
    amountNumeric: 310.00,
    status: "Approved",
  },
  {
    id: "#RC-8840",
    date: "Aug 22, 2023",
    category: "Office",
    subCategory: "Software",
    categoryIcon: FileText,
    merchant: "Adobe Systems",
    amount: "$52.99",
    amountNumeric: 52.99,
    status: "Pending",
  },
  {
    id: "#RC-8835",
    date: "Aug 15, 2023",
    category: "Meals",
    subCategory: "Breakfast",
    categoryIcon: UtensilsCrossed,
    merchant: "Starbucks",
    amount: "$12.40",
    amountNumeric: 12.40,
    status: "Approved",
  },
  {
    id: "#RC-8830",
    date: "Aug 10, 2023",
    category: "Travel",
    subCategory: "Taxi",
    categoryIcon: Car,
    merchant: "Lyft",
    amount: "$28.00",
    amountNumeric: 28.00,
    status: "Rejected",
  }
];

export const STATUS_BADGE: Record<ClaimStatus, string> = {
  "Pending": "bg-secondary-container/50 text-on-secondary-container",
  "Approved": "bg-primary/10 text-primary",
  "Paid": "bg-tertiary/10 text-tertiary",
  "Rejected": "bg-error/10 text-error",
};

export const STATUS_DOT: Record<ClaimStatus, string> = {
  "Pending": "bg-secondary",
  "Approved": "bg-primary",
  "Paid": "bg-tertiary",
  "Rejected": "bg-error",
};

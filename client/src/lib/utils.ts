import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type JobStatus = "Booked" | "In Progress" | "Awaiting Parts" | "On Hold" | "Completed";
export type JobPriority = "Low" | "Normal" | "High" | "Urgent";
export type JobType = "Maintenance" | "Renovation" | "Inspection" | "Emergency";
export type PaymentStatus = "Pending" | "Invoiced" | "Paid";
export type FileCategory = "before" | "during" | "after" | "quote" | "invoice" | "report" | "other";

export function statusClass(status: string): string {
  switch (status) {
    case "Booked": return "status-booked";
    case "In Progress": return "status-in-progress";
    case "Awaiting Parts": return "status-awaiting";
    case "On Hold": return "status-on-hold";
    case "Completed": return "status-completed";
    default: return "bg-muted text-muted-foreground";
  }
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case "Urgent": return "text-red-600 dark:text-red-400";
    case "High": return "text-orange-600 dark:text-orange-400";
    case "Normal": return "text-blue-600 dark:text-blue-400";
    case "Low": return "text-slate-500";
    default: return "";
  }
}

export function formatCurrency(v?: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export const JOB_STATUSES: JobStatus[] = ["Booked", "In Progress", "Awaiting Parts", "On Hold", "Completed"];
export const JOB_PRIORITIES: JobPriority[] = ["Low", "Normal", "High", "Urgent"];
export const JOB_TYPES: JobType[] = ["Maintenance", "Renovation", "Inspection", "Emergency"];
export const PAYMENT_STATUSES: PaymentStatus[] = ["Pending", "Invoiced", "Paid"];
export const FILE_CATEGORIES: FileCategory[] = ["before", "during", "after", "quote", "invoice", "report", "other"];

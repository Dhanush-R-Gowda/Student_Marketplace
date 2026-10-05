import { clsx } from "clsx";
import type { ListingCondition, ListingStatus, OfferStatus } from "@/types";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  destructive: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  purple: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Pre-configured badge for listing status
export function StatusBadge({ status }: { status: ListingStatus }) {
  const map: Record<ListingStatus, BadgeVariant> = {
    Available: "success",
    Reserved: "warning",
    Sold: "destructive",
    Removed: "default",
  };
  return <Badge variant={map[status]}>{status}</Badge>;
}

// Pre-configured badge for listing condition
export function ConditionBadge({ condition }: { condition: ListingCondition }) {
  const map: Record<ListingCondition, BadgeVariant> = {
    New: "success",
    "Like New": "info",
    Good: "purple",
    Fair: "warning",
    Poor: "destructive",
  };
  return <Badge variant={map[condition]}>{condition}</Badge>;
}

// Pre-configured badge for offer status
export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const map: Record<OfferStatus, BadgeVariant> = {
    Pending: "warning",
    Accepted: "success",
    Rejected: "destructive",
    Withdrawn: "default",
    Expired: "default",
  };
  return <Badge variant={map[status]}>{status}</Badge>;
}

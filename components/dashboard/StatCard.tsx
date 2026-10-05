import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  change?: string;
  changeUp?: boolean;
  className?: string;
}

export function StatCard({
  title, value, icon: Icon,
  iconColor = "text-indigo-600",
  iconBg    = "bg-indigo-100 dark:bg-indigo-900/30",
  change, changeUp,
  className,
}: StatCardProps) {
  return (
    <div className={clsx(
      "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className={clsx("rounded-lg p-2.5", iconBg)}>
          <Icon className={clsx("h-5 w-5", iconColor)} />
        </div>
        {change && (
          <span className={clsx(
            "text-xs font-medium",
            changeUp ? "text-green-600" : "text-red-500"
          )}>
            {changeUp ? "↑" : "↓"} {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{title}</p>
    </div>
  );
}

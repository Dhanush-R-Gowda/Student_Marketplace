"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Report } from "@/types";

const STATUS_TABS = ["all","Pending","Reviewing","Resolved","Dismissed"];

const STATUS_COLORS: Record<string, string> = {
  Pending:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Reviewing:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Resolved:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Dismissed:  "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export function AdminReportsClient({ reports: initial, total: _total, currentStatus }: { reports: Report[]; total: number; currentStatus: string }) {
  const router = useRouter();
  const [reports, setReports] = useState(initial);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function updateStatus(id: string, status: "Reviewing" | "Resolved" | "Dismissed") {
    setLoading(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } finally {
      setLoading(p => ({ ...p, [id]: false }));
    }
  }

  return (
    <div>
      {/* Status tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-6 w-fit flex-wrap">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => router.push(`/admin/reports${s !== "all" ? `?status=${s}` : ""}`)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              currentStatus === s
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
            }`}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No reports found</div>
        ) : reports.map(r => {
          const rp = r as unknown as Report & { reporter_name?: string; listing_title?: string; reviewer_name?: string };
          return (
            <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                      {r.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                      {r.reason}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Listing:{" "}
                    <Link href={`/listings/${r.listing_id}`} className="text-indigo-600 hover:underline">
                      {rp.listing_title ?? r.listing_id}
                    </Link>
                  </p>

                  {r.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2">
                      &ldquo;{r.description}&rdquo;
                    </p>
                  )}

                  <p className="text-xs text-slate-500 mt-2">
                    Reported by: <span className="font-medium">{rp.reporter_name ?? "Unknown"}</span>
                    {rp.reviewer_name && <> · Reviewed by: <span className="font-medium">{rp.reviewer_name}</span></>}
                  </p>
                </div>

                {/* Actions */}
                {r.status === "Pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => updateStatus(r.id, "Reviewing")} disabled={loading[r.id]}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40">
                      <Eye className="h-3.5 w-3.5" />Review
                    </button>
                    <button onClick={() => updateStatus(r.id, "Dismissed")} disabled={loading[r.id]}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-40">
                      <XCircle className="h-3.5 w-3.5" />Dismiss
                    </button>
                  </div>
                )}
                {r.status === "Reviewing" && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => updateStatus(r.id, "Resolved")} disabled={loading[r.id]}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium border border-green-300 text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40">
                      <CheckCircle className="h-3.5 w-3.5" />Resolve
                    </button>
                    <button onClick={() => updateStatus(r.id, "Dismissed")} disabled={loading[r.id]}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-600 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40">
                      <XCircle className="h-3.5 w-3.5" />Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Package } from "lucide-react";
import { StatusBadge, ConditionBadge } from "@/components/ui/Badge";
import { formatDistanceToNow } from "date-fns";
import type { Listing } from "@/types";

const STATUSES = ["all","Available","Reserved","Sold","Removed"];

export function AdminListingsClient({ listings: initial, total, currentStatus }: { listings: Listing[]; total: number; currentStatus: string }) {
  const router  = useRouter();
  const [listings, setListings] = useState(initial);
  const [loading, setLoading]   = useState<Record<string, boolean>>({});

  async function removeListing(id: string) {
    if (!confirm("Remove this listing?")) return;
    setLoading(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Removed" }),
      });
      if (res.ok) setListings(prev => prev.map(l => l.id === id ? { ...l, status: "Removed" as const } : l));
    } finally {
      setLoading(p => ({ ...p, [id]: false }));
    }
  }

  return (
    <div>
      {/* Status tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-6 w-fit">
        {STATUSES.map(s => (
          <button key={s} onClick={() => router.push(`/admin/listings${s !== "all" ? `?status=${s}` : ""}`)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all capitalize ${
              currentStatus === s
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
            }`}>
            {s}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500 mb-4">{total} listing{total !== 1 ? "s" : ""}</p>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              {["Item","Seller","Price","Status","Listed","Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {listings.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No listings</td></tr>
            ) : listings.map(l => (
              <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0">
                      {l.primary_image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={l.primary_image} alt="" className="h-full w-full object-cover" />
                        : <div className="flex h-full items-center justify-center"><Package className="h-4 w-4 text-slate-400" /></div>}
                    </div>
                    <div>
                      <Link href={`/listings/${l.id}`} className="font-medium text-slate-900 dark:text-white hover:text-indigo-600 line-clamp-1">{l.title}</Link>
                      <p className="text-xs text-slate-400">{l.category_name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{l.seller_name}</td>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">₹{Number(l.price).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</td>
                <td className="px-4 py-3">
                  {l.status !== "Removed" && (
                    <button onClick={() => removeListing(l.id)} disabled={loading[l.id]}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
                      <Trash2 className="h-3.5 w-3.5" />Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

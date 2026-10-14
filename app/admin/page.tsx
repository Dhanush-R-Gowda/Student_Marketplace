import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users, ArrowLeftRight, Flag,
  ShoppingBag, CheckCircle, Clock
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getMarketplaceStats } from "@/lib/db/queries/analytics";
import { getAllReports } from "@/lib/db/queries/reports";
import { StatCard } from "@/components/dashboard/StatCard";
import { query } from "@/lib/db";

export const metadata: Metadata = { title: "Admin Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  try { await requireAdmin(); } catch { redirect("/login"); }

  const [stats, recentReports, recentTransactions] = await Promise.all([
    getMarketplaceStats(),
    getAllReports({ status: "Pending", page: 1, limit: 5 }),
    query<{ listing_title: string; buyer_name: string; seller_name: string; final_price: number; completed_at: string }>(
      `SELECT l.title AS listing_title, bu.name AS buyer_name, su.name AS seller_name,
              t.final_price, t.completed_at
       FROM transactions t
       INNER JOIN listings l ON t.listing_id = l.id
       INNER JOIN users bu   ON t.buyer_id   = bu.id
       INNER JOIN users su   ON t.seller_id  = su.id
       ORDER BY t.created_at DESC LIMIT 5`
    ),
  ]);

  const statCards = [
    { title: "Total Users",           value: stats.total_users,            icon: Users,           iconColor: "text-blue-600",   iconBg: "bg-blue-100 dark:bg-blue-900/30" },
    { title: "Active Listings",       value: stats.available_listings,     icon: ShoppingBag,     iconColor: "text-green-600",  iconBg: "bg-green-100 dark:bg-green-900/30" },
    { title: "Completed Transactions",value: stats.completed_transactions, icon: ArrowLeftRight,  iconColor: "text-indigo-600", iconBg: "bg-indigo-100 dark:bg-indigo-900/30" },
    { title: "Pending Offers",        value: stats.pending_offers,         icon: Clock,           iconColor: "text-amber-600",  iconBg: "bg-amber-100 dark:bg-amber-900/30" },
    { title: "Pending Reports",       value: stats.pending_reports,        icon: Flag,            iconColor: "text-red-600",    iconBg: "bg-red-100 dark:bg-red-900/30" },
    { title: "Sold Listings",         value: stats.sold_listings,          icon: CheckCircle,     iconColor: "text-purple-600", iconBg: "bg-purple-100 dark:bg-purple-900/30" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Marketplace overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {statCards.map(s => <StatCard key={s.title} {...s} />)}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending reports */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Flag className="h-4 w-4 text-red-500" /> Pending Reports
            </h2>
            <Link href="/admin/reports" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentReports.reports.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500 text-center">No pending reports</p>
            ) : recentReports.reports.map(r => (
              <div key={r.id} className="px-5 py-3">
                <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{(r as unknown as { listing_title?: string }).listing_title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {r.reason} — by {(r as unknown as { reporter_name?: string }).reporter_name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-indigo-500" /> Recent Transactions
            </h2>
            <Link href="/admin/analytics" className="text-xs text-indigo-600 hover:underline">Analytics</Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentTransactions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500 text-center">No transactions yet</p>
            ) : recentTransactions.map((tx, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{tx.listing_title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{tx.buyer_name} ← {tx.seller_name}</p>
                </div>
                <span className="text-sm font-semibold text-green-600">₹{Number(tx.final_price).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

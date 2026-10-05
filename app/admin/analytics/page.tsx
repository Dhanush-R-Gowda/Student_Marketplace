import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import {
  getMarketplaceStats, getCategoryStats,
  getTopSellers, getListingsOverTime, getTransactionsOverTime
} from "@/lib/db/queries/analytics";
import { AnalyticsClient } from "./AnalyticsClient";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  try { await requireAdmin(); } catch { redirect("/login"); }

  const [stats, categoryStats, topSellers, listingsOverTime, transactionsOverTime] = await Promise.all([
    getMarketplaceStats(),
    getCategoryStats(),
    getTopSellers(8),
    getListingsOverTime(30),
    getTransactionsOverTime(30),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Marketplace health — last 30 days</p>
      </div>
      <AnalyticsClient
        stats={stats}
        categoryStats={categoryStats}
        topSellers={topSellers}
        listingsOverTime={listingsOverTime}
        transactionsOverTime={transactionsOverTime}
      />
    </div>
  );
}

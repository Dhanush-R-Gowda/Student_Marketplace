"use client";

import {
  Users, ShoppingBag, ArrowLeftRight, Tag,
  TrendingUp, BarChart2, Package
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import type { MarketplaceStats, CategoryStats, SellerStats } from "@/types";

interface Props {
  stats: MarketplaceStats;
  categoryStats: CategoryStats[];
  topSellers: SellerStats[];
  listingsOverTime: { date: string; count: number }[];
  transactionsOverTime: { date: string; count: number; value: number }[];
}

export function AnalyticsClient({ stats, categoryStats, topSellers, listingsOverTime, transactionsOverTime }: Props) {
  const soldPct = stats.total_listings > 0
    ? Math.round((stats.sold_listings / stats.total_listings) * 100)
    : 0;

  const totalRevenue = transactionsOverTime.reduce((s, r) => s + Number(r.value), 0);
  const totalNewListings = listingsOverTime.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-8">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Total Students" value={stats.total_users} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-100 dark:bg-blue-900/30" />
        <StatCard title="Active Listings" value={stats.available_listings} icon={ShoppingBag} iconColor="text-green-600" iconBg="bg-green-100 dark:bg-green-900/30" />
        <StatCard title="Completed Transactions" value={stats.completed_transactions} icon={ArrowLeftRight} iconColor="text-indigo-600" iconBg="bg-indigo-100 dark:bg-indigo-900/30" />
        <StatCard title="Avg. Listing Price" value={`₹${Number(stats.avg_listing_price).toLocaleString("en-IN")}`} icon={Tag} iconColor="text-amber-600" iconBg="bg-amber-100 dark:bg-amber-900/30" />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Sell-through rate</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{soldPct}%</p>
          <p className="text-xs text-slate-500 mt-1">{stats.sold_listings} of {stats.total_listings} listings sold</p>
          <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-700">
            <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${soldPct}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">30-day listings</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalNewListings}</p>
          <p className="text-xs text-slate-500 mt-1">New listings created</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">30-day revenue</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">₹{totalRevenue.toLocaleString("en-IN")}</p>
          <p className="text-xs text-slate-500 mt-1">Total transaction value</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category breakdown */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
            <BarChart2 className="h-4 w-4 text-indigo-500" /> Listings by Category
          </h2>
          {categoryStats.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No data</p>
          ) : (
            <div className="space-y-3">
              {categoryStats.map(cat => {
                const maxCount = categoryStats[0]?.listing_count ?? 1;
                const pct = Math.round((cat.listing_count / maxCount) * 100);
                return (
                  <div key={cat.category_name}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="text-slate-700 dark:text-slate-200 font-medium">{cat.category_name}</span>
                      <span className="text-slate-500">{cat.listing_count} listing{cat.listing_count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top sellers */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
            <TrendingUp className="h-4 w-4 text-green-500" /> Top Sellers by Revenue
          </h2>
          {topSellers.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {topSellers.map((seller, i) => (
                <div key={seller.seller_id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                  <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    {seller.seller_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{seller.seller_name}</p>
                    <p className="text-xs text-slate-500">{seller.sold_listings} sold</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    ₹{Number(seller.total_revenue).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Listings over time (simple bar chart) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
          <Package className="h-4 w-4 text-slate-500" /> Listings Created — Last 30 Days
        </h2>
        <SimpleBarChart data={listingsOverTime} valueKey="count" color="bg-indigo-500" />
      </div>

      {/* Transactions over time */}
      {transactionsOverTime.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
            <ArrowLeftRight className="h-4 w-4 text-green-500" /> Transactions — Last 30 Days
          </h2>
          <SimpleBarChart data={transactionsOverTime} valueKey="count" color="bg-green-500" />
        </div>
      )}
    </div>
  );
}

function SimpleBarChart({
  data,
  valueKey,
  color,
}: {
  data: Record<string, unknown>[];
  valueKey: string;
  color: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-6">No data for this period</p>;
  }

  const max = Math.max(...data.map(d => Number(d[valueKey])), 1);

  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d, i) => {
        const val = Number(d[valueKey]);
        const pct = (val / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className={`w-full rounded-t ${color} opacity-80 group-hover:opacity-100 transition-all min-h-[2px]`}
              style={{ height: `${Math.max(pct, 2)}%` }}
              title={`${d.date}: ${val}`}
            />
            {/* Show date on hover (tooltip via title) */}
          </div>
        );
      })}
    </div>
  );
}

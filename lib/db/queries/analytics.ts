import { query, queryOne } from "@/lib/db";
import type { MarketplaceStats, CategoryStats, SellerStats } from "@/types";

// ---------------------------------------------------------------------------
// Analytics queries (used by admin dashboard)
// ---------------------------------------------------------------------------

/** Aggregate marketplace statistics — uses marketplace_statistics_view */
export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  const row = await queryOne<MarketplaceStats>(`
    SELECT
      total_students       AS total_users,
      active_users,
      total_listings,
      available_listings,
      sold_listings,
      pending_offers,
      total_transactions   AS completed_transactions,
      pending_reports,
      avg_listing_price
    FROM marketplace_statistics_view
  `);

  return row ?? {
    total_users: 0, active_users: 0,
    total_listings: 0, available_listings: 0, sold_listings: 0,
    pending_offers: 0, completed_transactions: 0,
    pending_reports: 0, avg_listing_price: 0,
  };
}

/** Category statistics — uses category_stats_view */
export async function getCategoryStats(): Promise<CategoryStats[]> {
  return query<CategoryStats>(`
    SELECT
      category_name,
      total_listings  AS listing_count,
      sold_listings   AS sold_count
    FROM category_stats_view
    ORDER BY listing_count DESC
    LIMIT 10
  `);
}

/** Top sellers by revenue — uses seller_listing_summary_view */
export async function getTopSellers(limit = 10): Promise<SellerStats[]> {
  return query<SellerStats>(`
    SELECT
      seller_id,
      seller_name,
      active_listings,
      sold_listings,
      total_revenue
    FROM seller_listing_summary_view
    WHERE completed_sales > 0
    ORDER BY total_revenue DESC
    LIMIT $1
  `, [limit]);
}

/** Listings created per day over last N days (for time-series chart) */
export async function getListingsOverTime(days = 30): Promise<{ date: string; count: number }[]> {
  return query<{ date: string; count: number }>(`
    SELECT
      DATE(created_at)::TEXT AS date,
      COUNT(*)::INTEGER      AS count
    FROM listings
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);
}

/** Transactions per day over last N days */
export async function getTransactionsOverTime(days = 30): Promise<{ date: string; count: number; value: number }[]> {
  return query<{ date: string; count: number; value: number }>(`
    SELECT
      DATE(completed_at)::TEXT     AS date,
      COUNT(*)::INTEGER            AS count,
      COALESCE(SUM(final_price), 0) AS value
    FROM transactions
    WHERE completed_at >= NOW() - INTERVAL '${days} days'
      AND transaction_status = 'Completed'
    GROUP BY DATE(completed_at)
    ORDER BY date ASC
  `);
}

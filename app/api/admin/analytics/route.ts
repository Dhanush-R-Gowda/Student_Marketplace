import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/session";
import {
  getMarketplaceStats,
  getCategoryStats,
  getTopSellers,
  getListingsOverTime,
  getTransactionsOverTime,
} from "@/lib/db/queries/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const [stats, categoryStats, topSellers, listingsOverTime, transactionsOverTime] =
      await Promise.all([
        getMarketplaceStats(),
        getCategoryStats(),
        getTopSellers(5),
        getListingsOverTime(30),
        getTransactionsOverTime(30),
      ]);

    return NextResponse.json({
      success: true,
      data: { stats, categoryStats, topSellers, listingsOverTime, transactionsOverTime },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    console.error("[GET /api/admin/analytics]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch analytics." }, { status: 500 });
  }
}

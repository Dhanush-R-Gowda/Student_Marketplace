import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/session";
import { getTransactionsByUser, getAllTransactions } from "@/lib/db/queries/transactions";

export const dynamic = "force-dynamic";

// GET /api/transactions
// ?role=buyer  → purchases by the current user
// ?role=seller → sales by the current user
// ?role=both   → (default) all transactions where user is buyer or seller
// Admin: ?admin=true → all transactions (paginated)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const role  = searchParams.get("role") ?? "both";
    const admin = searchParams.get("admin") === "true";
    const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

    if (admin) {
      if (session.role !== "admin") {
        return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });
      }
      const result = await getAllTransactions({ page, limit });
      return NextResponse.json({ success: true, data: result });
    }

    const transactions = await getTransactionsByUser(
      session.id,
      role as "buyer" | "seller" | "both"
    );

    return NextResponse.json({ success: true, data: transactions });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    }
    console.error("[GET /api/transactions]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch transactions." }, { status: 500 });
  }
}

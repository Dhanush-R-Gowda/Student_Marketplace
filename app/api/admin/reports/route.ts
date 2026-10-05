import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/session";
import { getAllReports, updateReportStatus } from "@/lib/db/queries/reports";
import { UpdateReportStatusSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit  = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

    const result = await getAllReports({ status, page, limit });
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    console.error("[GET /api/admin/reports]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch reports." }, { status: 500 });
  }
}

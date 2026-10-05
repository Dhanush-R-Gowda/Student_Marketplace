import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/session";
import { updateReportStatus } from "@/lib/db/queries/reports";
import { UpdateReportStatusSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireAdmin();
    const { id }  = await params;
    const body    = await request.json();

    const parsed = UpdateReportStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid status.", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const updated = await updateReportStatus(id, parsed.data.status, session.id);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Report not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    console.error("[PATCH /api/admin/reports/[id]]", err);
    return NextResponse.json({ success: false, error: "Failed to update report." }, { status: 500 });
  }
}

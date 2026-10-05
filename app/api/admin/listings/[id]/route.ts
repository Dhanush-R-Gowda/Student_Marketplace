import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/session";
import { adminRemoveListing } from "@/lib/db/queries/listings";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body   = await request.json();

    // Admin can force any status change
    const { status } = body;
    if (!status) {
      return NextResponse.json({ success: false, error: "status is required." }, { status: 422 });
    }

    if (status === "Removed") {
      const ok = await adminRemoveListing(id);
      if (!ok) return NextResponse.json({ success: false, error: "Listing not found." }, { status: 404 });
      return NextResponse.json({ success: true, message: "Listing removed." });
    }

    return NextResponse.json({ success: false, error: "Unsupported status." }, { status: 422 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    console.error("[PATCH /api/admin/listings/[id]]", err);
    return NextResponse.json({ success: false, error: "Failed to update listing." }, { status: 500 });
  }
}

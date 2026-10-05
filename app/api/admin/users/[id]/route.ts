import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/session";
import { updateUserStatus } from "@/lib/db/queries/users";
import { UpdateUserStatusSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body   = await request.json();

    const parsed = UpdateUserStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid status." },
        { status: 422 }
      );
    }

    const updated = await updateUserStatus(id, parsed.data.status);
    if (!updated) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    console.error("[PATCH /api/admin/users/[id]]", err);
    return NextResponse.json({ success: false, error: "Failed to update user." }, { status: 500 });
  }
}

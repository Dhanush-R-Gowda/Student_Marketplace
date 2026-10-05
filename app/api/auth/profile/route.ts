import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { updateUserProfile } from "@/lib/db/queries/users";
import { AuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  college: z.string().max(200).optional(),
  department: z.string().max(200).optional(),
  year: z.number().int().min(1).max(6).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const updated = await updateUserProfile(session.id, parsed.data);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    }
    console.error("[PATCH /api/auth/profile]", err);
    return NextResponse.json({ success: false, error: "Failed to update profile." }, { status: 500 });
  }
}

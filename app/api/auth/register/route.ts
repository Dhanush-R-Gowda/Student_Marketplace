import { NextRequest, NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { RegisterSchema } from "@/lib/validation/schemas";
import { createUser, getUserByEmail } from "@/lib/db/queries/users";
import { setSessionCookie } from "@/lib/auth/session";
import type { SessionUser } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validate input
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    const { name, email, password, college, department, year } = parsed.data;

    // 2. Check email uniqueness
    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // 3. Hash password — never store plaintext
    const passwordHash = hashSync(password, 12);

    // 4. Create user (triggers T7 auto-creates wishlist)
    const user = await createUser({
      name,
      email,
      passwordHash,
      college,
      department,
      year,
    });

    // 5. Create session
    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name as "student" | "admin",
      status: user.status,
    };

    await setSessionCookie(sessionUser);

    return NextResponse.json(
      {
        success: true,
        data: sessionUser,
        message: "Account created successfully.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json(
      { success: false, error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}

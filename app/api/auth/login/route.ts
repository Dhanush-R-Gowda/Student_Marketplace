import { NextRequest, NextResponse } from "next/server";
import { compareSync } from "bcryptjs";
import { LoginSchema } from "@/lib/validation/schemas";
import { getUserByEmail } from "@/lib/db/queries/users";
import { setSessionCookie } from "@/lib/auth/session";
import type { SessionUser } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validate input shape
    const parsed = LoginSchema.safeParse(body);
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

    const { email, password } = parsed.data;

    // 2. Find user by email
    const user = await getUserByEmail(email);

    // Use a constant-time comparison path even when user not found
    // to prevent timing attacks that reveal whether an email exists
    const passwordHash = user?.password_hash ?? "$2a$12$invalidhashfortimingnormalization";
    const passwordValid = compareSync(password, passwordHash);

    if (!user || !passwordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // 3. Check account status
    if (user.status === "deactivated") {
      return NextResponse.json(
        { success: false, error: "This account has been deactivated." },
        { status: 403 }
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        {
          success: false,
          error: "Your account has been suspended. Contact support if you believe this is an error.",
        },
        { status: 403 }
      );
    }

    // 4. Issue session cookie
    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role_name ?? "student") as "student" | "admin",
      status: user.status,
    };

    await setSessionCookie(sessionUser);

    return NextResponse.json({
      success: true,
      data: sessionUser,
      message: "Logged in successfully.",
    });
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json(
      { success: false, error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}

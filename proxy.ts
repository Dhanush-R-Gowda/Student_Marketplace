import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

// ---------------------------------------------------------------------------
// Route protection middleware
// Runs on every request matching the config.matcher below.
// ---------------------------------------------------------------------------

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/wishlist",
  "/offers",
  "/transactions",
  "/profile",
  "/listings/new",
];

// Routes that require admin role
const ADMIN_ROUTES = ["/admin"];

// Routes that logged-in users should NOT access (auth pages)
const AUTH_ROUTES = ["/login", "/register"];

// Next.js 16 uses "proxy" file with exported "proxy" function
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const user = await getSessionFromRequest(request);

  // Redirect logged-in users away from auth pages
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Protect admin routes
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!user) {
      return NextResponse.redirect(
        new URL(`/login?redirect=${pathname}`, request.url)
      );
    }
    if (user.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Protect user routes
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!user) {
      return NextResponse.redirect(
        new URL(`/login?redirect=${pathname}`, request.url)
      );
    }
    if (user.status !== "active") {
      return NextResponse.redirect(new URL("/login?suspended=1", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - /uploads/* (served images)
     * - /api/* (API routes handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads|api).*)",
  ],
};

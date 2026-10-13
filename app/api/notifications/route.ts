import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/session";
import {
  getNotifications,
  markAllNotificationsRead,
} from "@/lib/db/queries/notifications";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/notifications
// Returns paginated notifications for the authenticated user only.
//
// Query parameters:
//   page  (default 1)   — 1-based page number
//   limit (default 20)  — items per page, capped at 50
//
// Response shape:
//   {
//     success: true,
//     data: {
//       notifications: Notification[],
//       total:         number,          // total rows for this user
//       unreadCount:   number,          // unread rows for this user
//       page:          number,
//       totalPages:    number,
//     }
//   }
//
// Security: requireAuth() throws AuthError(401) when there is no valid
// session cookie, and AuthError(403) when the account is suspended.
// getNotifications() is scoped to session.id — no other user's rows
// can be returned.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

    const { notifications, total, unreadCount } = await getNotifications(
      session.id,
      { page, limit }
    );

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        total,
        unreadCount,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("[GET /api/notifications]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/notifications
// Marks all unread notifications as read for the authenticated user.
//
// Response shape:
//   { success: true, data: { updated: number } }
//
// Security: markAllNotificationsRead() is scoped to session.id — it cannot
// affect another user's notifications.
// ---------------------------------------------------------------------------
export async function PATCH() {
  try {
    const session = await requireAuth();

    const updated = await markAllNotificationsRead(session.id);

    return NextResponse.json({
      success: true,
      data: { updated },
      message: updated > 0 ? `${updated} notification(s) marked as read.` : "No unread notifications.",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("[PATCH /api/notifications]", err);
    return NextResponse.json(
      { success: false, error: "Failed to mark notifications as read." },
      { status: 500 }
    );
  }
}

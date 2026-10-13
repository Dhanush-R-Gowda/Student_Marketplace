import { query, queryOne } from "@/lib/db";
import type { Notification } from "@/types";

// ---------------------------------------------------------------------------
// Notification queries
//
// All queries are scoped to a specific user_id — cross-user access is
// structurally impossible because every WHERE clause includes user_id = $1.
// The notifications table also has ON DELETE CASCADE on user_id so a deleted
// user's notifications are automatically removed.
// ---------------------------------------------------------------------------

/**
 * Get paginated notifications for a single user, newest first.
 * Uses idx_notifications_user_id (user_id, created_at DESC) composite index.
 */
export async function getNotifications(
  userId: string,
  params: { page?: number; limit?: number } = {}
): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
  const { page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  // Single query: total count + unread count together to avoid two round-trips.
  const countRow = await queryOne<{ total: string; unread: string }>(`
    SELECT
      COUNT(*)                                        AS total,
      COUNT(*) FILTER (WHERE is_read = FALSE)         AS unread
    FROM notifications
    WHERE user_id = $1
  `, [userId]);

  const total       = parseInt(countRow?.total  ?? "0");
  const unreadCount = parseInt(countRow?.unread ?? "0");

  const notifications = await query<Notification>(`
    SELECT
      id,
      user_id,
      type,
      message,
      is_read,
      related_listing_id,
      related_offer_id,
      created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, [userId, limit, offset]);

  return { notifications, total, unreadCount };
}

/**
 * Mark all unread notifications as read for a specific user.
 * Scoped strictly to userId — cannot affect another user's notifications.
 * Returns the count of rows updated.
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const rows = await query<{ id: number }>(`
    UPDATE notifications
    SET is_read = TRUE
    WHERE user_id = $1
      AND is_read = FALSE
    RETURNING id
  `, [userId]);
  return rows.length;
}

/**
 * Mark a single notification as read.
 * The user_id guard ensures a user cannot read another user's notification.
 * Returns true if the notification was found and updated, false otherwise.
 */
export async function markNotificationRead(
  notificationId: number,
  userId: string
): Promise<boolean> {
  const rows = await query<{ id: number }>(`
    UPDATE notifications
    SET is_read = TRUE
    WHERE id = $1
      AND user_id = $2
    RETURNING id
  `, [notificationId, userId]);
  return rows.length > 0;
}

import { query, queryOne } from "@/lib/db";
import type { WishlistItem } from "@/types";

// ---------------------------------------------------------------------------
// Wishlist queries
// ---------------------------------------------------------------------------

/** Get all wishlist items for a user (with listing details) */
export async function getWishlistItems(userId: string): Promise<WishlistItem[]> {
  return query<WishlistItem>(`
    SELECT
      wi.*,
      -- Inline listing fields
      l.id          AS listing_id,
      l.title       AS listing_title,
      l.price,
      l.condition,
      l.location,
      l.status,
      c.name        AS category_name,
      c.slug        AS category_slug,
      u.name        AS seller_name,
      (
        SELECT image_url FROM listing_images
        WHERE listing_id = l.id
        ORDER BY display_order ASC LIMIT 1
      )             AS primary_image
    FROM wishlist_items wi
    INNER JOIN wishlists  wl ON wi.wishlist_id  = wl.id
    INNER JOIN listings    l ON wi.listing_id   = l.id
    INNER JOIN categories  c ON l.category_id   = c.id
    INNER JOIN users       u ON l.seller_id     = u.id
    WHERE wl.user_id = $1
    ORDER BY wi.added_at DESC
  `, [userId]);
}

/** Check if a listing is in a user's wishlist */
export async function isInWishlist(userId: string, listingId: string): Promise<boolean> {
  const row = await queryOne<{ count: string }>(`
    SELECT COUNT(*) AS count
    FROM wishlist_items wi
    INNER JOIN wishlists wl ON wi.wishlist_id = wl.id
    WHERE wl.user_id = $1 AND wi.listing_id = $2
  `, [userId, listingId]);
  return parseInt(row?.count ?? "0") > 0;
}

/** Add a listing to wishlist */
export async function addToWishlist(userId: string, listingId: string): Promise<void> {
  // Ensure wishlist exists (it should be auto-created by trigger, but belt-and-suspenders)
  await query(`
    INSERT INTO wishlists (user_id) VALUES ($1)
    ON CONFLICT (user_id) DO NOTHING
  `, [userId]);

  await query(`
    INSERT INTO wishlist_items (wishlist_id, listing_id)
    SELECT wl.id, $2
    FROM wishlists wl
    WHERE wl.user_id = $1
    ON CONFLICT ON CONSTRAINT uq_wishlist_listing DO NOTHING
  `, [userId, listingId]);
}

/** Remove a listing from wishlist */
export async function removeFromWishlist(
  userId: string,
  listingId: string
): Promise<boolean> {
  const rows = await query(`
    DELETE FROM wishlist_items
    WHERE wishlist_id = (SELECT id FROM wishlists WHERE user_id = $1)
      AND listing_id = $2
    RETURNING id
  `, [userId, listingId]);
  return rows.length > 0;
}

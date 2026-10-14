import { query, queryOne } from "@/lib/db";
import type { Offer } from "@/types";

// ---------------------------------------------------------------------------
// Offer queries
// ---------------------------------------------------------------------------

/** Get all offers on a listing (for seller view) */
export async function getOffersByListing(listingId: string): Promise<Offer[]> {
  return query<Offer>(`
    SELECT
      o.*,
      u.name  AS buyer_name,
      u.email AS buyer_email
    FROM offers o
    INNER JOIN users u ON o.buyer_id = u.id
    WHERE o.listing_id = $1
    ORDER BY o.created_at DESC
  `, [listingId]);
}

/** Get all offers made by a buyer */
export async function getOffersByBuyer(buyerId: string): Promise<Offer[]> {
  return query<Offer>(`
    SELECT
      o.*,
      l.title       AS listing_title,
      l.price       AS listing_price,
      l.status      AS listing_status,
      l.seller_id   AS seller_id,
      u.name        AS seller_name,
      (
        SELECT image_url FROM listing_images
        WHERE listing_id = l.id
        ORDER BY display_order ASC LIMIT 1
      )             AS listing_image
    FROM offers o
    INNER JOIN listings l ON o.listing_id = l.id
    INNER JOIN users    u ON l.seller_id  = u.id
    WHERE o.buyer_id = $1
    ORDER BY o.created_at DESC
  `, [buyerId]);
}

/** Get a single offer by id */
export async function getOfferById(offerId: string): Promise<Offer | null> {
  return queryOne<Offer>(`
    SELECT
      o.*,
      u.name  AS buyer_name,
      u.email AS buyer_email,
      l.title AS listing_title,
      l.seller_id
    FROM offers o
    INNER JOIN users    u ON o.buyer_id   = u.id
    INNER JOIN listings l ON o.listing_id = l.id
    WHERE o.id = $1
  `, [offerId]);
}

/** Create a new offer */
export async function createOffer(data: {
  listingId: string;
  buyerId: string;
  amount: number;
  message?: string;
}): Promise<Offer> {
  const rows = await query<Offer>(`
    INSERT INTO offers (listing_id, buyer_id, amount, message)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [data.listingId, data.buyerId, data.amount, data.message ?? null]);
  return rows[0];
}

/** Withdraw an offer (buyer action) */
export async function withdrawOffer(offerId: string, buyerId: string): Promise<boolean> {
  const rows = await query(`
    UPDATE offers
    SET status = 'Withdrawn'
    WHERE id = $1 AND buyer_id = $2 AND status = 'Pending'
    RETURNING id
  `, [offerId, buyerId]);
  return rows.length > 0;
}

/** Reject an offer (seller action — direct reject without accepting another) */
export async function rejectOffer(offerId: string, sellerId: string): Promise<boolean> {
  const rows = await query(`
    UPDATE offers o
    SET status = 'Rejected'
    FROM listings l
    WHERE o.id = $1
      AND o.listing_id = l.id
      AND l.seller_id = $2
      AND o.status = 'Pending'
    RETURNING o.id
  `, [offerId, sellerId]);
  return rows.length > 0;
}

/**
 * Accept an offer.
 * Calls the accept_offer() stored function which handles the full transaction:
 * lock listing → update offer → reject others → mark sold → create transaction.
 * Returns the new transaction ID.
 */
export async function acceptOffer(
  offerId: string,
  sellerId: string
): Promise<string> {
  const rows = await query<{ accept_offer: string }>(
    `SELECT accept_offer($1, $2) AS accept_offer`,
    [offerId, sellerId]
  );
  return rows[0].accept_offer;
}

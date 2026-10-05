import { query, queryOne } from "@/lib/db";
import type { Transaction } from "@/types";

// ---------------------------------------------------------------------------
// Transaction queries
// ---------------------------------------------------------------------------

/** Get all transactions for a user (buyer or seller) */
export async function getTransactionsByUser(
  userId: string,
  role: "buyer" | "seller" | "both" = "both"
): Promise<Transaction[]> {
  const condition =
    role === "buyer"  ? "t.buyer_id = $1" :
    role === "seller" ? "t.seller_id = $1" :
                        "(t.buyer_id = $1 OR t.seller_id = $1)";

  return query<Transaction>(`
    SELECT
      t.*,
      l.title       AS listing_title,
      bu.name       AS buyer_name,
      su.name       AS seller_name,
      (
        SELECT image_url FROM listing_images
        WHERE listing_id = l.id
        ORDER BY display_order ASC LIMIT 1
      )             AS listing_image
    FROM transactions t
    INNER JOIN listings l ON t.listing_id  = l.id
    INNER JOIN users   bu ON t.buyer_id    = bu.id
    INNER JOIN users   su ON t.seller_id   = su.id
    WHERE ${condition}
    ORDER BY t.completed_at DESC NULLS LAST
  `, [userId]);
}

/** Get a single transaction by ID */
export async function getTransactionById(id: string): Promise<Transaction | null> {
  return queryOne<Transaction>(`
    SELECT
      t.*,
      l.title AS listing_title,
      bu.name AS buyer_name,
      su.name AS seller_name
    FROM transactions t
    INNER JOIN listings l ON t.listing_id  = l.id
    INNER JOIN users   bu ON t.buyer_id    = bu.id
    INNER JOIN users   su ON t.seller_id   = su.id
    WHERE t.id = $1
  `, [id]);
}

/** Get all transactions (admin view) */
export async function getAllTransactions(params: {
  page?: number;
  limit?: number;
}): Promise<{ transactions: Transaction[]; total: number }> {
  const { page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM transactions`
  );

  const transactions = await query<Transaction>(`
    SELECT
      t.*,
      l.title AS listing_title,
      bu.name AS buyer_name,
      su.name AS seller_name
    FROM transactions t
    INNER JOIN listings l ON t.listing_id  = l.id
    INNER JOIN users   bu ON t.buyer_id    = bu.id
    INNER JOIN users   su ON t.seller_id   = su.id
    ORDER BY t.created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  return { transactions, total: parseInt(countRow?.count ?? "0") };
}

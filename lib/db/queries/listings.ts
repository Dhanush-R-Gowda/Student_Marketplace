import pool, { query, queryOne, withTransaction } from "@/lib/db";
import type { Listing, ListingImage, CreateListingInput, UpdateListingInput } from "@/types";
import type { PoolClient } from "pg";

// ---------------------------------------------------------------------------
// Listing queries
// ---------------------------------------------------------------------------

/** Full listing row with joined seller + category + primary image */
export async function getListingById(id: string): Promise<Listing | null> {
  const rows = await query<Listing>(`
    SELECT
      l.*,
      u.name        AS seller_name,
      u.email       AS seller_email,
      c.name        AS category_name,
      c.slug        AS category_slug,
      (
        SELECT image_url FROM listing_images
        WHERE listing_id = l.id
        ORDER BY display_order ASC LIMIT 1
      )             AS primary_image
    FROM listings l
    INNER JOIN users      u ON l.seller_id   = u.id
    INNER JOIN categories c ON l.category_id = c.id
    WHERE l.id = $1
  `, [id]);
  return rows[0] ?? null;
}

/** Get all images for a listing */
export async function getListingImages(listingId: string): Promise<ListingImage[]> {
  return query<ListingImage>(`
    SELECT * FROM listing_images
    WHERE listing_id = $1
    ORDER BY display_order ASC
  `, [listingId]);
}

/** Get listings by seller (for My Listings page) */
export async function getListingsBySeller(sellerId: string): Promise<Listing[]> {
  return query<Listing>(`
    SELECT
      l.*,
      c.name AS category_name,
      c.slug AS category_slug,
      (
        SELECT image_url FROM listing_images
        WHERE listing_id = l.id
        ORDER BY display_order ASC LIMIT 1
      ) AS primary_image
    FROM listings l
    INNER JOIN categories c ON l.category_id = c.id
    WHERE l.seller_id = $1
    ORDER BY l.created_at DESC
  `, [sellerId]);
}

/** Create a new listing */
export async function createListing(
  sellerId: string,
  data: CreateListingInput
): Promise<Listing> {
  const rows = await query<Listing>(`
    INSERT INTO listings (seller_id, category_id, title, description, price, condition, location)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    sellerId,
    data.category_id,
    data.title,
    data.description,
    data.price,
    data.condition,
    data.location,
  ]);
  return rows[0];
}

/** Add an image to a listing */
export async function addListingImage(
  listingId: string,
  imageUrl: string,
  displayOrder: number = 0
): Promise<ListingImage> {
  const rows = await query<ListingImage>(`
    INSERT INTO listing_images (listing_id, image_url, display_order)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [listingId, imageUrl, displayOrder]);
  return rows[0];
}

/** Update listing fields */
export async function updateListing(
  listingId: string,
  sellerId: string,
  data: UpdateListingInput
): Promise<Listing | null> {
  // Build dynamic SET clause
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.title !== undefined)       { fields.push(`title = $${idx++}`);       values.push(data.title); }
  if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
  if (data.category_id !== undefined) { fields.push(`category_id = $${idx++}`); values.push(data.category_id); }
  if (data.condition !== undefined)   { fields.push(`condition = $${idx++}`);   values.push(data.condition); }
  if (data.price !== undefined)       { fields.push(`price = $${idx++}`);       values.push(data.price); }
  if (data.location !== undefined)    { fields.push(`location = $${idx++}`);    values.push(data.location); }
  if (data.status !== undefined)      { fields.push(`status = $${idx++}`);      values.push(data.status); }

  if (fields.length === 0) return getListingById(listingId);

  values.push(listingId);
  values.push(sellerId);

  const rows = await query<Listing>(`
    UPDATE listings
    SET ${fields.join(", ")}
    WHERE id = $${idx++} AND seller_id = $${idx}
    RETURNING *
  `, values);

  return rows[0] ?? null;
}

/** Soft-delete: mark listing as Removed */
export async function removeListing(
  listingId: string,
  sellerId: string
): Promise<boolean> {
  const rows = await query(`
    UPDATE listings
    SET status = 'Removed'
    WHERE id = $1 AND seller_id = $2 AND status != 'Sold'
    RETURNING id
  `, [listingId, sellerId]);
  return rows.length > 0;
}

/** Admin force-remove a listing */
export async function adminRemoveListing(listingId: string): Promise<boolean> {
  const rows = await query(`
    UPDATE listings
    SET status = 'Removed'
    WHERE id = $1
    RETURNING id
  `, [listingId]);
  return rows.length > 0;
}

/** Update the embedding vector for a listing */
export async function updateListingEmbedding(
  listingId: string,
  embedding: number[]
): Promise<void> {
  await query(`
    UPDATE listings
    SET embedding = $1::vector
    WHERE id = $2
  `, [`[${embedding.join(",")}]`, listingId]);
}

/** Get searchable text for a listing (used when generating embeddings) */
export async function getListingSearchableText(listingId: string): Promise<string | null> {
  const row = await queryOne<{ searchable_text: string; title: string; description: string }>(
    `SELECT title, description FROM listings WHERE id = $1`,
    [listingId]
  );
  if (!row) return null;
  return `${row.title} ${row.description}`;
}

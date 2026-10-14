import { query, queryOne } from "@/lib/db";
import type { Listing, ListingImage, CreateListingInput, UpdateListingInput } from "@/types";

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

/**
 * Admin update a listing by its ID alone — no seller_id guard.
 *
 * Admins are permitted to change only the listing status (e.g. Available →
 * Removed, Reserved → Available).  They must not overwrite seller-owned
 * content fields (title, description, price, condition, location,
 * category_id) because those represent the seller's own listing data.
 *
 * Returns the updated listing, or null when the listing does not exist.
 */
export async function adminUpdateListing(
  listingId: string,
  data: { status: string }
): Promise<Listing | null> {
  const rows = await query<Listing>(`
    UPDATE listings
    SET status = $1
    WHERE id = $2
    RETURNING *
  `, [data.status, listingId]);
  return rows[0] ?? null;
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

// Valid status values — mirrors the CHECK constraint in 001_schema.sql and
// LISTING_STATUSES in lib/validation/schemas.ts.
const VALID_LISTING_STATUSES = ["Available", "Reserved", "Sold", "Removed"] as const;
type AdminListingStatus = typeof VALID_LISTING_STATUSES[number];

/**
 * Admin paginated listing query.
 *
 * Security:
 *   - `status` is validated against an explicit allowlist before it enters any
 *     query.  An unrecognised value is treated as "all" (no filter), so no
 *     user-controlled string is ever interpolated into SQL text.
 *   - `page` and `limit` are integers computed by the caller with Math.max /
 *     Math.min — they are safe numeric literals and remain as interpolation,
 *     consistent with every other paginated query in this module.
 *   - The `status` value, when present, is passed as a $1 parameter.
 */
export async function getAdminListings(params: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ listings: Listing[]; total: number }> {
  const { page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  // Validate status against the known-good allowlist.
  // An unrecognised value (including "all") means no filter.
  const validStatus: AdminListingStatus | null =
    VALID_LISTING_STATUSES.includes(params.status as AdminListingStatus)
      ? (params.status as AdminListingStatus)
      : null;

  // Build the parameterized WHERE clause.
  // Only the status value ever becomes a query parameter — identifiers
  // (column names, table names) never come from user input.
  const whereClause = validStatus ? "WHERE l.status = $1" : "";
  const queryParams: unknown[] = validStatus ? [validStatus] : [];

  // Pagination indices depend on whether $1 is already taken by status.
  const limitIdx  = validStatus ? 2 : 1;
  const offsetIdx = validStatus ? 3 : 2;

  const countRows = await query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM listings l
     INNER JOIN users      u ON l.seller_id   = u.id
     INNER JOIN categories c ON l.category_id = c.id
     ${whereClause}`,
    queryParams
  );
  const total = parseInt(countRows[0]?.total ?? "0");

  const listings = await query<Listing>(
    `SELECT l.id, l.seller_id, l.title, l.price, l.condition, l.location, l.status,
            l.created_at, u.name AS seller_name, c.name AS category_name,
            (SELECT image_url FROM listing_images li
             WHERE li.listing_id = l.id
             ORDER BY li.display_order ASC LIMIT 1) AS primary_image
     FROM listings l
     INNER JOIN users      u ON l.seller_id   = u.id
     INNER JOIN categories c ON l.category_id = c.id
     ${whereClause}
     ORDER BY l.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...queryParams, limit, offset]
  );

  return { listings, total };
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
